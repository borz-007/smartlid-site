/**
 * Оркестратор: Шаг 1 (получение текста) → Шаг 2 (локальный фильтр) → Шаг 3 (ИИ).
 *
 * Политика безопасности вердикта:
 *  - Локальный BANNED выдаётся мгновенно, ИИ не вызывается (экономия токенов).
 *  - В остальных случаях состав всегда дополнительно проверяет Gemini (если ключ задан).
 *  - Итог = максимум(локальный, ИИ): ИИ может только ужесточить вердикт.
 *  - Если состав требовал проверки ИИ, но ИИ недоступен — минимум WARNING.
 *  - Ответы ИИ фильтруются по профилю (ИИ не может добавить категорию,
 *    которую пользователь не включал).
 */
import { isAIConfigured } from '../constants/config';
import type {
  AdditiveAuditResult,
  EcoScoreData,
  EcoScoreGrade,
  IngredientsSource,
  CommunityStatus,
  Issue,
  IssueCategory,
  NutrientFactor,
  NutriScoreData,
  RawIngredients,
  ScanResult,
  Severity,
  UserProfile,
} from '../types';
import { maxSeverity } from '../types';
import { analyzeAdditives } from '../services/additives';
import { fetchCommunityStatus } from '../services/community';
import { auditImageWithAI, auditTextWithAI, findProductOnWeb, type AiAudit, type AiIssue, type AuditContext } from '../services/gemini';
import { computeNutriScore } from '../services/nutriScore';
import { analyzeNutrientFactors } from '../services/nutrientFactors';
import { HttpError, userMessage } from '../services/http';
import { fetchProductByBarcode, hasValidGtinChecksum, ProductNotFoundError } from '../services/openFoodFacts';
import { analyzeLocal, computeVerdict, hasActiveDiet, type LocalResult } from './localFilter';
import { normalizePlain } from './textNormalize';

function aiIssueAllowed(i: AiIssue, p: UserProfile): boolean {
  switch (i.category) {
    case 'halal':
      return p.halal;
    case 'vegan':
      return p.vegan;
    case 'vegetarian':
      return p.vegetarian || p.vegan;
    case 'allergen':
      return i.allergen !== undefined && i.allergen !== 'none' && p.allergens[i.allergen];
    case 'custom':
      return p.customStopWords.length > 0;
    default:
      return hasActiveDiet(p) || p.customStopWords.length > 0;
  }
}

function toIssue(i: AiIssue, p: UserProfile): Issue {
  let severity: Severity = i.severity;
  if (i.category === 'allergen' && i.is_trace) severity = p.considerTraces ? 'BANNED' : 'WARNING';
  if (i.category === 'other') severity = severity === 'BANNED' ? 'WARNING' : severity;
  return {
    key: `ai:${normalizePlain(i.original)}${i.is_trace ? ':trace' : ''}`,
    original: i.original,
    translationRu: i.translation_ru,
    reasonRu: i.reason_ru,
    severity,
    categories: [i.category as IssueCategory],
    allergen: i.allergen && i.allergen !== 'none' ? i.allergen : undefined,
    isTrace: i.is_trace,
    source: 'ai',
  };
}

/** Объединить локальные и ИИ-проблемы без дублей (локальная запись приоритетна). */
export function mergeIssues(local: Issue[], ai: Issue[]): Issue[] {
  const out = local.map((i) => ({ ...i, categories: [...i.categories] }));
  for (const a of ai) {
    const an = normalizePlain(a.original);
    const dup = out.find((l) => {
      if (l.isTrace !== a.isTrace) return false;
      const ln = normalizePlain(l.original);
      return (an.length > 2 && ln.includes(an)) || (ln.length > 2 && an.includes(ln)) || (!!a.allergen && a.allergen === l.allergen);
    });
    if (dup) {
      dup.severity = maxSeverity(dup.severity, a.severity);
      for (const c of a.categories) if (!dup.categories.includes(c)) dup.categories.push(c);
    } else {
      out.push(a);
    }
  }
  return out;
}

function buildEcoScore(raw: RawIngredients): EcoScoreData | undefined {
  const g = raw.ecoscoreGrade;
  if (!g || !/^[a-e]$/.test(g)) return undefined;
  return { grade: g as EcoScoreGrade, score: raw.ecoscoreScore };
}

