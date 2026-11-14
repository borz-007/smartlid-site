process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.test.example';

import { auditBarcode, BARCODE_AI_TIMEOUT_MS, COMMUNITY_GRACE_MS } from '../src/engine/auditor';
import { splitIngredients } from '../src/engine/ingredients';
import { extractJsonObject, resetWebSearchCooldown } from '../src/services/gemini';
import { ProductNotFoundError } from '../src/services/openFoodFacts';
import { createDefaultProfile } from '../src/storage/profileStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({}));

const json = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);

const SOURCE = [{ title: 'ah.nl', uri: 'https://www.ah.nl/producten/x' }];
const AUDIT_OK = JSON.stringify({ ingredients_text: '', verdict: 'SAFE', issues: [], summary_ru: 'ок' });
const NO_COMMUNITY = { barcode: 'x', status: 'none', haram: 0, halal: 0 };

describe('splitIngredients', () => {
  it('делит по запятым вне скобок и не ломает десятичные дроби', () => {
    expect(splitIngredients('Ingrediënten: suiker, chocolade (cacao, melk) 3,5%, E330, E471.')).toEqual([
      'suiker',
      'chocolade (cacao, melk) 3,5%',
      'E330',
      'E471',
    ]);
  });
});

describe('extractJsonObject', () => {
  it('вырезает JSON из текста с пояснениями', () => {
    expect(JSON.parse(extractJsonObject('Вот результат:\n```json\n{"found":true}\n```'))).toEqual({ found: true });
  });
});

