/**
 * Шаг 2. Локальный экспресс-фильтр (детерминированный, без сети).
 *
 * На входе — сырой текст состава + теги Open Food Facts, на выходе —
 * список проблем, следов и флаг «нужен ИИ» для неоднозначных формулировок.
 */
import { ALLERGEN_BY_ID, allergenFromOffTag } from '../constants/allergens';
import {
  maxSeverity,
  type AllergenId,
  type DietKey,
  type Issue,
  type IssueCategory,
  type RawIngredients,
  type Severity,
  type UserProfile,
} from '../types';
import {
  COMPLEX_MARKERS,
  CUSTOM_SYNONYMS,
  GLOBAL_IGNORE,
  RULES,
  TRACE_TRIGGERS,
  type Rule,
} from './dictionaries';
import {
  escapeRegExp,
  ingredientSegment,
  normalize,
  normalizePlain,
  originalSlice,
  wordBounds,
  type NormalizedText,
} from './textNormalize';

export interface LocalResult {
  verdict: Severity;
  issues: Issue[];
  traces: Issue[];
  needsAI: boolean;
  /** Почему нужен ИИ (для промпта и для заметок в UI). */
  aiReasons: string[];
  /** Пользовательские стоп-слова, которые не удалось проверить локально. */
  unresolvedCustomWords: string[];
  certifiedHalal: boolean;
}

type Range = [number, number];

const DIETS: DietKey[] = ['halal', 'vegan', 'vegetarian'];

function globalOf(re: RegExp): RegExp {
  return new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
}

function findAll(text: string, re: RegExp): Range[] {
  const out: Range[] = [];
  const g = globalOf(re);
  let m: RegExpExecArray | null;
  while ((m = g.exec(text)) !== null) {
    if (m[0].length === 0) {
      g.lastIndex++;
      continue;
    }
    out.push([m.index, m.index + m[0].length]);
  }
  return out;
}

const inside = (r: Range, ranges: Range[]) => ranges.some(([s, e]) => r[0] >= s && r[1] <= e);

/** Диапазоны клауз «может содержать следы …». */
export function findTraceRanges(text: string): Range[] {
  const ranges: Range[] = [];
  for (const [start] of findAll(text, TRACE_TRIGGERS)) {
    let end = start;
    while (end < text.length && !/[.;\n]/.test(text[end])) end++;
    ranges.push([start, end]);
  }
  return ranges;
}

function isDietActive(p: UserProfile, d: DietKey): boolean {
  if (d === 'vegetarian') return p.vegetarian || p.vegan; // веган строже вегетарианца
  return p[d];
}

export function hasActiveDiet(p: UserProfile): boolean {
  return DIETS.some((d) => isDietActive(p, d));
}

function traceSeverity(p: UserProfile): Severity {
  return p.considerTraces ? 'BANNED' : 'WARNING';
}

class IssueBag {
  private map = new Map<string, Issue>();

  add(issue: Issue) {
    const prev = this.map.get(issue.key);
    if (!prev) {
      this.map.set(issue.key, issue);
      return;
    }
    prev.severity = maxSeverity(prev.severity, issue.severity);
    for (const c of issue.categories) if (!prev.categories.includes(c)) prev.categories.push(c);
    if (issue.reasonRu && !prev.reasonRu.includes(issue.reasonRu)) prev.reasonRu += ' ' + issue.reasonRu;
  }

  has(pred: (i: Issue) => boolean) {
    return [...this.map.values()].some(pred);
  }

  list(): Issue[] {
    return [...this.map.values()];
  }
}

