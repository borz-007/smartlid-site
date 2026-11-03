process.env.EXPO_PUBLIC_GEMINI_API_KEY = 'test-key';

import { auditBarcode } from '../src/engine/auditor';
import { splitIngredients } from '../src/engine/ingredients';
import { extractJsonObject } from '../src/services/gemini';
import { ProductNotFoundError } from '../src/services/openFoodFacts';
import { createDefaultProfile } from '../src/storage/profileStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({}));

const json = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);

const geminiText = (text: string, chunks: object[] = []) => ({
  candidates: [{ content: { parts: [{ text }] }, groundingMetadata: { groundingChunks: chunks } }],
});

const SOURCE = [{ web: { uri: 'https://www.ah.nl/producten/x', title: 'ah.nl' } }];
const AUDIT_OK = JSON.stringify({ ingredients_text: '', verdict: 'SAFE', issues: [], summary_ru: 'ок' });

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

describe('auditBarcode: Open Food Facts → интернет → Gemini', () => {
  const profile = { ...createDefaultProfile(), halal: true };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  it('если товара нет в OFF — ищет состав в интернете и проверяет его', async () => {
    fetchMock
      .mockReturnValueOnce(json({ status: 0 }, 404)) // OFF
      .mockReturnValueOnce(
        json(
          geminiText(
            '{"found":true,"name":"Snoep","brand":"X","manufacturer":"X BV","ingredients_text":"suiker, glucosestroop, gelatine, kleurstof: E120"}',
            SOURCE,
          ),
        ),
      );
    const stages: string[] = [];
    const r = await auditBarcode('8718951834101', profile, (s) => stages.push(s));

    expect(r.ingredientsSource).toBe('web');
    expect(r.verdict).toBe('BANNED'); // желатин и E120 — локально, без второго вызова ИИ
    expect(r.product?.manufacturer).toBe('X BV');
    expect(r.product?.sources?.[0].uri).toContain('ah.nl');
    expect(stages).toContain('Ищем состав в интернете…');
    const searchBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(searchBody.tools).toEqual([{ google_search: {} }]);
  });

  it('безопасный состав из интернета дополнительно проверяет Gemini', async () => {
    fetchMock
      .mockReturnValueOnce(json({ status: 0 }, 404))
      .mockReturnValueOnce(json(geminiText('{"found":true,"ingredients_text":"water, suiker, citroenzuur"}', SOURCE)))
      .mockReturnValueOnce(json(geminiText(AUDIT_OK)));
    const r = await auditBarcode('8718951834101', profile);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(r.usedAI).toBe(true);
    expect(r.verdict).toBe('SAFE');
  });

  it('ответ без источников поиска не принимается (защита от выдуманного состава)', async () => {
    fetchMock
      .mockReturnValueOnce(json({ status: 0 }, 404))
      .mockReturnValueOnce(json(geminiText('{"found":true,"ingredients_text":"water, suiker, zout"}', [])));
    await expect(auditBarcode('8718951834101', profile)).rejects.toBeInstanceOf(ProductNotFoundError);
  });
});
