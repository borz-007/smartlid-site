/**
 * Подготовка текста, распознанного на фото (Google ML Kit, на устройстве), для локального анализатора:
 *  1) cleanOcrText — склейка переносов строк и слов, нормализация E-номеров;
 *  2) extractIngredientsBlock — выделение блока состава (Ingrediënten / Ingrédients / Zutaten / Ingredients)
 *     и добавление предложений о следах/аллергенах, которые стоят вне блока.
 */

/** Латинские буквы (с диакритикой) — без \\p{L}, чтобы не зависеть от движка. */
const L = 'A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u00FF';
const LL = 'a-z\\u00DF-\\u00F6\\u00F8-\\u00FF';

/** Слова, после которых дефис в конце строки — не перенос слова («mono- en diglyceriden»). */
const HYPHEN_KEEP_BEFORE = new Set(['en', 'of', 'ou', 'et', 'und', 'oder', 'and', 'or', 'bzw', 'sowie']);

/** E 471, E-471, E.471, E471 → E471; E 160 a не склеиваем (буква-суффикс только слитно: E160a). */
const E_NUMBER = /\bE[\s.-]{0,2}(\d{3,4})([a-i])?\b/g;

/** Заголовок блока состава на нидерландском, французском, немецком и английском. OCR часто читает «I» как «l» или «1». */
const HEADER = /\b(?:[Il1]ngredi[eëé]nt(?:en)?|[Il1]ngr[eé]dients?|[Il1]ngredients?|zutaten|zusammensetzung|samenstelling|composition)\b\s*[:：]?/i;

/** Где блок состава заканчивается: таблица пищевой ценности, условия хранения, срок годности. */
const STOP =
  /(voedingswaarden?|gemiddelde\s+voedingswaarde|nutrition(?:al)?\s+(?:information|facts|declaration)|valeurs?\s+nutritionnelles?|n[äa]hrwert(?:e|angaben|tabelle)?|average\s+(?:nutrition|values)|per\s+100\s?(?:g|ml)\b|energie\b|bewaren|conserver|aufbewahren|store\s+(?:in|at)|houdbaar|[àa]\s+consommer|mindestens\s+haltbar|best\s+before)/i;

/** Предложения про следы и аллергены — их сохраняем, даже если они вне блока состава. */
const TRACE_SENTENCE =
  /(kan\s+sporen|sporen\s+van|bevat\b|allergie|peut\s+contenir|traces?\s+(?:de|d['’])|contient\b|kann\s+spuren|spuren\s+von|enth[äa]lt|may\s+contain|contains\b|allergen)/i;

/** Граница предложения; перед «Kan sporen…», «Kann Spuren…» и т.п. — тоже (таблица пищевой ценности часто идёт вплотную). */
const SENTENCE_SPLIT =
  /[.;!?]\s+|(?=\b(?:kan\s+sporen|peut\s+contenir|kann\s+spuren|may\s+contain|contains\s*:|allergie|allergens?\s*:|bevat\s*:|enth[äa]lt\s*:|contient\s*:))/i;

/** Склейка переносов, пробелов и E-номеров. Не меняет регистр букв. */
export function cleanOcrText(input: string): string {
  let s = String(input ?? '').normalize('NFC');
  s = s.replace(/[   ]/g, ' ').replace(/\r/g, '');
  // Знаки, которые OCR путает с запятой/дефисом
  s = s.replace(/[‚，]/g, ',').replace(/[‐‑‒–]/g, '-');
  // gela-\ntine → gelatine; «mono-\nen diglyceriden» оставляем с дефисом
  s = s.replace(new RegExp(`([${L}])-[ \\t]*\\n[ \\t]*([${LL}][${L}]*)`, 'g'), (_m, a: string, word: string) =>
    HYPHEN_KEEP_BEFORE.has(word.toLowerCase()) ? `${a}- ${word}` : `${a}${word}`,
  );
  s = s.replace(/\s*\n\s*/g, ' ');
  s = s.replace(E_NUMBER, (_m, num: string, letter?: string) => `E${num}${letter ?? ''}`);
  s = s.replace(/[|¦]/g, ' ').replace(/[ \t]{2,}/g, ' ').replace(/\s+([,;:.)])/g, '$1').replace(/\(\s+/g, '(');
  return s.trim();
}

export interface IngredientsExtract {
  /** Текст для анализатора. */
  text: string;
  /** Заголовок «Ingrediënten / Ingrédients / Zutaten / Ingredients» найден. */
  headerFound: boolean;
}

/** Предложения вне блока, где говорится о следах/аллергенах. */
function traceSentences(outside: string): string[] {
  return outside
    .split(SENTENCE_SPLIT)
    .map((x) => x.trim())
    .filter((x) => x.length > 4 && x.length < 300 && TRACE_SENTENCE.test(x));
}

/**
 * Берёт текст после заголовка состава до таблицы пищевой ценности / условий хранения.
 * Если заголовок не найден — возвращает весь очищенный текст (headerFound = false).
 */
export function extractIngredientsBlock(rawOcr: string): IngredientsExtract {
  const cleaned = cleanOcrText(rawOcr);
  const m = HEADER.exec(cleaned);
  if (!m) return { text: cleaned, headerFound: false };

  const afterHeader = cleaned.slice(m.index + m[0].length);
  const stop = STOP.exec(afterHeader);
  const block = (stop ? afterHeader.slice(0, stop.index) : afterHeader).trim();
  const outside = cleaned.slice(0, m.index) + ' ' + (stop ? afterHeader.slice(stop.index) : '');

  const extra = traceSentences(outside).filter((sentence) => !block.includes(sentence));
  const text = [block.replace(/[.,;:\s]+$/, ''), ...extra].filter(Boolean).join('. ').replace(/\.{2,}/g, '.').trim();
  return { text, headerFound: true };
}