function evaluateRule(
  rule: Rule,
  n: NormalizedText,
  traceRanges: Range[],
  globalIgnore: Range[],
  profile: UserProfile,
  certifiedHalal: boolean,
  bag: IssueBag,
  aiReasons: Set<string>,
) {
  // Исключение распространяется на всё составное слово: «kokosnoot», «Erdnüsse»
  const ignore = [...globalIgnore, ...(rule.ignoreIn ?? []).flatMap((re) => findAll(n.text, re))].map(
    ([s, e]) => wordBounds(n.text, s, e),
  );
  const seen: Range[] = [];

  for (const pattern of rule.patterns) {
    for (const range of findAll(n.text, pattern)) {
      if (inside(range, ignore)) continue;
      // разные паттерны одного правила могут совпасть на одном месте
      if (seen.some(([s, e]) => range[0] < e && range[1] > s)) continue;
      seen.push(range);

      const isTrace = inside(range, traceRanges);
      const segment = ingredientSegment(n.text, range[0], range[1]);
      const override = rule.overrides?.find((o) => o.near.test(segment));

      let severity: Severity = 'SAFE';
      const categories: IssueCategory[] = [];

      // Диетические ограничения — только для основного состава, не для «следов»
      if (!isTrace && rule.diet) {
        for (const d of DIETS) {
          const base = rule.diet[d];
          if (!base || !isDietActive(profile, d)) continue;
          let sev: Severity = override?.diet?.[d] ?? base;
          if (d === 'halal' && certifiedHalal && rule.halalCertifiable) sev = 'SAFE';
          if (sev !== 'SAFE') {
            severity = maxSeverity(severity, sev);
            categories.push(d);
          }
        }
      }

      let allergen: AllergenId | undefined;
      if (rule.allergen && profile.allergens[rule.allergen] && !override?.allergenSafe) {
        allergen = rule.allergen;
        const sev = isTrace ? traceSeverity(profile) : (rule.allergenSeverity ?? 'BANNED');
        severity = maxSeverity(severity, sev);
        categories.push('allergen');
      }

      if (severity === 'SAFE') continue;

      if (rule.needsAI && severity === 'WARNING') aiReasons.add(rule.ru);

      const [ws, we] = wordBounds(n.text, range[0], range[1]);
      const original = originalSlice(n, ws, we);
      const reason = isTrace
        ? `Предупреждение о возможных следах: ${ALLERGEN_BY_ID[rule.allergen!].labelRu.toLowerCase()}.`
        : [rule.reasonRu, override?.noteRu].filter(Boolean).join(' ');

      bag.add({
        key: `${rule.id}${isTrace ? ':trace' : ''}`,
        original,
        translationRu: rule.ru,
        reasonRu: reason,
        severity,
        categories,
        allergen,
        isTrace,
        source: 'local',
      });
    }
  }
}

