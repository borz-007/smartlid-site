import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleAudit } from '../lib/server/auditHandler.mjs';
import { KEY, geminiOk, jsonRes } from './helpers.mjs';

const profile = { halal: true, allergens: [], customStopWords: [] };
const deps = (fetchImpl, extra = {}) => ({ apiKey: KEY, model: 'm', fetchImpl, sleep: async () => {}, retryDelaysMs: [], log: () => {}, ...extra });
const AUDIT = JSON.stringify({ ingredients_text: 'x', verdict: 'SAFE', issues: [], summary_ru: 'ок' });

test('audit-text возвращает текст модели и не содержит ключ', async () => {
  let sent;
  const r = await handleAudit({ action: 'audit-text', text: 'suiker, gelatine', profile }, deps(async (_u, init) => ((sent = JSON.parse(init.body)), jsonRes(200, geminiOk(AUDIT)))));
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { text: AUDIT });
  assert.ok(!JSON.stringify(r).includes(KEY));
  assert.match(sent.systemInstruction.parts[0].text, /СТРОГОЕ ПРАВИЛО HALAL/);
});

test('audit-image и expiry передают картинку в Gemini', async () => {
  const seen = [];
  const f = async (_u, init) => (seen.push(JSON.parse(init.body)), jsonRes(200, geminiOk('{}')));
  assert.equal((await handleAudit({ action: 'audit-image', image: 'QUJD', profile }, deps(f))).status, 200);
  assert.equal((await handleAudit({ action: 'expiry', image: 'QUJD' }, deps(f))).status, 200);
  assert.equal(seen[0].contents[0].parts[0].inlineData.data, 'QUJD');
  assert.equal(seen[1].contents[0].parts[0].inlineData.data, 'QUJD');
});

test('некорректный запрос -> 400 без обращения к Gemini', async () => {
  const r = await handleAudit({ action: 'audit-text', text: '' }, deps(async () => assert.fail('не должно вызываться')));
  assert.equal(r.status, 400);
  assert.equal(r.body.error.code, 'bad_request');
});

test('ключ не настроен -> 503 not_configured', async () => {
  const r = await handleAudit({ action: 'audit-text', text: 'a, b, c', profile }, deps(async () => assert.fail('нет'), { apiKey: undefined }));
  assert.equal(r.status, 503);
  assert.equal(r.body.error.code, 'not_configured');
});

test('ошибки Google: безопасное сообщение, подробности только в режиме debug', async () => {
  const f = async () => jsonRes(503, { error: { status: 'UNAVAILABLE', message: `The model is overloaded ${KEY}` } });
  const quiet = await handleAudit({ action: 'audit-text', text: 'a, b, c', profile }, deps(f));
  assert.equal(quiet.status, 503);
  assert.equal(quiet.body.error.code, 'upstream_unavailable');
  assert.ok(!JSON.stringify(quiet.body).includes('overloaded'));
  assert.ok(!('detail' in quiet.body.error));

  const debug = await handleAudit({ action: 'audit-text', text: 'a, b, c', profile }, deps(f, { debug: true }));
  assert.match(debug.body.error.detail, /HTTP 503 UNAVAILABLE.*overloaded/);
  assert.ok(!JSON.stringify(debug.body).includes(KEY));
});

test('429 отдаёт Retry-After и retryAfterSec', async () => {
  const f = async () => jsonRes(429, { error: { status: 'RESOURCE_EXHAUSTED', details: [{ violations: [{ quotaId: 'PerMinute' }] }, { retryDelay: '12s' }] } });
  const r = await handleAudit({ action: 'audit-text', text: 'a, b, c', profile }, deps(f));
  assert.equal(r.status, 429);
  assert.equal(r.body.error.retryAfterSec, 12);
  assert.equal(r.headers['Retry-After'], '12');
});

test('неожиданная ошибка -> 500 без подробностей', async () => {
  const r = await handleAudit({ action: 'find-product', barcode: '4335619128279' }, deps(async () => { throw new Error(`boom ${KEY}`); }));
  assert.ok([500, 502].includes(r.status));
  assert.ok(!JSON.stringify(r.body).includes(KEY));
});
