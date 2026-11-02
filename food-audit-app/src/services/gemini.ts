/**
 * Шаг 3. ИИ-аудитор на базе Google Gemini (REST generateContent).
 *
 * Модель отвечает СТРОГО JSON по схеме (responseMimeType + responseSchema).
 * Ответ модели затем проходит валидацию и фильтрацию по профилю в auditor.ts —
 * ИИ не может «снять» запрет, найденный локальным фильтром.
 */
import { ALLERGENS } from '../constants/allergens';
import { config } from '../constants/config';
import type { AllergenId, Severity, UserProfile } from '../types';
import { fetchWithTimeout, geminiHttpError, HttpError } from './http';

export interface AiIssue {
  original: string;
  translation_ru: string;
  reason_ru: string;
  severity: Severity;
  category: 'halal' | 'vegan' | 'vegetarian' | 'allergen' | 'custom' | 'other';
  allergen?: AllergenId | 'none';
  is_trace: boolean;
}

export interface AiAudit {
  ingredients_text: string;
  verdict: Severity;
  issues: AiIssue[];
  summary_ru: string;
}

const SEVERITIES = ['SAFE', 'WARNING', 'BANNED'];
const CATEGORIES = ['halal', 'vegan', 'vegetarian', 'allergen', 'custom', 'other'];
const ALLERGEN_IDS = ALLERGENS.map((a) => a.id);

/** Схема ответа в формате OpenAPI-подмножества, которое понимает Gemini. */
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    ingredients_text: { type: 'STRING', description: 'Полный текст состава на языке оригинала' },
    verdict: { type: 'STRING', enum: SEVERITIES },
    issues: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          original: { type: 'STRING' },
          translation_ru: { type: 'STRING' },
          reason_ru: { type: 'STRING' },
          severity: { type: 'STRING', enum: SEVERITIES },
          category: { type: 'STRING', enum: CATEGORIES },
          allergen: { type: 'STRING', enum: [...ALLERGEN_IDS, 'none'] },
          is_trace: { type: 'BOOLEAN' },
        },
        required: ['original', 'translation_ru', 'reason_ru', 'severity', 'category', 'is_trace'],
      },
    },
    summary_ru: { type: 'STRING' },
  },
  required: ['ingredients_text', 'verdict', 'issues', 'summary_ru'],
};

function describeProfile(p: UserProfile, extraContext: string[]): string {
  const lines: string[] = [];
  if (p.halal)
    lines.push(
      '- HALAL (строгий): запрещены свинина и её производные, сало, алкоголь (включая этанол-носитель ароматизаторов), ' +
        'кармин E120, желатин без подтверждённого халяль/рыбного источника. Сомнительно (WARNING): E471/E472/E422 и др. ' +
        'без указания растительного источника, сычужный фермент без отметки «микробный/растительный», мясо без халяль-сертификата.',
    );
  if (p.vegan)
    lines.push(
      '- VEGAN: запрещены мясо, птица, рыба, морепродукты, молоко, лактоза, сыворотка, казеин, яйца, мёд, кармин E120, ' +
        'шеллак E904, пчелиный воск E901, ланолин, желатин, костный фосфат E542.',
    );
  else if (p.vegetarian)
    lines.push('- VEGETARIAN: запрещены убойные продукты (мясо, рыба, желатин, сычужный фермент животного происхождения); молоко и яйца разрешены.');

  const allergens = ALLERGENS.filter((a) => p.allergens[a.id]);
  if (allergens.length)
    lines.push(`- АЛЛЕРГЕНЫ (category="allergen", поле allergen = id): ${allergens.map((a) => `${a.id} (${a.labelRu})`).join(', ')}.`);
  lines.push(
    p.considerTraces
      ? '- Следы аллергенов («may contain», «kan sporen bevatten», «peut contenir») — КРИТИЧЕСКИЙ риск: BANNED, is_trace=true.'
      : '- Следы аллергенов — WARNING, is_trace=true.',
  );
  if (p.customStopWords.length)
    lines.push(
      `- ПЕРСОНАЛЬНЫЕ СТОП-СЛОВА (category="custom", BANNED; учитывай переводы на NL/FR/DE/EN): ${p.customStopWords.join(', ')}.`,
    );
  if (extraContext.length) lines.push(`- Особо проверь: ${extraContext.join('; ')}.`);
  return lines.join('\n');
}