function evaluateCustomWords(
  n: NormalizedText,
  traceRanges: Range[],
  profile: UserProfile,
  bag: IssueBag,
): string[] {
  const unresolved: string[] = [];
  for (const word of profile.customStopWords) {
    const key = normalizePlain(word);
    if (!key) continue;
    const synonym = CUSTOM_SYNONYMS[key];
    const isLatin = /^[a-z0-9 '\-]+$/.test(key);
    if (!synonym && !isLatin) {
      // Например, «гуарана» — локального перевода нет, проверит ИИ
      unresolved.push(word);
      continue;
    }
    const re = synonym ?? new RegExp(`\\b${escapeRegExp(key)}`);
    const match = findAll(n.text, re)[0];
    if (!match) continue;
    const isTrace = inside(match, traceRanges);
    const [ws, we] = wordBounds(n.text, match[0], match[1]);
    bag.add({
      key: `custom:${key}`,
      original: originalSlice(n, ws, we),
      translationRu: word,
      reasonRu: 'Ваше персональное стоп-слово.',
      severity: isTrace ? 'WARNING' : 'BANNED',
      categories: ['custom'],
      isTrace,
      source: 'local',
    });
  }
  return unresolved;
}

function evaluateOffTags(raw: RawIngredients, profile: UserProfile, bag: IssueBag) {
  for (const tag of raw.allergenTags ?? []) {
    const id = allergenFromOffTag(tag);
    if (!id || !profile.allergens[id]) continue;
    if (bag.has((i) => i.allergen === id && !i.isTrace)) continue;
    bag.add({
      key: `off:${id}`,
      original: tag,
      translationRu: ALLERGEN_BY_ID[id].labelRu,
      reasonRu: 'Аллерген указан в базе Open Food Facts.',
      severity: 'BANNED',
      categories: ['allergen'],
      allergen: id,
      isTrace: false,
      source: 'openfoodfacts',
    });
  }
  for (const tag of raw.traceTags ?? []) {
    const id = allergenFromOffTag(tag);
    if (!id || !profile.allergens[id]) continue;
    if (bag.has((i) => i.allergen === id)) continue;
    bag.add({
      key: `off:${id}:trace`,
      original: tag,
      translationRu: ALLERGEN_BY_ID[id].labelRu,
      reasonRu: 'Open Food Facts: возможны следы.',
      severity: traceSeverity(profile),
      categories: ['allergen'],
      allergen: id,
      isTrace: true,
      source: 'openfoodfacts',
    });
  }
  const tags = raw.analysisTags ?? [];
  if (profile.vegan && tags.includes('en:non-vegan') && !bag.has((i) => i.categories.includes('vegan'))) {
    bag.add({
      key: 'off:non-vegan',
      original: 'en:non-vegan',
      translationRu: 'не веганский',
      reasonRu: 'Open Food Facts помечает продукт как не веганский.',
      severity: 'WARNING',
      categories: ['vegan'],
      isTrace: false,
      source: 'openfoodfacts',
    });
  }
  if (
    isDietActive(profile, 'vegetarian') &&
    tags.includes('en:non-vegetarian') &&
    !bag.has((i) => i.categories.includes('vegetarian'))
  ) {
    bag.add({
      key: 'off:non-vegetarian',
      original: 'en:non-vegetarian',
      translationRu: 'не вегетарианский',
      reasonRu: 'Open Food Facts помечает продукт как не вегетарианский.',
      severity: 'WARNING',
      categories: ['vegetarian'],
      isTrace: false,
      source: 'openfoodfacts',
    });
  }
}

export function computeVerdict(issues: Issue[], traces: Issue[]): Severity {
  return [...issues, ...traces].reduce<Severity>((acc, i) => maxSeverity(acc, i.severity), 'SAFE');
}

export function analyzeLocal(raw: RawIngredients, profile: UserProfile): LocalResult {
  const n = normalize(raw.text ?? '');
  const traceRanges = findTraceRanges(n.text);
  const globalIgnore = GLOBAL_IGNORE.flatMap((re) => findAll(n.text, re));
  const certifiedHalal =
    (raw.labelTags ?? []).includes('en:halal') || (/\bhalal\b/.test(n.text) && !/non[- ]halal/.test(n.text));

  const bag = new IssueBag();
  const aiReasons = new Set<string>();

  for (const rule of RULES) {
    evaluateRule(rule, n, traceRanges, globalIgnore, profile, certifiedHalal, bag, aiReasons);
  }

  const unresolvedCustomWords = evaluateCustomWords(n, traceRanges, profile, bag);
  evaluateOffTags(raw, profile, bag);

  // Сложные формулировки важны только для диетических профилей:
  // аллергены в ЕС обязаны указываться явно (Регламент 1169/2011).
  if (hasActiveDiet(profile)) {
    for (const marker of COMPLEX_MARKERS) {
      for (const range of findAll(n.text, marker.re)) {
        if (inside(range, traceRanges)) continue;
        if (marker.skipIfNear && marker.skipIfNear.test(ingredientSegment(n.text, range[0], range[1]))) continue;
        aiReasons.add(marker.ru);
        break;
      }
    }
  }
  if (unresolvedCustomWords.length) aiReasons.add('персональные стоп-слова без локального перевода');

  const all = bag.list();
  const issues = all.filter((i) => !i.isTrace);
  const traces = all.filter((i) => i.isTrace);

  return {
    verdict: computeVerdict(issues, traces),
    issues,
    traces,
    needsAI: aiReasons.size > 0,
    aiReasons: [...aiReasons],
    unresolvedCustomWords,
    certifiedHalal,
  };
}
