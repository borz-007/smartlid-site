/**
 * Промпты и схемы для Gemini. Живут только на сервере: клиент присылает данные (текст, фото, профиль),
 * но не промпт и не ключ.
 */

export const SEVERITIES = ['SAFE', 'WARNING', 'BANNED'];
export const CATEGORIES = ['halal', 'vegan', 'vegetarian', 'allergen', 'custom', 'other'];
export const ALLERGEN_IDS = [
  'gluten', 'milk', 'eggs', 'peanuts', 'nuts', 'soy', 'fish',
  'crustaceans', 'molluscs', 'celery', 'mustard', 'sesame', 'lupin', 'sulphites',
];

export function responseSchema() {
  return {
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
}

export const SYSTEM_PROMPT = `Ты — строгий аудитор состава пищевых продуктов из магазинов Бельгии, Франции, Нидерландов и Германии.
Тексты составов на нидерландском, французском, немецком или английском.
Правила:
1. Проверяй ТОЛЬКО ограничения из профиля пользователя. Не выдумывай ингредиенты, которых нет в тексте.
2. Если источник компонента не указан и он может быть животным/свиным — severity=WARNING, а не SAFE (кроме случаев, где действует правило 8).
3. "original" — точная цитата из этикетки на исходном языке; "translation_ru" — перевод на русский;
   "reason_ru" — короткое объяснение риска (например: "gelatine — в ЕС по умолчанию свиной желатин").
4. Для неаллергенных категорий поле allergen = "none".
5. verdict = максимальная severity среди issues (BANNED > WARNING > SAFE). Если проблем нет — SAFE и пустой issues.
6. summary_ru — 1–2 предложения итога на русском.
7. Отвечай СТРОГО JSON по схеме, без вводных слов и без markdown.
8. СТРОГОЕ ПРАВИЛО HALAL (действует только если в профиле включён HALAL). Для продуктов из Европы, Америки и других немусульманских стран
   (страну определяй по блоку «Контекст товара», адресу производителя и языку этикетки; если страна неизвестна — считай, что страна немусульманская):
   любые животные жиры, желатин, сычужный фермент, ланолин (шерсть), моно- и диглицериды жирных кислот (E471) и прочие дериваты
   животного происхождения по умолчанию СТРОГО классифицируются как HARAM (severity="BANNED", category="halal"), если на упаковке
   нет явного сертификата Halal или Vegan. Не смягчай такой вердикт до WARNING.
   Исключение: если на этикетке прямо указано растительное или микробное происхождение конкретного компонента
   (например «E471 (plantaardig)», «présure microbienne»), он не считается животным дериватом.
   Наличие сертификата Halal или Vegan определяй по блоку «Контекст товара» и по логотипам на фото, если фото есть.`;

const yesNo = (v) => (v === true ? 'да' : v === false ? 'нет' : 'неизвестно');

/** Описание профиля пользователя и контекста товара для промпта. */
export function describeProfile(profile, ctx = {}) {
  const lines = [];
  if (profile.halal) {
    lines.push(
      '- HALAL (строгий): запрещены свинина и её производные, сало, алкоголь (включая этанол-носитель ароматизаторов), ' +
        'кармин E120. Для животных жиров, желатина, сычужного фермента, ланолина, моно- и диглицеридов (E471) и других ' +
        'дериватов животного происхождения применяй СТРОГОЕ ПРАВИЛО №8 из системных инструкций. ' +
        'Мясо без халяль-сертификата — WARNING.',
    );
  }
  if (profile.vegan) {
    lines.push(
      '- VEGAN: запрещены мясо, птица, рыба, морепродукты, молоко, лактоза, сыворотка, казеин, яйца, мёд, кармин E120, ' +
        'шеллак E904, пчелиный воск E901, ланолин, желатин, костный фосфат E542.',
    );
  } else if (profile.vegetarian) {
    lines.push('- VEGETARIAN: запрещены убойные продукты (мясо, рыба, желатин, сычужный фермент животного происхождения); молоко и яйца разрешены.');
  }
  if (profile.allergens.length) {
    lines.push(`- АЛЛЕРГЕНЫ (category="allergen", поле allergen = id): ${profile.allergens.map((a) => `${a.id} (${a.label})`).join(', ')}.`);
  }
  lines.push(
    profile.considerTraces
      ? '- Следы аллергенов («may contain», «kan sporen bevatten», «peut contenir») — КРИТИЧЕСКИЙ риск: BANNED, is_trace=true.'
      : '- Следы аллергенов — WARNING, is_trace=true.',
  );
  if (profile.customStopWords.length) {
    lines.push(`- ПЕРСОНАЛЬНЫЕ СТОП-СЛОВА (category="custom", BANNED; учитывай переводы на NL/FR/DE/EN): ${profile.customStopWords.join(', ')}.`);
  }
  if (ctx.extraContext?.length) lines.push(`- Особо проверь: ${ctx.extraContext.join('; ')}.`);

  const certs = ctx.certifications ?? {};
  lines.push(
    '',
    'Контекст товара:',
    `- Штрихкод: ${ctx.barcode ?? 'неизвестен'}`,
    `- Страны продажи/производства (по базе): ${ctx.countries?.length ? ctx.countries.join(', ') : 'неизвестно'}`,
    `- Сертификат Halal на упаковке: ${yesNo(certs.halal)}`,
    `- Сертификат/знак Vegan на упаковке: ${yesNo(certs.vegan)}`,
  );
  return lines.join('\n');
}

function auditGenerationConfig() {
  return { temperature: 0, responseMimeType: 'application/json', responseSchema: responseSchema() };
}

export function buildAuditTextBody(text, profile, ctx = {}) {
  const prompt =
    `ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ:\n${describeProfile(profile, ctx)}\n\n` +
    `СОСТАВ ПРОДУКТА:\n"""${text.slice(0, 6000)}"""\n\n` +
    'В поле ingredients_text верни исходный текст состава без изменений.';
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: auditGenerationConfig(),
  };
}