function buildResult(
  raw: RawIngredients,
  local: LocalResult,
  ai: AiAudit | null,
  profile: UserProfile,
  notes: string[],
  ingredientsSource: IngredientsSource,
): ScanResult {
  const aiIssues = ai ? ai.issues.filter((i) => aiIssueAllowed(i, profile)).map((i) => toIssue(i, profile)) : [];
  const issues = mergeIssues(local.issues, aiIssues.filter((i) => !i.isTrace));
  const traces = mergeIssues(local.traces, aiIssues.filter((i) => i.isTrace));
  let verdict = computeVerdict(issues, traces);

  if (local.needsAI && !ai && verdict === 'SAFE') {
    verdict = 'WARNING';
    notes.push(`Не удалось проверить сложные компоненты: ${local.aiReasons.join(', ')}.`);
  }
  if (!raw.text.trim() && verdict === 'SAFE') {
    verdict = 'WARNING';
    notes.push('Текст состава отсутствует — проверка неполная. Сфотографируйте состав на упаковке.');
  }
  if (local.certifiedHalal && profile.halal) notes.push('На упаковке/в базе указана халяль-маркировка.');

  const nutriScore: NutriScoreData | undefined = computeNutriScore(raw.nutriments, raw.nutriscoreGrade, raw.nutriscoreScore);
  const ecoScore: EcoScoreData | undefined = buildEcoScore(raw);
  const additives: AdditiveAuditResult[] = raw.additivesTags?.length ? analyzeAdditives(raw.additivesTags) : [];
  const nutrientFactors: NutrientFactor[] = analyzeNutrientFactors(raw.nutriments);

  return {
    verdict,
    issues,
    traces,
    ingredientsText: raw.text,
    ingredientsSource,
    product: raw.product,
    aiSummaryRu: ai?.summary_ru || undefined,
    usedAI: Boolean(ai),
    notes,
    nutriScore,
    ecoScore,
    nutriments: raw.nutriments,
    additives,
    nutrientFactors,
    categoryTag: raw.categoriesTags?.[0],
  };
}

/** Страны, сертификаты и штрихкод — серверный промпт использует их для строгого правила халяль. */
function aiContext(raw: RawIngredients, extraContext: string[] = []): AuditContext {
  const labels = raw.labelTags;
  return {
    extraContext,
    barcode: raw.product?.barcode,
    countries: raw.countriesTags?.slice(0, 10),
    certifications: labels ? { halal: labels.includes('en:halal'), vegan: labels.includes('en:vegan') } : undefined,
  };
}

/**
 * Накладывает на результат подтверждённый модератором статус сообщества.
 * «Не халяль» только ужесточает вердикт; «халяль» вердикт не смягчает (только пометка).
 */
export function applyCommunity(result: ScanResult, community: CommunityStatus | null, profile: UserProfile): ScanResult {
  if (!community || community.status === 'none') return result;
  const out: ScanResult = { ...result, community, issues: [...result.issues], notes: [...result.notes] };
  if (profile.halal && (community.status === 'haram' || community.status === 'disputed')) {
    const banned = community.status === 'haram';
    out.issues.push({
      key: 'community:status',
      original: 'SAFA',
      translationRu: banned ? 'Сообщество: не халяль (подтверждено модератором)' : 'Сообщество: мнения о халяльности расходятся',
      reasonRu: banned
        ? 'Пользователи прислали фото-подтверждение, модератор его принял.'
        : 'Есть подтверждённые отчёты и «халяль», и «не халяль» — проверьте упаковку.',
      severity: banned ? 'BANNED' : 'WARNING',
      categories: ['halal'],
      isTrace: false,
      source: 'community',
    });
    out.verdict = maxSeverity(out.verdict, banned ? 'BANNED' : 'WARNING');
  }
  return out;
}

/** Обновляет статус сообщества у уже готового результата (например, из кэша). */
export async function withCommunity(result: ScanResult, profile: UserProfile): Promise<ScanResult> {
  const barcode = result.product?.barcode;
  if (!barcode) return result;
  const base: ScanResult = { ...result, community: undefined, issues: result.issues.filter((i) => i.source !== 'community') };
  return applyCommunity(base, await fetchCommunityStatus(barcode), profile);
}

async function tryAI<T>(fn: () => Promise<T>, notes: string[]): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    notes.push(`ИИ недоступен: ${userMessage(e, 'неизвестная ошибка')}`);
    return null;
  }
}

export type StageCallback = (text: string) => void;

/** Аудит готового текста (Open Food Facts, интернет или ручной ввод). */
export async function auditRawIngredients(
  raw: RawIngredients,
  profile: UserProfile,
  source: IngredientsSource = 'openfoodfacts',
  onStage?: StageCallback,
): Promise<ScanResult> {
  const local = analyzeLocal(raw, profile);
  const notes: string[] = [];

  if (local.verdict === 'BANNED') {
    notes.push('Мгновенный вердикт локального фильтра — ИИ не вызывался.');
    return buildResult(raw, { ...local, needsAI: false }, null, profile, notes, source);
  }
  if (!raw.text.trim()) return buildResult(raw, local, null, profile, notes, source);

  if (!profile.aiEnabled) {
    notes.push('ИИ-аудит отключён в настройках.');
    return buildResult(raw, local, null, profile, notes, source);
  }
  if (!isAIConfigured()) {
    notes.push('Ключ Gemini не настроен — использован только локальный фильтр.');
    return buildResult(raw, local, null, profile, notes, source);
  }

  onStage?.('Gemini проверяет состав…');
  const ai = await tryAI(() => auditTextWithAI(raw.text, profile, aiContext(raw, local.aiReasons)), notes);
  return buildResult(raw, local, ai, profile, notes, source);
}

