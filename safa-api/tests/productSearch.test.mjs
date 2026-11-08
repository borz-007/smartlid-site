import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findProduct } from '../lib/server/productSearch.mjs';
import { KEY, geminiOk, jsonRes } from './helpers.mjs';

const chunk = (uri, title = 'site') => ({ web: { uri, title } });
const reply = (data, chunks) => jsonRes(200, geminiOk(JSON.stringify(data), { groundingMetadata: { groundingChunks: chunks } }));
const gemini = (fetchImpl) => ({ apiKey: KEY, model: 'm', fetchImpl, sleep: async () => {}, retryDelaysMs: [] });
const PAGE = '<h3>Ingrediënten</h3><p>Yoghurt, water, suiker, perzikpuree, gelatine, aroma</p>';

test('состав берётся со страницы производителя и помечается как manufacturer', async () => {
  const fetchImpl = async () => reply({ found: true, name: 'Yogo Drink', brand: 'Milbona', ingredients_text: 'yoghurt, water, suiker, perzikpuree, gelatine, aroma', official_site: true }, [chunk('https://vertex.example/redirect/1', 'milbona.example')]);
  const r = await findProduct({ barcode: '4335619128279', brand: 'Milbona' }, {
    gemini: gemini(fetchImpl),
    fetchPageImpl: async () => ({ url: 'https://www.milbona.example/yogo', html: PAGE }),
  });
  assert.equal(r.found, true);
  assert.equal(r.via, 'manufacturer');
  assert.equal(r.ingredientsText, 'Yoghurt, water, suiker, perzikpuree, gelatine, aroma');
  assert.equal(r.sources[0].uri, 'https://www.milbona.example/yogo');
  assert.equal(r.brand, 'Milbona');
});

test('страница не разобралась — берём текст модели, источник «web»', async () => {
  const fetchImpl = async () => reply({ found: true, ingredients_text: 'water, sugar, gelatin, aroma', official_site: true }, [chunk('https://shop.example/p/1')]);
  const r = await findProduct({ barcode: '4335619128279' }, { gemini: gemini(fetchImpl), fetchPageImpl: async () => { throw new Error('blocked'); } });
  assert.equal(r.found, true);
  assert.equal(r.via, 'web');
  assert.equal(r.ingredientsText, 'water, sugar, gelatin, aroma');
});

test('без источников поиска состав считается непроверенным', async () => {
  const fetchImpl = async () => reply({ found: true, ingredients_text: 'water, sugar, gelatin, aroma' }, []);
  const r = await findProduct({ barcode: '4335619128279' }, { gemini: gemini(fetchImpl), fetchPageImpl: async () => assert.fail('нет страниц') });
  assert.equal(r.found, false);
});

test('ответ не JSON, но страница даёт состав', async () => {
  const fetchImpl = async () => jsonRes(200, geminiOk('Не нашёл.', { groundingMetadata: { groundingChunks: [chunk('https://a.example/p')] } }));
  const r = await findProduct({ barcode: '4335619128279' }, { gemini: gemini(fetchImpl), fetchPageImpl: async () => ({ url: 'https://a.example/p', html: PAGE }) });
  assert.equal(r.found, true);
  assert.equal(r.via, 'web');
});

test('в источники попадают только https-ссылки', async () => {
  const fetchImpl = async () => reply({ found: true, ingredients_text: 'water, sugar, gelatin, aroma' }, [chunk('http://insecure.example/p'), chunk('https://ok.example/p')]);
  const seen = [];
  const r = await findProduct({ barcode: '4335619128279' }, { gemini: gemini(fetchImpl), fetchPageImpl: async (u) => (seen.push(u), { url: u, html: '<p>x</p>' }) });
  assert.deepEqual(seen, ['https://ok.example/p']);
  assert.ok(r.sources.every((s) => s.uri.startsWith('https://')));
});