export function buildAuditImageBody(imageBase64, mimeType, profile, ctx = {}) {
  const prompt =
    `ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ:\n${describeProfile(profile, ctx)}\n\n` +
    'На фото — этикетка продукта. Найди блок состава (Ingrediënten / Ingrédients / Zutaten / Ingredients) ' +
    'и предупреждения о следах. Дословно перепиши их в ingredients_text на языке оригинала (если языков несколько — ' +
    'выбери один полный вариант). Проверь также, есть ли на упаковке явный знак Halal или Vegan. Затем проведи аудит. ' +
    'Если текст состава не читается — ingredients_text="" , verdict="WARNING" и объясни в summary_ru.';
  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: prompt }] }],
    generationConfig: auditGenerationConfig(),
  };
}

const EXPIRY_PROMPT = `You are an OCR expert specializing in reading expiry dates from food packaging.
Find the expiry/best-before date on the image. Look for labels like:
- EXP, BB, BBE, Best Before, Use By
- A consommer de préférence avant, A consommer avant
- Ten minste houdbaar tot, THT, TGT
- Mindestens haltbar bis, MHD
- Срок годности до, Годен до

Return ONLY JSON (no markdown):
{"found": boolean, "date": "YYYY-MM-DD", "raw_text": "original text from label", "confidence": "high"|"medium"|"low"}

If the date shows only month/year (e.g. 03/2025), use the last day of that month.
If the date is ambiguous (DD/MM vs MM/DD), prefer DD/MM/YYYY (European format).
If no date is found, return {"found": false, "date": "", "raw_text": "", "confidence": "low"}.`;

export function buildExpiryBody(imageBase64, mimeType) {
  return {
    systemInstruction: { parts: [{ text: EXPIRY_PROMPT }] },
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: 'Find and read the expiry date on this food package. Return JSON only.' },
        ],
      },
    ],
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  };
}

/** Поиск товара в интернете: приоритет — официальный сайт производителя/бренда. */
export function buildSearchBody({ barcode, brand, name }) {
  const hints = [brand ? `бренд: ${brand}` : '', name ? `название: ${name}` : ''].filter(Boolean).join('; ');
  const prompt =
    `Найди в интернете продукт питания со штрихкодом EAN ${barcode}${hints ? ` (${hints})` : ''}. ` +
    'Приоритет — страница товара на ОФИЦИАЛЬНОМ сайте производителя или бренда; затем сайты магазинов Бельгии, Нидерландов, ' +
    'Франции, Германии (Albert Heijn, Delhaize, Colruyt, Jumbo, Carrefour, Lidl, Aldi, REWE и т.п.).\n' +
    'Нужно: название, бренд, производитель и ПОЛНЫЙ список ингредиентов дословно на языке страницы ' +
    '(включая «может содержать следы…»).\n' +
    'Правила: используй только данные со страниц, где совпадает именно этот штрихкод или точно этот товар. ' +
    'Не придумывай состав. Если состав не найден — found=false и ingredients_text="".\n' +
    'Ответ — только JSON без пояснений: ' +
    '{"found": boolean, "name": string, "brand": string, "manufacturer": string, "ingredients_text": string, ' +
    '"source_url": string, "official_site": boolean}. ' +
    'official_site=true только если source_url — сайт самого производителя или бренда, а не магазина.';
  return {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0 },
  };
}
