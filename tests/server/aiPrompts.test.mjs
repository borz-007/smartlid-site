import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ALLERGEN_IDS, SYSTEM_PROMPT, buildAuditImageBody, buildAuditTextBody, buildExpiryBody, buildSearchBody, describeProfile, responseSchema } from '../../lib/server/aiPrompts.mjs';

const profile = { halal: true, vegan: false, vegetarian: false, considerTraces: true, allergens: [{ id: 'milk', label: 'Молоко / лактоза' }], customStopWords: ['пиво'] };

test('системный промпт содержит строгое правило халяль для немусульманских стран', () => {
  for (const word of ['немусульманских', 'животные жиры', 'желатин', 'сычужный фермент', 'ланолин', 'моно- и диглицериды', 'E471', 'HARAM', 'BANNED', 'Halal', 'Vegan']) {
    assert.ok(SYSTEM_PROMPT.includes(word), `нет «${word}»`);
  }
  assert.match(SYSTEM_PROMPT, /Не смягчай/);
  assert.match(SYSTEM_PROMPT, /растительное или микробное/);
});

test('профиль и контекст товара попадают в запрос', () => {
  const text = describeProfile(profile, { barcode: '4335619128279', countries: ['en:germany'], certifications: { halal: false, vegan: undefined } });
  assert.match(text, /HALAL/);
  assert.match(text, /milk \(Молоко/);
  assert.match(text, /пиво/);
  assert.match(text, /Штрихкод: 4335619128279/);
  assert.match(text, /Страны.*en:germany/);
  assert.match(text, /Сертификат Halal на упаковке: нет/);
  assert.match(text, /Vegan на упаковке: неизвестно/);
});

test('схема ответа и тела запросов', () => {
  assert.deepEqual(responseSchema().properties.issues.items.properties.allergen.enum.slice(-1), ['none']);
  assert.equal(ALLERGEN_IDS.length, 14);
  const t = buildAuditTextBody('suiker, gelatine', profile, {});
  assert.equal(t.systemInstruction.parts[0].text, SYSTEM_PROMPT);
  assert.equal(t.generationConfig.responseMimeType, 'application/json');
  const i = buildAuditImageBody('QUJD', 'image/jpeg', profile, {});
  assert.equal(i.contents[0].parts[0].inlineData.data, 'QUJD');
  assert.equal(buildExpiryBody('QUJD', 'image/jpeg').contents[0].parts[0].inlineData.mimeType, 'image/jpeg');
});

test('поисковый запрос включает штрихкод, бренд и приоритет сайта производителя', () => {
  const b = buildSearchBody({ barcode: '4335619128279', brand: 'Milbona', name: 'Yogo Drink' });
  const text = b.contents[0].parts[0].text;
  assert.match(text, /4335619128279/);
  assert.match(text, /Milbona/);
  assert.match(text, /ОФИЦИАЛЬНОМ сайте производителя/);
  assert.deepEqual(b.tools, [{ google_search: {} }]);
});
