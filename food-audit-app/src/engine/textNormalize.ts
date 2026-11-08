/**
 * Нормализация текста этикетки для детерминированного поиска.
 *
 * - нижний регистр, снятие диакритики (é → e, ü → u), ß → ss, œ → oe;
 * - «E 471», «E-471» сохраняются как есть, регулярки это учитывают;
 * - строится карта индексов, чтобы по совпадению в нормализованном
 *   тексте вырезать фрагмент ОРИГИНАЛЬНОГО текста (с акцентами и регистром).
 */
export interface NormalizedText {
  text: string;
  /** map[i] — индекс символа исходной строки, породившего text[i]. */
  map: number[];
  source: string;
}

const SPECIAL: Record<string, string> = {
  ß: 'ss',
  œ: 'oe',
  æ: 'ae',
  ø: 'o',
  '’': "'",
  '‘': "'",
  '‐': '-',
  '‑': '-',
  '–': '-',
  '—': '-',
  ' ': ' ',
};

function normChar(ch: string): string {
  const lower = ch.toLowerCase();
  if (SPECIAL[lower] !== undefined) return SPECIAL[lower];
  return lower.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function normalize(source: string): NormalizedText {
  let text = '';
  const map: number[] = [];
  for (let i = 0; i < source.length; i++) {
    const piece = normChar(source[i]);
    for (let k = 0; k < piece.length; k++) {
      text += piece[k];
      map.push(i);
    }
  }
  return { text, map, source };
}

/** Нормализация строки без карты (для словарей и пользовательских слов). */
export function normalizePlain(s: string): string {
  return normalize(s).text.trim();
}

/** Вернуть фрагмент исходного текста для диапазона [start, end) нормализованного. */
export function originalSlice(n: NormalizedText, start: number, end: number): string {
  if (start >= end || start >= n.map.length) return '';
  const from = n.map[start];
  const to = n.map[Math.min(end, n.map.length) - 1] + 1;
  return n.source.slice(from, to);
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Слово целиком вокруг диапазона (буквы a–z), для проверки исключений в составных словах. */
export function wordBounds(text: string, start: number, end: number): [number, number] {
  let s = start;
  let e = end;
  while (s > 0 && /[a-z]/.test(text[s - 1])) s--;
  while (e < text.length && /[a-z]/.test(text[e])) e++;
  return [s, e];
}

/**
 * Границы «ингредиента», в котором находится совпадение:
 * влево — до , ; . : или открывающей скобки; вправо — до , ; . на том же
 * уровне скобок (вложенное уточнение «(E471 van plantaardige oorsprong)» входит).
 */
export function ingredientSegment(text: string, start: number, end: number, maxSpan = 90): string {
  let left = start;
  while (left > 0 && start - left < maxSpan && !/[,;.:(\n]/.test(text[left - 1])) left--;
  let right = end;
  let depth = 0;
  while (right < text.length && right - end < maxSpan) {
    const c = text[right];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') {
      depth--;
      if (depth < 0) break;
    } else if (depth === 0 && /[,;.\n]/.test(c)) break;
    right++;
  }
  return text.slice(left, right);
}