describe('auditBarcode: Open Food Facts → наш сервер (поиск в интернете) → ИИ', () => {
  const profile = { ...createDefaultProfile(), halal: true };
  let fetchMock: jest.Mock;
  let calls: { url: string; body?: any }[];

  interface Net {
    off?: () => Promise<Response>;
    find?: (b: any) => unknown;
    audit?: (b: any) => unknown;
    community?: () => Promise<Response>;
  }

  function mockNetwork(n: Net) {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, body });
      if (url.startsWith('https://world.openfoodfacts.org')) return (n.off ?? (() => json({ status: 0 }, 404)))();
      if (url.includes('/api/community-status')) return (n.community ?? (() => json(NO_COMMUNITY)))();
      if (url === 'https://api.test.example/api/ingredient-audit') {
        if (body.action === 'find-product' && n.find) return json(n.find(body));
        if (body.action === 'audit-text' && n.audit) return json(n.audit(body));
      }
      throw new Error(`unexpected request ${url} ${body?.action ?? ''}`);
    });
  }
  const actions = () => calls.map((c) => c.body?.action).filter(Boolean);

  beforeEach(() => {
    resetWebSearchCooldown();
    calls = [];
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  it('если товара нет в OFF — сервер ищет состав, локальный фильтр блокирует сразу, без вызова ИИ', async () => {
    mockNetwork({
      find: () => ({
        found: true, name: 'Snoep', brand: 'X', manufacturer: 'X BV', via: 'manufacturer', sources: SOURCE,
        ingredientsText: 'suiker, glucosestroop, gelatine, kleurstof: E120',
      }),
    });
    const stages: string[] = [];
    const r = await auditBarcode('8718951834101', profile, (s) => stages.push(s));

    expect(r.ingredientsSource).toBe('manufacturer');
    expect(r.verdict).toBe('BANNED');
    expect(r.product?.manufacturer).toBe('X BV');
    expect(r.product?.sources?.[0].uri).toContain('ah.nl');
    expect(stages).toContain('Ищем состав в интернете…');
    expect(actions()).toEqual(['find-product']);
    expect(calls.find((c) => c.body?.action === 'find-product')?.body.barcode).toBe('8718951834101');
  });

  it('безопасный состав из интернета дополнительно проверяет ИИ через сервер', async () => {
    mockNetwork({
      find: () => ({ found: true, via: 'web', sources: SOURCE, ingredientsText: 'water, suiker, citroenzuur' }),
      audit: () => ({ text: AUDIT_OK }),
    });
    const r = await auditBarcode('8718951834101', profile);
    expect(actions()).toEqual(['find-product', 'audit-text']);
    expect(r.ingredientsSource).toBe('web');
    expect(r.usedAI).toBe(true);
    expect(r.verdict).toBe('SAFE');
  });

  it('бренд и название из OFF передаются в резервный поиск', async () => {
    mockNetwork({
      off: () => json({ status: 1, product: { product_name: 'Yogo Drink', brands: 'Milbona', ingredients_text: '' } }),
      find: () => ({ found: false, ingredientsText: '', sources: [] }),
    });
    await expect(auditBarcode('4335619128279', profile)).resolves.toBeDefined();
    const find = calls.find((c) => c.body?.action === 'find-product')!.body;
    expect(find).toMatchObject({ barcode: '4335619128279', brand: 'Milbona', name: 'Yogo Drink' });
  });

  it('ответ без источников не принимается (защита от выдуманного состава)', async () => {
    mockNetwork({ find: () => ({ found: true, via: 'web', ingredientsText: 'water, suiker, zout', sources: [] }) });
    await expect(auditBarcode('8718951834101', profile)).rejects.toBeInstanceOf(ProductNotFoundError);
  });

  it('сервер недоступен — понятное сообщение без технических деталей', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.startsWith('https://world.openfoodfacts.org')) return json({ status: 0 }, 404);
      throw new TypeError('Network request failed: https://api.test.example/api/ingredient-audit');
    });
    const err = await auditBarcode('8718951834101', profile).catch((e) => e);
    expect(err).toBeInstanceOf(ProductNotFoundError);
    expect(err.detail).toContain('Сервер SAFA недоступен');
    expect(err.detail).not.toContain('Network request failed');
  });

  it('код с неверной контрольной цифрой не отправляется на поиск', async () => {
    mockNetwork({});
    const err = await auditBarcode('1234567890123', profile).catch((e) => e);
    expect(err).toBeInstanceOf(ProductNotFoundError);
    expect(err.detail).toContain('контрольная цифра');
    expect(actions()).toEqual([]);
  });

  it('если состав есть в Open Food Facts — Gemini не вызывается, проверка только локальная', async () => {
    mockNetwork({
      off: () => json({ status: 1, product: { product_name: 'Water', ingredients_text: 'water, citroenzuur' } }),
      audit: () => { throw new Error('Gemini не должен вызываться'); },
      find: () => { throw new Error('поиск не должен вызываться'); },
    });
    const r = await auditBarcode('8718951834101', profile);
    expect(actions()).toEqual([]);
    expect(r.usedAI).toBe(false);
    expect(r.ingredientsSource).toBe('openfoodfacts');
    expect(r.verdict).toBe('SAFE');
  });

  it('серверу уходят страна и сертификаты из OFF для строгого правила халяль', async () => {
    mockNetwork({
      off: () => json({ status: 1, product: { product_name: 'Snoep', ingredients_text: '', labels_tags: ['en:halal'], countries_tags: ['en:belgium'] } }),
      find: () => ({ found: true, via: 'web', sources: SOURCE, ingredientsText: 'water, suiker, aroma' }),
      audit: () => ({ text: AUDIT_OK }),
    });
    await auditBarcode('8718951834101', profile);
    const audit = calls.find((c) => c.body?.action === 'audit-text')!.body;
    expect(audit.context.countries).toEqual(['en:belgium']);
    expect(audit.context.certifications).toEqual({ halal: true, vegan: false });
    expect(audit.context.barcode).toBe('8718951834101');
    expect(audit.profile.halal).toBe(true);
  });

  describe('скорость: медленный сервер не задерживает результат штрихкода', () => {
    const hang = (init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      });

    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('если ИИ молчит дольше бюджета — показывается результат локального фильтра с пометкой', async () => {
      fetchMock.mockImplementation((url: string, init?: RequestInit) => {
        if (url.startsWith('https://world.openfoodfacts.org')) return json({ status: 1, product: { product_name: 'Water', ingredients_text: '' } });
        if (url.includes('/api/community-status')) return json(NO_COMMUNITY);
        const b = JSON.parse(String(init?.body ?? '{}'));
        if (b.action === 'find-product') return json({ found: true, via: 'web', sources: SOURCE, ingredientsText: 'water, citroenzuur' });
        return hang(init); // audit-text не отвечает
      });
      const p = auditBarcode('8718951834101', profile);
      await jest.advanceTimersByTimeAsync(BARCODE_AI_TIMEOUT_MS + 50);
      const r = await p;
      expect(r.usedAI).toBe(false);
      expect(r.notes.join(' ')).toContain('ИИ недоступен');
      expect(r.verdict).not.toBe('BANNED');
    });

    it('если статус сообщества не отвечает — ждём его не дольше короткой паузы', async () => {
      fetchMock.mockImplementation((url: string, init?: RequestInit) => {
        if (url.startsWith('https://world.openfoodfacts.org')) return json({ status: 1, product: { product_name: 'Snoep', ingredients_text: 'suiker, gelatine' } });
        if (url.includes('/api/community-status')) return hang(init);
        return json({ text: AUDIT_OK });
      });
      const p = auditBarcode('8718951834101', profile);
      await jest.advanceTimersByTimeAsync(COMMUNITY_GRACE_MS + 50);
      const r = await p;
      expect(r.community).toBeUndefined();
      expect(r.verdict).not.toBe('SAFE');
    });
  });

  describe('статус сообщества', () => {
    const offSafe = () => json({ status: 1, product: { product_name: 'Water', ingredients_text: 'water, citroenzuur' } });
    const approved = (status: string) => () => json({ barcode: 'x', status, haram: 1, halal: 1 });

    it('подтверждённое «не халяль» делает вердикт BANNED для халяль-профиля', async () => {
      mockNetwork({ off: offSafe, audit: () => ({ text: AUDIT_OK }), community: approved('haram') });
      const r = await auditBarcode('8718951834101', profile);
      expect(r.verdict).toBe('BANNED');
      expect(r.community?.status).toBe('haram');
      expect(r.issues.some((i) => i.source === 'community' && i.severity === 'BANNED')).toBe(true);
    });

    it('спорный статус даёт WARNING, а для не-халяль профиля ничего не меняет', async () => {
      mockNetwork({ off: offSafe, audit: () => ({ text: AUDIT_OK }), community: approved('disputed') });
      expect((await auditBarcode('8718951834101', profile)).verdict).toBe('WARNING');
      const plain = { ...createDefaultProfile(), halal: false };
      expect((await auditBarcode('8718951834101', plain)).verdict).toBe('SAFE');
    });

    it('подтверждённое «халяль» вердикт не смягчает, только добавляет пометку', async () => {
      mockNetwork({
        off: () => json({ status: 1, product: { product_name: 'Snoep', ingredients_text: 'suiker, gelatine' } }),
        community: approved('halal'),
      });
      const r = await auditBarcode('8718951834101', profile);
      expect(r.community?.status).toBe('halal');
      expect(r.verdict).not.toBe('SAFE');
    });

    it('сбой запроса статуса не ломает проверку', async () => {
      mockNetwork({ off: offSafe, audit: () => ({ text: AUDIT_OK }), community: () => json({ error: { message: 'x' } }, 503) });
      const r = await auditBarcode('8718951834101', profile);
      expect(r.verdict).toBe('SAFE');
      expect(r.community).toBeUndefined();
    });
  });
});
