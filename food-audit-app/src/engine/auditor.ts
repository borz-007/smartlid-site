/**
 * Оркестратор. Основные сценарии работают БЕЗ облачного ИИ:
 *  - штрихкод: Open Food Facts → локальный анализатор на устройстве;
 *  - фото состава: офлайн-распознавание (Google ML Kit) → очистка текста → локальный анализатор.
 * Gemini (наш сервер safa-api) вызывается только вручную кнопкой «Перепроверить через ИИ»
 * (recheckWithAI), и туда уходит только текст состава, не фото.
 *
 * Политика безопасности вердикта:
 *  - Итог = максимум(локальный, ИИ): ИИ может только ужесточить вердикт.
 *  - Если состав требовал уточнения, а ИИ не использовался — минимум WARNING.
 *  - Ответы ИИ фильтруются по профилю (ИИ не может добавить категорию,
 *    которую пользователь не включал).
 */
import { config, isAIConfigured } from '../constants/config';
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
import { auditTextWithAI, type AiAudit, type AiIssue, type AuditContext } from '../services/gemini';
import { recognizeText } from '../services/ocr';
import { computeNutriScore } from '../services/nutriScore';
import { analyzeNutrientFactors } from '../services/nutrientFactors';
import { HttpError } from '../services/http';
import { fetchProductByBarcode, hasValidGtinChecksum, ProductNotFoundError } from '../services/openFoodFacts';
import { analyzeLocal, computeVerdict, hasActiveDiet, type LocalResult } from './localFilter';
import { extractIngredientsBlock } from './ocrText';
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
    notes.push(`Сложные компоненты не проверены автоматически: ${local.aiReasons.join(', ')}. Сверьте с упаковкой.`);
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
    raw,
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

export type StageCallback = (text: string) => void;

/** Проверка статуса сообщества не должна задерживать результат дольше этого. */
export const COMMUNITY_GRACE_MS = 1200;

/**
 * Аудит готового текста состава ТОЛЬКО локальными правилами (без обращения к серверу и ИИ).
 * Источник: Open Food Facts или распознанное по фото.
 */
export async function auditRawIngredients(raw: RawIngredients, profile: UserProfile, source: IngredientsSource = 'openfoodfacts'): Promise<ScanResult> {
  const local = analyzeLocal(raw, profile);
  const notes: string[] = [];
  if (local.verdict === 'BANNED') {
    notes.push('Мгновенный вердикт локального фильтра.');
  } else if (raw.text.trim()) {
    notes.push(
      source === 'photo'
        ? 'Текст распознан на устройстве и проверен локальными правилами без ИИ.'
        : 'Состав взят из Open Food Facts и проверен локальными правилами без ИИ.',
    );
  }
  return buildResult(raw, local, null, profile, notes, source);
}

/**
 * Путь А: штрихкод. Только Open Food Facts + локальные правила.
 * Нет товара или в карточке пустой состав — ProductNotFoundError (экран предложит сфотографировать состав).
 */
async function auditBarcodeCore(barcode: string, profile: UserProfile, onStage?: StageCallback): Promise<ScanResult> {
  onStage?.('Ищем товар в Open Food Facts…');
  let offRaw: RawIngredients | null = null;
  try {
    offRaw = await fetchProductByBarcode(barcode);
  } catch (e) {
    if (!(e instanceof ProductNotFoundError)) throw e;
  }
  if (offRaw && offRaw.text.trim()) return auditRawIngredients(offRaw, profile, 'openfoodfacts');

  const detail = offRaw
    ? 'Товар есть в Open Food Facts, но в его карточке нет состава.'
    : hasValidGtinChecksum(barcode)
      ? undefined
      : 'Код, похоже, считан с ошибкой (не сходится контрольная цифра). Наведите камеру ещё раз.';
  throw new ProductNotFoundError(barcode, detail);
}

/**
 * Путь А с учётом подтверждённого модератором статуса сообщества. Запрос идёт параллельно основной проверке
 * и не задерживает результат дольше COMMUNITY_GRACE_MS (при медленном ответе или сбое статус просто не применяется).
 * Это запрос к нашему серверу за статусом, Gemini он не использует.
 */
export async function auditBarcode(barcode: string, profile: UserProfile, onStage?: StageCallback): Promise<ScanResult> {
  const communityPromise = fetchCommunityStatus(barcode);
  const result = await auditBarcodeCore(barcode, profile, onStage);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const community = await Promise.race([
    communityPromise,
    new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), COMMUNITY_GRACE_MS);
    }),
  ]);
  if (timer) clearTimeout(timer);
  return applyCommunity(result, community, profile);
}

/** Минимальная длина распознанного состава, при меньшей считаем, что текст не найден. */
export const MIN_OCR_TEXT_LENGTH = 8;

/**
 * Путь Б: фото этикетки. Текст распознаётся на устройстве (ML Kit), очищается и сразу
 * проверяется локальным анализатором. Фото никуда не отправляется.
 */
export async function auditPhoto(photoUri: string, profile: UserProfile): Promise<ScanResult> {
  const recognized = await recognizeText(photoUri);
  const { text, headerFound } = extractIngredientsBlock(recognized);
  if (text.replace(/\s/g, '').length < MIN_OCR_TEXT_LENGTH) {
    throw new HttpError('Текст на фото не распознан. Сфотографируйте блок состава ближе, при хорошем освещении, без бликов.');
  }
  const result = await auditRawIngredients({ text }, profile, 'photo');
  result.notes.push(
    headerFound
      ? 'Блок состава выделен по заголовку (Ingrediënten / Ingrédients / Zutaten / Ingredients) — сверьте текст с упаковкой.'
      : 'Заголовок «Ingredients» не найден — проверен весь распознанный текст. Сверьте с упаковкой.',
  );
  return result;
}

/**
 * Ручная кнопка «Перепроверить через ИИ». На сервер уходит только ТЕКСТ состава (не фото).
 * ИИ может только ужесточить вердикт. Ошибки сервера пробрасываются (HttpError с понятным текстом).
 */
export async function recheckWithAI(result: ScanResult, profile: UserProfile): Promise<ScanResult> {
  if (!isAIConfigured()) throw new HttpError('Приложение не подключено к серверу SAFA.');
  const raw: RawIngredients = result.raw ?? { text: result.ingredientsText, product: result.product };
  if (!raw.text.trim()) throw new HttpError('Нет текста состава для проверки.');

  const local = analyzeLocal(raw, profile);
  const ai = await auditTextWithAI(raw.text, profile, aiContext(raw, local.aiReasons), config.aiTimeoutMs);
  const notes = ['Состав дополнительно проверен ИИ по запросу (отправлен только текст состава).'];
  const rebuilt = buildResult(raw, local, ai, profile, notes, result.ingredientsSource);
  return applyCommunity(rebuilt, result.community ?? null, profile);
}
