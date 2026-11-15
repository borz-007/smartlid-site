process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.test.example';

import { auditBarcode, auditPhoto, COMMUNITY_GRACE_MS, recheckWithAI } from '../src/engine/auditor';
import { splitIngredients } from '../src/engine/ingredients';
import { HttpError } from '../src/services/http';
import { extractJsonObject } from '../src/services/gemini';
import { ProductNotFoundError } from '../src/services/openFoodFacts';
import { recognizeText } from '../src/services/ocr';
import { createDefaultProfile } from '../src/storage/profileStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({}));
// Нативный модуль ML Kit в Jest недоступен — подменяем сервис распознавания
jest.mock('../src/services/ocr', () => ({ recognizeText: jest.fn() }));

const json = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);

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

describe('офлайн-сценарии: штрихкод, фото состава, ручная перепроверка', () => {
  const profile = { ...createDefaultProfile(), halal: true };
  let fetchMock: jest.Mock;
  let calls: { url: string; body?: any }[];

  interface Net {
    off?: () => Promise<Response>;
    audit?: (b: any) => unknown;
    community?: () => Promise<Response>;
  }

  function mockNetwork(n: Net = {}) {
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, body });
      if (url.startsWith('https://world.openfoodfacts.org')) return (n.off ?? (() => json({ status: 0 }, 404)))();
      if (url.includes('/api/community-status')) return (n.community ?? (() => json(NO_COMMUNITY)))();
      if (url === 'https://api.test.example/api/ingredient-audit' && body.action === 'audit-text' && n.audit) return json(n.audit(body));
      throw new Error(`unexpected request ${url} ${body?.action ?? ''}`);
    });
  }
  /** Все запросы к нашему серверу, кроме статуса сообщества (то есть всё, что могло бы идти в Gemini). */
  const aiCalls = () => calls.filter((c) => c.url.includes('/api/ingredient-audit'));

  beforeEach(() => {
    calls = [];
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
    (recognizeText as jest.Mock).mockReset();
  });

  describe('штрихкод: только Open Food Facts и локальные правила', () => {
    const offWith = (text: string) => () => json({ status: 1, product: { product_name: 'Snoep', brands: 'X', ingredients_text: text } });

    it('состав есть в OFF — проверка локальная, на сервер с Gemini ничего не уходит', async () => {
      mockNetwork({ off: offWith('water, citroenzuur') });
      const r = await auditBarcode('8718951834101', profile);
      expect(aiCalls()).toEqual([]);
      expect(r.usedAI).toBe(false);
      expect(r.ingredientsSource).toBe('openfoodfacts');
      expect(r.verdict).toBe('SAFE');
    });

    it('локальные правила ловят запрещённое: желатин и E120 для халяль-профиля', async () => {
      mockNetwork({ off: offWith('suiker, gelatine, kleurstof: E120') });
      const r = await auditBarcode('8718951834101', profile);
      expect(r.verdict).toBe('BANNED');
      expect(aiCalls()).toEqual([]);
    });

    it('товара нет в OFF — сразу «не найден», без поиска через Gemini', async () => {
      mockNetwork();
      const err = await auditBarcode('8718951834101', profile).catch((e) => e);
      expect(err).toBeInstanceOf(ProductNotFoundError);
      expect(aiCalls()).toEqual([]);
    });

    it('в карточке пустой состав — «не найден» с пояснением, без обращения к Gemini', async () => {
      mockNetwork({ off: offWith('') });
      const err = await auditBarcode('8718951834101', profile).catch((e) => e);
      expect(err).toBeInstanceOf(ProductNotFoundError);
      expect(err.detail).toContain('нет состава');
      expect(aiCalls()).toEqual([]);
    });

    it('код с неверной контрольной цифрой — понятное пояснение', async () => {
      mockNetwork();
      const err = await auditBarcode('1234567890123', profile).catch((e) => e);
      expect(err).toBeInstanceOf(ProductNotFoundError);
      expect(err.detail).toContain('контрольная цифра');
    });

    it('сбой сети при запросе к OFF — это ошибка, а не «товар не найден»', async () => {
      fetchMock.mockImplementation(async (url: string) => {
        if (url.includes('/api/community-status')) return json(NO_COMMUNITY);
        throw new TypeError('Network request failed');
      });
      const err = await auditBarcode('8718951834101', profile).catch((e) => e);
      expect(err).not.toBeInstanceOf(ProductNotFoundError);
    });

    describe('статус сообщества (запрос за статусом, не Gemini)', () => {
      const approved = (status: string) => () => json({ barcode: 'x', status, haram: 1, halal: 1 });

      it('подтверждённое «не халяль» делает вердикт BANNED для халяль-профиля', async () => {
        mockNetwork({ off: offWith('water, citroenzuur'), community: approved('haram') });
        const r = await auditBarcode('8718951834101', profile);
        expect(r.verdict).toBe('BANNED');
        expect(r.community?.status).toBe('haram');
      });

      it('спорный статус даёт WARNING, а для не-халяль профиля ничего не меняет', async () => {
        mockNetwork({ off: offWith('water, citroenzuur'), community: approved('disputed') });
        expect((await auditBarcode('8718951834101', profile)).verdict).toBe('WARNING');
        const plain = { ...createDefaultProfile(), halal: false };
        expect((await auditBarcode('8718951834101', plain)).verdict).toBe('SAFE');
      });

      it('сбой запроса статуса не ломает проверку', async () => {
        mockNetwork({ off: offWith('water, citroenzuur'), community: () => json({ error: { message: 'x' } }, 503) });
        const r = await auditBarcode('8718951834101', profile);
        expect(r.verdict).toBe('SAFE');
        expect(r.community).toBeUndefined();
      });

      describe('медленный сервер не задерживает результат', () => {
        beforeEach(() => jest.useFakeTimers());
        afterEach(() => jest.useRealTimers());

        it('статус сообщества ждём не дольше короткой паузы', async () => {
          fetchMock.mockImplementation((url: string, init?: RequestInit) => {
            if (url.startsWith('https://world.openfoodfacts.org')) return offWith('suiker, gelatine')();
            return new Promise<Response>((_, reject) => {
              init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
            });
          });
          const p = auditBarcode('8718951834101', profile);
          await jest.advanceTimersByTimeAsync(COMMUNITY_GRACE_MS + 50);
          const r = await p;
          expect(r.community).toBeUndefined();
          expect(r.verdict).not.toBe('SAFE');
        });
      });
    });
  });

  describe('фото состава: офлайн-распознавание (ML Kit), без отправки на сервер', () => {
    const NL_LABEL = [
      'Pinky Donuts',
      'Ingrediënten: tarwebloem, suiker, palmvet,',
      'gela-',
      'tine, emulgator (E 471), kleurstof E-120.',
      'Kan sporen van noten bevatten.',
      'Gemiddelde voedingswaarde per 100 g',
      'Energie 1500 kJ',
    ].join('\n');

    it('текст распознаётся на устройстве, чистится и проверяется локально; в сеть ничего не уходит', async () => {
      (recognizeText as jest.Mock).mockResolvedValue(NL_LABEL);
      mockNetwork();
      const r = await auditPhoto('file:///photo.jpg', profile);
      expect(recognizeText).toHaveBeenCalledWith('file:///photo.jpg');
      expect(fetchMock).not.toHaveBeenCalled();
      expect(r.usedAI).toBe(false);
      expect(r.ingredientsSource).toBe('photo');
      expect(r.ingredientsText).toContain('gelatine');
      expect(r.ingredientsText).toContain('E471');
      expect(r.ingredientsText).not.toContain('Energie');
      expect(r.verdict).toBe('BANNED'); // желатин и кармин (E120) для халяль-профиля
    });

    it('безопасный состав на французском даёт SAFE', async () => {
      (recognizeText as jest.Mock).mockResolvedValue('Ingrédients : eau, sucre, acide citrique.\nValeurs nutritionnelles moyennes');
      const r = await auditPhoto('file:///photo.jpg', profile);
      expect(r.verdict).toBe('SAFE');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('слишком короткий или пустой текст — понятная ошибка без обращения к серверу', async () => {
      (recognizeText as jest.Mock).mockResolvedValue('  \n ');
      await expect(auditPhoto('file:///photo.jpg', profile)).rejects.toThrow(/не распознан/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('ошибка распознавания пробрасывается как HttpError', async () => {
      (recognizeText as jest.Mock).mockRejectedValue(new HttpError('Не удалось распознать текст на фото. Попробуйте сфотографировать ещё раз.'));
      await expect(auditPhoto('file:///photo.jpg', profile)).rejects.toBeInstanceOf(HttpError);
    });
  });

  describe('ручная перепроверка: «Перепроверить через ИИ»', () => {
    const offWith = (text: string) => () => json({ status: 1, product: { product_name: 'Snoep', ingredients_text: text, countries_tags: ['en:belgium'], labels_tags: ['en:halal'] } });

    it('на сервер уходит только текст состава (без картинки) и контекст; ИИ может ужесточить вердикт', async () => {
      const aiBanned = JSON.stringify({
        ingredients_text: '',
        verdict: 'BANNED',
        summary_ru: 'Есть сомнительный компонент',
        issues: [{ original: 'aroma', translation_ru: 'ароматизатор', reason_ru: 'может содержать спирт', severity: 'BANNED', category: 'halal', allergen: 'none', is_trace: false }],
      });
      mockNetwork({ off: offWith('water, aroma'), audit: () => ({ text: aiBanned }) });
      const first = await auditBarcode('8718951834101', profile);
      expect(first.verdict).not.toBe('BANNED');

      const r = await recheckWithAI(first, profile);
      const sent = aiCalls();
      expect(sent).toHaveLength(1);
      expect(sent[0].body.action).toBe('audit-text');
      expect(sent[0].body.text).toBe('water, aroma');
      expect(sent[0].body).not.toHaveProperty('image');
      expect(sent[0].body.context.countries).toEqual(['en:belgium']);
      expect(sent[0].body.context.certifications).toEqual({ halal: true, vegan: false });
      expect(r.usedAI).toBe(true);
      expect(r.verdict).toBe('BANNED');
    });

    it('ИИ не может снять запрет, найденный локальным фильтром', async () => {
      // без халяль-маркировки на упаковке (в offWith она есть и разрешает желатин)
      mockNetwork({ off: () => json({ status: 1, product: { product_name: 'Snoep', ingredients_text: 'suiker, gelatine' } }), audit: () => ({ text: AUDIT_OK }) });
      const first = await auditBarcode('8718951834101', profile);
      expect(first.verdict).toBe('BANNED');
      const r = await recheckWithAI(first, profile);
      expect(r.verdict).toBe(first.verdict);
    });

    it('работает и для результата по фото (текст отправляется, фото нет)', async () => {
      (recognizeText as jest.Mock).mockResolvedValue('Zutaten: Zucker, Wasser, Aroma.');
      mockNetwork({ audit: () => ({ text: AUDIT_OK }) });
      const first = await auditPhoto('file:///photo.jpg', profile);
      const r = await recheckWithAI(first, profile);
      expect(aiCalls()[0].body.text).toBe('Zucker, Wasser, Aroma');
      expect(r.usedAI).toBe(true);
    });

    it('результат из старого кэша без raw тоже перепроверяется (по тексту состава)', async () => {
      mockNetwork({ off: offWith('water, citroenzuur'), audit: () => ({ text: AUDIT_OK }) });
      const first = await auditBarcode('8718951834101', profile);
      const legacy = { ...first, raw: undefined };
      const r = await recheckWithAI(legacy, profile);
      expect(r.usedAI).toBe(true);
    });

    it('ошибка сервера — понятный HttpError, результат не теряется', async () => {
      mockNetwork({ off: offWith('water, citroenzuur') });
      const first = await auditBarcode('8718951834101', profile);
      fetchMock.mockImplementation(async () => json({ error: { message: 'Лимит запросов к ИИ исчерпан. Попробуйте позже.' } }, 429));
      await expect(recheckWithAI(first, profile)).rejects.toMatchObject({ status: 429 });
    });

    it('подтверждённый статус сообщества сохраняется после перепроверки', async () => {
      mockNetwork({
        off: offWith('water, citroenzuur'),
        audit: () => ({ text: AUDIT_OK }),
        community: () => json({ barcode: 'x', status: 'haram', haram: 2, halal: 0 }),
      });
      const first = await auditBarcode('8718951834101', profile);
      expect(first.verdict).toBe('BANNED');
      const r = await recheckWithAI(first, profile);
      expect(r.community?.status).toBe('haram');
      expect(r.verdict).toBe('BANNED');
    });
  });
});