const SYSTEM_PROMPT = `Ты — строгий аудитор состава пищевых продуктов из магазинов Бельгии, Франции, Нидерландов и Германии.
Тексты составов на нидерландском, французском, немецком или английском.
Правила:
1. Проверяй ТОЛЬКО ограничения из профиля пользователя. Не выдумывай ингредиенты, которых нет в тексте.
2. Если источник компонента не указан и он может быть животным/свиным — severity=WARNING, а не SAFE.
3. "original" — точная цитата из этикетки на исходном языке; "translation_ru" — перевод на русский;
   "reason_ru" — короткое объяснение риска (например: "gelatine — в ЕС по умолчанию свиной желатин").
4. Для неаллергенных категорий поле allergen = "none".
5. verdict = максимальная severity среди issues (BANNED > WARNING > SAFE). Если проблем нет — SAFE и пустой issues.
6. summary_ru — 1–2 предложения итога на русском.
7. Отвечай СТРОГО JSON по схеме, без вводных слов и без markdown.`;

function buildRequestBody(parts: object[]) {
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  };
}

/** Низкоуровневый вызов generateContent (напрямую или через прокси). */
export async function postGenerate(body: object): Promise<any> {
  let res: Response;
  if (config.aiProxyUrl) {
    res = await fetchWithTimeout(
      config.aiProxyUrl,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: config.geminiModel, body }) },
      config.requestTimeoutMs,
    );
  } else {
    if (!config.geminiApiKey) throw new HttpError('Ключ Gemini не задан (EXPO_PUBLIC_GEMINI_API_KEY)');
    // Ключ передаётся заголовком, а не в URL: так он не попадает в строки адресов, логи и тексты ошибок.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:generateContent`;
    res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.geminiApiKey },
        body: JSON.stringify(body),
      },
      config.requestTimeoutMs,
    );
  }

  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) throw geminiHttpError(res.status);
  if (json?.promptFeedback?.blockReason) {
    throw new HttpError(`Gemini заблокировал запрос: ${json.promptFeedback.blockReason}`);
  }
  return json;
}

