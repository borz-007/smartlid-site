import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UnsafeUrlError, assertPublicUrl, corroboration, extractIngredientBlock, fetchPage, isPrivateAddress } from '../lib/server/siteFetch.mjs';

const pub = async () => [{ address: '93.184.216.34' }];

test('приватные и служебные адреса распознаются', () => {
  for (const a of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', '::', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '::ffff:7f00:1', 'not-an-ip']) {
    assert.ok(isPrivateAddress(a), a);
  }
  for (const a of ['93.184.216.34', '8.8.8.8', '172.32.0.1', '2606:4700:4700::1111']) assert.ok(!isPrivateAddress(a), a);
});

test('небезопасные адреса отклоняются до запроса', async () => {
  const bad = ['http://example.com/', 'https://localhost/', 'https://a.local/', 'https://user:pw@example.com/', 'https://example.com:8443/', 'https://127.0.0.1/', 'https://[::1]/', 'ftp://example.com/', 'мусор'];
  for (const u of bad) await assert.rejects(assertPublicUrl(u, pub), UnsafeUrlError, u);
  await assert.rejects(assertPublicUrl('https://rebind.example/', async () => [{ address: '10.0.0.5' }]), UnsafeUrlError);
  await assert.rejects(assertPublicUrl('https://mixed.example/', async () => [{ address: '8.8.8.8' }, { address: '127.0.0.1' }]), UnsafeUrlError);
  assert.equal((await assertPublicUrl('https://www.milbona.example/p', pub)).hostname, 'www.milbona.example');
});

const html = (body, type = 'text/html; charset=utf-8') => new Response(body, { status: 200, headers: { 'content-type': type } });

test('редирект на внутренний адрес блокируется, обычный — проходит', async () => {
  const lookup = async (h) => [{ address: h === 'internal.example' ? '10.0.0.1' : '93.184.216.34' }];
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.includes('start.example')) return new Response(null, { status: 302, headers: { location: 'https://internal.example/secret' } });
    return html('<p>ok</p>');
  };
  await assert.rejects(fetchPage('https://start.example/x', { fetchImpl, lookup }), UnsafeUrlError);
  assert.deepEqual(calls, ['https://start.example/x']);

  const ok = await fetchPage('https://a.example/', {
    lookup,
    fetchImpl: async (u) => (u === 'https://a.example/' ? new Response(null, { status: 301, headers: { location: '/product/1' } }) : html('<p>hi</p>')),
  });
  assert.equal(ok.url, 'https://a.example/product/1');
});

test('не HTML, ошибка статуса и бесконечные редиректы отклоняются; размер ограничен', async () => {
  await assert.rejects(fetchPage('https://a.example/', { lookup: pub, fetchImpl: async () => html('{}', 'application/json') }), /not html/);
  await assert.rejects(fetchPage('https://a.example/', { lookup: pub, fetchImpl: async () => new Response('x', { status: 500 }) }), /HTTP 500/);
  await assert.rejects(fetchPage('https://a.example/', { lookup: pub, fetchImpl: async () => new Response(null, { status: 302, headers: { location: '/loop' } }) }), /too many redirects/);
  const big = await fetchPage('https://a.example/', { lookup: pub, maxBytes: 1000, fetchImpl: async () => html('a'.repeat(50_000)) });
  assert.ok(big.html.length <= 1000);
});

test('состав извлекается: заголовок + следующая строка, строка с меткой, JSON-LD', () => {
  const heading = '<h3>Ingrediënten</h3><p>Yoghurt (62%), water, suiker, perzikpuree (3%), gelatine, aroma</p><h3>Voedingswaarde</h3><p>Energie 312 kJ</p>';
  assert.equal(extractIngredientBlock(heading), 'Yoghurt (62%), water, suiker, perzikpuree (3%), gelatine, aroma');

  const inline = '<div>Zutaten: Magermilch, Zucker, Fruchtzubereitung (Pfirsich, Mango), Verdickungsmittel: E440.</div><div>Nährwerte pro 100 ml</div>';
  assert.match(extractIngredientBlock(inline), /^Magermilch, Zucker, Fruchtzubereitung \(Pfirsich, Mango\)/);

  const ld = '<script type="application/ld+json">{"@type":"Product","ingredients":"water, sucre, arôme naturel, E330"}</script>';
  assert.equal(extractIngredientBlock(ld), 'water, sucre, arôme naturel, E330');

  const recipe = '<script type="application/ld+json">[{"@type":"Recipe","recipeIngredient":["sugar","flour","egg"]}]</script>';
  assert.equal(extractIngredientBlock(recipe), 'sugar, flour, egg');
});

test('мусор вместо состава не принимается', () => {
  assert.equal(extractIngredientBlock('<p>Ingredients</p><p>Login</p>'), null);
  assert.equal(extractIngredientBlock('<p>Ingrediënten: zie verpakking</p>'), null);
  assert.equal(extractIngredientBlock('<script>var Ingredients = "a,b,c,d"</script><p>nothing</p>'), null);
});

test('corroboration оценивает долю слов состава на странице', () => {
  const page = '<p>Ingrediënten: yoghurt, water, suiker, gelatine</p>';
  assert.equal(corroboration('yoghurt, water, suiker, gelatine', page), 1);
  assert.ok(corroboration('chocolade, hazelnoot, palmolie, vanille', page) < 0.5);
  assert.equal(corroboration('', page), 0);
});
