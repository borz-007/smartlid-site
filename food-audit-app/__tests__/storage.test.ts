const mockStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => mockStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => {
    mockStore[k] = v;
  }),
  removeItem: jest.fn(async (k: string) => {
    delete mockStore[k];
  }),
}));

import { CACHE_MAX_ENTRIES, getCachedResult, setCachedResult } from '../src/storage/cacheStorage';
import { addToHistory, HISTORY_MAX, loadHistory } from '../src/storage/historyStorage';

const scan = (barcode?: string) =>
  ({ verdict: 'SAFE', issues: [], traces: [], notes: [], ingredientsSource: 'openfoodfacts', product: { barcode, name: `p${barcode}` } }) as any;

let now = 1_000;
beforeEach(() => {
  for (const k of Object.keys(mockStore)) delete mockStore[k];
  jest.spyOn(Date, 'now').mockImplementation(() => ++now);
});
afterEach(() => jest.restoreAllMocks());

describe('история', () => {
  it('хранит только последние HISTORY_MAX проверок, новые сверху', async () => {
    expect(HISTORY_MAX).toBe(8);
    for (let i = 1; i <= 12; i++) await addToHistory(scan(String(i)));
    const list = await loadHistory();
    expect(list).toHaveLength(8);
    expect(list[0].barcode).toBe('12');
    expect(list[7].barcode).toBe('5');
  });

  it('повторная проверка того же товара не создаёт дубликат, а поднимает запись наверх', async () => {
    await addToHistory(scan('A'));
    await addToHistory(scan('B'));
    await addToHistory(scan('A'));
    const list = await loadHistory();
    expect(list.map((e) => e.barcode)).toEqual(['A', 'B']);
  });

  it('обрезает старый длинный список при чтении', async () => {
    mockStore['@food_audit/history_v1'] = JSON.stringify(Array.from({ length: 20 }, (_, i) => ({ id: String(i), barcode: String(i) })));
    expect(await loadHistory()).toHaveLength(8);
  });
});

describe('кэш результатов', () => {
  it('держит не больше CACHE_MAX_ENTRIES записей и вытесняет самые старые', async () => {
    expect(CACHE_MAX_ENTRIES).toBe(8);
    for (let i = 1; i <= 12; i++) await setCachedResult(`b${i}`, scan(`b${i}`));
    expect(await getCachedResult('b1')).toBeNull();
    expect(await getCachedResult('b4')).toBeNull();
    expect(await getCachedResult('b5')).not.toBeNull();
    expect(await getCachedResult('b12')).not.toBeNull();
    expect(Object.keys(JSON.parse(mockStore['@food_audit/cache_v1']))).toHaveLength(8);
  });
});