/**
 * Путь А: штрихкод.
 * 1) Open Food Facts; 2) если товара нет или состав пуст — поиск в интернете через Gemini + Google Search;
 * 3) найденный состав проверяется локальным фильтром и Gemini.
 */
async function auditBarcodeCore(barcode: string, profile: UserProfile, onStage?: StageCallback): Promise<ScanResult> {
  onStage?.('Ищем товар в Open Food Facts…');
  let offRaw: RawIngredients | null = null;
  try {
    offRaw = await fetchProductByBarcode(barcode);
  } catch (e) {
    if (!(e instanceof ProductNotFoundError)) throw e;
  }
  if (offRaw && offRaw.text.trim()) return auditRawIngredients(offRaw, profile, 'openfoodfacts', onStage);

  // Неверная контрольная цифра = код считан с ошибкой: не тратим запрос Gemini на поиск несуществующего товара
  if (!hasValidGtinChecksum(barcode)) {
    if (offRaw) return auditRawIngredients(offRaw, profile, 'openfoodfacts', onStage);
    throw new ProductNotFoundError(barcode, 'Код, похоже, считан с ошибкой (не сходится контрольная цифра). Наведите камеру ещё раз.');
  }

  if (!isAIConfigured()) {
    if (offRaw) return auditRawIngredients(offRaw, profile, 'openfoodfacts', onStage);
    throw new ProductNotFoundError(barcode, 'Поиск в интернете недоступен: приложение не подключено к серверу SAFA.');
  }

  onStage?.('Ищем состав в интернете…');
  let web;
  try {
    web = await findProductOnWeb(barcode, { brand: offRaw?.product?.brand, name: offRaw?.product?.name });
  } catch (e) {
    if (offRaw) return auditRawIngredients(offRaw, profile, 'openfoodfacts', onStage);
    throw new ProductNotFoundError(barcode, `Поиск в интернете не удался: ${userMessage(e, 'ошибка')}`);
  }
  if (!web.found) {
    if (offRaw) return auditRawIngredients(offRaw, profile, 'openfoodfacts', onStage);
    throw new ProductNotFoundError(barcode, 'В интернете состав этого товара тоже не найден.');
  }

  const raw: RawIngredients = {
    ...(offRaw ?? {}),
    text: web.ingredientsText,
    product: {
      barcode,
      name: web.name ?? offRaw?.product?.name,
      brand: web.brand ?? offRaw?.product?.brand,
      manufacturer: web.manufacturer,
      imageUrl: offRaw?.product?.imageUrl,
      sources: web.sources,
    },
  };
  const fromManufacturer = web.via === 'manufacturer';
  const result = await auditRawIngredients(raw, profile, fromManufacturer ? 'manufacturer' : 'web', onStage);
  result.notes.unshift(
    fromManufacturer
      ? 'Состав взят со страницы производителя — обязательно сверьте его с упаковкой.'
      : 'Состав найден в интернете — обязательно сверьте его с упаковкой.',
  );
  return result;
}

/** Путь А с учётом подтверждённого модератором статуса сообщества (параллельный запрос, при сбое игнорируется). */
export async function auditBarcode(barcode: string, profile: UserProfile, onStage?: StageCallback): Promise<ScanResult> {
  const [result, community] = await Promise.all([auditBarcodeCore(barcode, profile, onStage), fetchCommunityStatus(barcode)]);
  return applyCommunity(result, community, profile);
}

/** Путь Б: фото этикетки. Распознавание выполняет мультимодальная модель. */
export async function auditPhoto(imageBase64: string, profile: UserProfile): Promise<ScanResult> {
  if (!isAIConfigured()) {
    throw new HttpError('Для режима «Фото состава» приложение должно быть подключено к серверу SAFA.');
  }
  const notes: string[] = [];
  const ai = await tryAI(() => auditImageWithAI(imageBase64, profile), notes);
  if (!ai) throw new HttpError(notes[0] ?? 'Не удалось распознать этикетку');

  const raw: RawIngredients = { text: ai.ingredients_text ?? '' };
  // Распознанный текст дополнительно проходит детерминированный фильтр
  const local = analyzeLocal(raw, profile);
  notes.push('Текст распознан ИИ по фото — сверьте его с упаковкой.');
  return buildResult(raw, local, ai, profile, notes, 'photo');
}
