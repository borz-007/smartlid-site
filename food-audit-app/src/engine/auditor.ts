/**
 * Оркестратор: Шаг 1 (получение текста) → Шаг 2 (локальный фильтр) → Шаг 3 (ИИ).
 *
 * Политика безопасности вердикта:
 *  - Локальный BANNED выдаётся мгновенно, ИИ не вызывается (экономия токенов).
 *  - Итог = максимум(локальный, ИИ): ИИ может только ужесточить вердикт.
 *  - Если состав требовал проверки ИИ, но ИИ недоступен — минимум WARNING.
 *  - Ответы ИИ фильтруются по профилю (ИИ не может добавить категорию,
 *    которую пользователь не включал).
 */
import { isAIConfigured } from '../constants/config';
import type { Issue, IssueCategory, RawIngredients, ScanResult, Severity, UserProfile } from '../types';
import { maxSeverity } from '../types';
import { auditImageWithAI, auditTextWithAI, type AiAudit, type AiIssue } from '../services/gemini';
import { fetchProductByBarcode } from '../services/openFoodFacts';
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

function buildResult(
  raw: RawIngredients,
  local: LocalResult,
  ai: AiAudit | null,
  profile: UserProfile,
  notes: string[],
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

  return {
    verdict,
    issues,
    traces,
    ingredientsText: raw.text,
    product: raw.product,
    aiSummaryRu: ai?.summary_ru || undefined,
    usedAI: Boolean(ai),
    notes,
  };
}

async function tryAI<T>(fn: () => Promise<T>, notes: string[]): Promise<T | null> {
  try {
    return await fn();
  } catch (e: any) {
    notes.push(`ИИ недоступен: ${e?.message ?? 'неизвестная ошибка'}`);
    return null;
  }
}

/** Аудит готового текста (штрихкод → OFF, или текст введён вручную). */
export async function auditRawIngredients(raw: RawIngredients, profile: UserProfile): Promise<ScanResult> {
  const local = analyzeLocal(raw, profile);
  const notes: string[] = [];

  if (local.verdict === 'BANNED') {
    notes.push('Мгновенный вердикт локального фильтра — ИИ не вызывался.');
    return buildResult(raw, { ...local, needsAI: false }, null, profile, notes);
  }

  if (!local.needsAI) return buildResult(raw, local, null, profile, notes);

  if (!profile.aiEnabled) {
    notes.push('ИИ-аудит отключён в настройках.');
    return buildResult(raw, local, null, profile, notes);
  }
  if (!isAIConfigured()) {
    notes.push('Ключ Gemini не настроен — использован только локальный фильтр.');
    return buildResult(raw, local, null, profile, notes);
  }

  const ai = await tryAI(() => auditTextWithAI(raw.text, profile, local.aiReasons), notes);
  return buildResult(raw, local, ai, profile, notes);
}

/** Путь А: штрихкод. */
export async function auditBarcode(barcode: string, profile: UserProfile): Promise<ScanResult> {
  const raw = await fetchProductByBarcode(barcode); // ProductNotFoundError пробрасывается в UI
  return auditRawIngredients(raw, profile);
}

/** Путь Б: фото этикетки. Распознавание выполняет мультимодальная модель. */
export async function auditPhoto(imageBase64: string, profile: UserProfile): Promise<ScanResult> {
  if (!isAIConfigured()) {
    throw new Error('Для режима «Фото состава» нужен ключ Gemini (EXPO_PUBLIC_GEMINI_API_KEY).');
  }
  const notes: string[] = [];
  const ai = await tryAI(() => auditImageWithAI(imageBase64, profile), notes);
  if (!ai) throw new Error(notes[0] ?? 'Не удалось распознать этикетку');

  const raw: RawIngredients = { text: ai.ingredients_text ?? '' };
  // Распознанный текст дополнительно проходит детерминированный фильтр
  const local = analyzeLocal(raw, profile);
  notes.push('Текст распознан ИИ по фото — сверьте его с упаковкой.');
  return buildResult(raw, local, ai, profile, notes);
}
