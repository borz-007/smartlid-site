import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AiError, generate, redact } from '../lib/server/geminiClient.mjs';
import { KEY, geminiOk, jsonRes } from './helpers.mjs';

const base = { apiKey: KEY, model: 'm1', body: {}, sleep: async () => {}, retryDelaysMs: [0, 0] };

test('ключ уходит только заголовком, не в адрес', async () => {
  let call;
  const fetchImpl = async (url, init) => ((call = { url, init }), jsonRes(200, geminiOk('ok')));
  await generate({ ...base, fetchImpl });
  assert.ok(call.url.startsWith('https://generativelanguage.googleapis.com/'));
  assert.ok(!call.url.includes(KEY) && !call.url.includes('key='));
  assert.equal(call.init.headers['x-goog-api-key'], KEY);
});

test('повторяет запрос при 503 и затем успешен', async () => {
  let n = 0;
  const fetchImpl = async () => (++n < 3 ? jsonRes(503, { error: { status: 'UNAVAILABLE', message: 'overloaded' } }) : jsonRes(200, geminiOk('ok')));
  const json = await generate({ ...base, fetchImpl });
  assert.equal(n, 3);
  assert.equal(json.candidates[0].content.parts[0].text, 'ok');
});

test('после исчерпания повторов пробует запасную модель', async () => {
  const models = [];
  const fetchImpl = async (url) => {
    models.push(/models\/([^:]+):/.exec(url)[1]);
    return models.at(-1) === 'm2' ? jsonRes(200, geminiOk('ok')) : jsonRes(503, {});
  };
  await generate({ ...base, fallbackModel: 'm2', fetchImpl });
  assert.deepEqual(models, ['m1', 'm1', 'm1', 'm2']);
});

test('404 основной модели переключает на запасную', async () => {
  const fetchImpl = async (url) => (url.includes('/m1:') ? jsonRes(404, { error: { status: 'NOT_FOUND' } }) : jsonRes(200, geminiOk('ok')));
  await generate({ ...base, fallbackModel: 'm2', fetchImpl });
});

test('таймаут основной модели переключает на запасную (без повторов на основной)', async () => {
  const models = [];
  const fetchImpl = async (url) => {
    models.push(/models\/([^:]+):/.exec(url)[1]);
    if (models.at(-1) === 'm2') return jsonRes(200, geminiOk('ok'));
    const e = new Error('x');
    e.name = 'AbortError';
    throw e;
  };
  const json = await generate({ ...base, fallbackModel: 'm2', fetchImpl });
  assert.deepEqual(models, ['m1', 'm2']);
  assert.equal(json.candidates[0].content.parts[0].text, 'ok');
});

test('таймаут без запасной модели остаётся ошибкой 504', async () => {
  const fetchImpl = async () => { const e = new Error('x'); e.name = 'AbortError'; throw e; };
  const err = await generate({ ...base, fetchImpl }).catch((e) => e);
  assert.equal(err.status, 504);
  assert.equal(err.code, 'upstream_timeout');
});

test('400/403 не повторяются; сырой текст Google и ключ не попадают в сообщение', async () => {
  let n = 0;
  const fetchImpl = async () => (n++, jsonRes(403, { error: { status: 'PERMISSION_DENIED', message: `API key ${KEY} not valid, project 123456789` } }));
  await assert.rejects(generate({ ...base, fetchImpl }), (e) => {
    assert.ok(e instanceof AiError);
    assert.equal(e.status, 502);
    assert.equal(e.code, 'upstream_rejected');
    assert.ok(!e.message.includes(KEY) && !e.message.includes('123456789'));
    assert.ok(!e.detail.includes(KEY), 'detail тоже без ключа');
    assert.match(e.detail, /HTTP 403 PERMISSION_DENIED/);
    return true;
  });
  assert.equal(n, 1);
});

test('429: различает дневной и минутный лимит, не показывает идентификаторы квот', async () => {
  const body = (quotaId, retryDelay) => ({
    error: { status: 'RESOURCE_EXHAUSTED', details: [{ violations: [{ quotaId }] }, ...(retryDelay ? [{ retryDelay }] : [])] },
  });
  const day = await generate({ ...base, fetchImpl: async () => jsonRes(429, body('GenerateRequestsPerDayPerProjectPerModel-FreeTier')) }).catch((e) => e);
  assert.equal(day.status, 429);
  assert.match(day.message, /Дневной лимит/);
  assert.ok(!/PerDay|FreeTier/.test(day.message));
  const min = await generate({ ...base, fetchImpl: async () => jsonRes(429, body('GenerateRequestsPerMinutePerProjectPerModel-FreeTier', '34.2s')) }).catch((e) => e);
  assert.match(min.message, /через 35 с/);
  assert.equal(min.retryAfterSec, 35);
});

test('без ключа — понятная ошибка конфигурации', async () => {
  await assert.rejects(generate({ ...base, apiKey: undefined, fetchImpl: async () => assert.fail('не должно вызываться') }), (e) => e.code === 'not_configured' && e.status === 503);
});

test('обрыв сети и таймаут превращаются в безопасные ошибки', async () => {
  const net = await generate({ ...base, retryDelaysMs: [], fetchImpl: async () => { throw new TypeError(`fetch failed ${KEY}`); } }).catch((e) => e);
  assert.equal(net.code, 'upstream_network');
  assert.ok(!net.message.includes(KEY) && !net.detail.includes(KEY));
  const abort = await generate({ ...base, retryDelaysMs: [], fetchImpl: async () => { const e = new Error('x'); e.name = 'AbortError'; throw e; } }).catch((e) => e);
  assert.equal(abort.code, 'upstream_timeout');
});

test('заблокированный запрос -> 422 без текста от Google', async () => {
  const e = await generate({ ...base, fetchImpl: async () => jsonRes(200, { promptFeedback: { blockReason: 'SAFETY' } }) }).catch((x) => x);
  assert.equal(e.status, 422);
  assert.match(e.message, /SAFETY/);
});

test('redact вырезает ключ и строки, похожие на ключ', () => {
  assert.equal(redact(`a ${KEY} b`, KEY), 'a [key] b');
  assert.equal(redact('x AIza0123456789012345678901234567 y'), 'x [key] y');
});