function candidateText(json: any): string {
  return (json?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
}

async function callGemini(body: object): Promise<AiAudit> {
  return parseAiAudit(candidateText(await postGenerate(body)));
}

/** Достать первый JSON-объект из текста (модель с поиском может добавить пояснения). */
export function extractJsonObject(raw: string): string {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  return start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
}

/** Разбор и валидация ответа модели. Экспортируется для тестов. */
export function parseAiAudit(raw: string): AiAudit {
  let data: any;
  try {
    data = JSON.parse(extractJsonObject(raw));
  } catch {
    throw new HttpError('ИИ вернул ответ не в формате JSON');
  }
  const sev = (v: unknown): Severity => (SEVERITIES.includes(v as string) ? (v as Severity) : 'WARNING');
  const issues: AiIssue[] = Array.isArray(data?.issues)
    ? data.issues
        .filter((i: any) => i && typeof i.original === 'string' && i.original.trim())
        .map((i: any) => ({
          original: String(i.original).trim(),
          translation_ru: String(i.translation_ru ?? ''),
          reason_ru: String(i.reason_ru ?? ''),
          severity: sev(i.severity),
          category: CATEGORIES.includes(i.category) ? i.category : 'other',
          allergen: ALLERGEN_IDS.includes(i.allergen) ? i.allergen : 'none',
          is_trace: Boolean(i.is_trace),
        }))
    : [];
  return {
    ingredients_text: typeof data?.ingredients_text === 'string' ? data.ingredients_text : '',
    verdict: sev(data?.verdict),
    issues,
    summary_ru: typeof data?.summary_ru === 'string' ? data.summary_ru : '',
  };
}

/** Аудит уже известного текста состава (путь А или после локального фильтра). */
export function auditTextWithAI(text: string, profile: UserProfile, extraContext: string[] = []): Promise<AiAudit> {
  const prompt =
    `ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ:\n${describeProfile(profile, extraContext)}\n\n` +
    `СОСТАВ ПРОДУКТА:\n"""${text.slice(0, 6000)}"""\n\n` +
    'В поле ingredients_text верни исходный текст состава без изменений.';
  return callGemini(buildRequestBody([{ text: prompt }]));
}

/** Путь Б: фото этикетки → распознавание + аудит одним мультимодальным запросом. */
export function auditImageWithAI(imageBase64: string, profile: UserProfile, mimeType = 'image/jpeg'): Promise<AiAudit> {
  const prompt =
    `ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ:\n${describeProfile(profile, [])}\n\n` +
    'На фото — этикетка продукта. Найди блок состава (Ingrediënten / Ingrédients / Zutaten / Ingredients) ' +
    'и предупреждения о следах. Дословно перепиши их в ingredients_text на языке оригинала (если языков несколько — ' +
    'выбери один полный вариант). Затем проведи аудит. Если текст состава не читается — ingredients_text="" , ' +
    'verdict="WARNING" и объясни в summary_ru.';
  return callGemini(buildRequestBody([{ inlineData: { mimeType, data: imageBase64 } }, { text: prompt }]));
}

// ───────────────────────── Поиск товара в интернете ─────────────────────────

export interface WebProduct {
  found: boolean;
  name?: string;
  brand?: string;
  manufacturer?: string;
  ingredientsText: string;
  /** Страницы, на которые опирался ответ (из groundingMetadata). */
  sources: { title: string; uri: string }[];
}

const WEB_SEARCH_PROMPT = (barcode: string) =>
  `Найди в интернете продукт питания со штрихкодом EAN ${barcode} (магазины Бельгии, Нидерландов, Франции, Германии: ` +
  'Albert Heijn, Delhaize, Colruyt, Jumbo, Carrefour, Lidl, Aldi, REWE, сайт производителя и т.п.).\n' +
  'Нужно: название, бренд, производитель и ПОЛНЫЙ список ингредиентов дословно на языке страницы ' +
  '(включая «может содержать следы…»).\n' +
  'Правила: используй только данные со страниц, где совпадает именно этот штрихкод или точно этот товар. ' +
  'Не придумывай состав. Если состав не найден — found=false и ingredients_text="".\n' +
  'Ответ — только JSON без пояснений: ' +
  '{"found": boolean, "name": string, "brand": string, "manufacturer": string, "ingredients_text": string}';

/**
 * Путь А, запасной вариант: товара нет в Open Food Facts → Gemini ищет его через
 * встроенный инструмент Google Search. Ответ без ссылок-источников не принимается.
 */
export async function findProductOnWeb(barcode: string): Promise<WebProduct> {
  const json = await postGenerate({
    contents: [{ role: 'user', parts: [{ text: WEB_SEARCH_PROMPT(barcode) }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0 },
  });

  const sources: { title: string; uri: string }[] = (json?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [])
    .map((c: any) => ({ title: String(c?.web?.title ?? ''), uri: String(c?.web?.uri ?? '') }))
    .filter((s: { uri: string }) => s.uri);

  let data: any = {};
  try {
    data = JSON.parse(extractJsonObject(candidateText(json)));
  } catch {
    return { found: false, ingredientsText: '', sources };
  }
  const ingredientsText = typeof data?.ingredients_text === 'string' ? data.ingredients_text.trim() : '';
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  return {
    // Без реального поиска (источников) состав считаем непроверенным → не найден
    found: Boolean(data?.found) && ingredientsText.length > 10 && sources.length > 0,
    name: str(data?.name),
    brand: str(data?.brand),
    manufacturer: str(data?.manufacturer),
    ingredientsText,
    sources,
  };
}
