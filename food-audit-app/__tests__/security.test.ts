process.env.EXPO_PUBLIC_API_BASE_URL = 'https://api.test.example/';

import fs from 'fs';
import path from 'path';
import { config } from '../src/constants/config';
import { getBackend, postBackend, SERVER_UNREACHABLE } from '../src/services/backend';
import { auditTextWithAI, findProductOnWeb, resetWebSearchCooldown } from '../src/services/gemini';
import { fetchWithTimeout, HttpError, userMessage } from '../src/services/http';
import { createDefaultProfile } from '../src/storage/profileStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({}));

const respond = (status: number, body: unknown) =>
  Promise.resolve({ ok: status < 400, status, json: () => (body === undefined ? Promise.reject(new Error('not json')) : Promise.resolve(body)) } as Response);

let fetchMock: jest.Mock;
const originalBase = config.apiBaseUrl;
beforeEach(() => {
  fetchMock = jest.fn();
  (global as any).fetch = fetchMock;
  config.apiBaseUrl = originalBase;
  resetWebSearchCooldown();
});

describe('сетевой слой клиента', () => {
  it('запрещает запросы по http://', async () => {
    await expect(fetchWithTimeout('http://example.com/api')).rejects.toThrow(HttpError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POST уходит только на наш сервер, без ключей и авторизации', async () => {
    fetchMock.mockReturnValueOnce(respond(200, { ok: true }));
    await postBackend('/api/ingredient-audit', { action: 'expiry', image: 'QUJD' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test.example/api/ingredient-audit');
    expect(Object.keys(init.headers)).toEqual(['Content-Type']);
    expect(JSON.parse(init.body)).toEqual({ action: 'expiry', image: 'QUJD' });
  });

  it('ответ сервера с ошибкой -> понятное сообщение и код HTTP, без стеков', async () => {
    fetchMock.mockReturnValueOnce(respond(429, { error: { code: 'quota', message: 'Слишком много запросов к ИИ.', retryAfterSec: 12 } }));
    const err = await postBackend<any>('/x', {}).catch((e: any) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.message).toBe('Слишком много запросов к ИИ. (HTTP 429)');
    expect(err.status).toBe(429);
    expect(err.retryAfterSec).toBe(12);
  });

  it('подробности от сервера (режим отладки сервера) показываются только если пришли', async () => {
    fetchMock.mockReturnValueOnce(respond(503, { error: { message: 'Сервис ИИ недоступен.', detail: '[HTTP 503 UNAVAILABLE] overloaded' } }));
    const err = await postBackend<any>('/x', {}).catch((e: any) => e);
    expect(err.message).toBe('Сервис ИИ недоступен. (HTTP 503)\n[HTTP 503 UNAVAILABLE] overloaded');
  });

  it('HTML-страница ошибки (502 от Vercel) -> «сервер недоступен»', async () => {
    fetchMock.mockReturnValueOnce(respond(502, undefined));
    const err = await postBackend<any>('/x', {}).catch((e: any) => e);
    expect(err.message).toBe('Сервер SAFA временно недоступен. (HTTP 502)');
  });

  it('нет сети -> понятное сообщение, исходное исключение не показывается', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed: https://api.test.example/x'));
    const err = await getBackend<any>('/x').catch((e: any) => e);
    expect(err.message).toBe(SERVER_UNREACHABLE);
  });

  it('таймаут -> сообщение о времени ожидания', async () => {
    fetchMock.mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    const err = await getBackend<any>('/x').catch((e: any) => e);
    expect(err.message).toBe('Превышено время ожидания ответа сервера');
  });

  it('адрес сервера не задан -> понятная ошибка и ни одного запроса', async () => {
    config.apiBaseUrl = '';
    await expect(postBackend('/x', {})).rejects.toThrow(/не настроен/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('userMessage показывает только HttpError, остальное заменяет запасным текстом', () => {
    expect(userMessage(new HttpError('понятно'), 'fallback')).toBe('понятно');
    expect(userMessage(new TypeError('boom stack'), 'fallback')).toBe('fallback');
    expect(userMessage('строка', 'fallback')).toBe('fallback');
  });
});

describe('клиент ИИ: данные уходят на сервер, промпта и ключа на клиенте нет', () => {
  it('аудит текста отправляет профиль и контекст, а не промпт', async () => {
    const audit = JSON.stringify({ ingredients_text: 'x', verdict: 'SAFE', issues: [], summary_ru: 'ок' });
    fetchMock.mockReturnValueOnce(respond(200, { text: audit }));
    const profile = { ...createDefaultProfile(), halal: true, customStopWords: ['пиво'] };
    profile.allergens = { ...profile.allergens, milk: true };
    const r = await auditTextWithAI('suiker, melk', profile, { barcode: '8718951834101', countries: ['en:belgium'], certifications: { halal: false } });
    expect(r.verdict).toBe('SAFE');

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.action).toBe('audit-text');
    expect(body.profile.allergens).toEqual([{ id: 'milk', label: 'Молоко / лактоза' }]);
    expect(body.profile.customStopWords).toEqual(['пиво']);
    expect(body.context).toMatchObject({ barcode: '8718951834101', countries: ['en:belgium'] });
    expect(body).not.toHaveProperty('systemInstruction');
    expect(JSON.stringify(body)).not.toMatch(/СТРОГОЕ ПРАВИЛО/);
  });

  it('ответ сервера не в формате JSON модели -> HttpError', async () => {
    fetchMock.mockReturnValueOnce(respond(200, { text: 'не json' }));
    await expect(auditTextWithAI('a, b', createDefaultProfile())).rejects.toThrow(HttpError);
  });

  it('после 429 поиск в интернете делает паузу и не повторяет запрос', async () => {
    fetchMock.mockReturnValueOnce(respond(429, { error: { message: 'Лимит.', retryAfterSec: 30 } }));
    await expect(findProductOnWeb('8718951834101')).rejects.toMatchObject({ status: 429 });
    await expect(findProductOnWeb('8718951834101')).rejects.toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('источники не по https отбрасываются, состав без источников не считается найденным', async () => {
    fetchMock.mockReturnValueOnce(respond(200, { found: true, ingredientsText: 'water, sugar, gelatin', sources: [{ title: 'x', uri: 'http://insecure.example' }] }));
    expect((await findProductOnWeb('8718951834101')).found).toBe(false);
  });
});

describe('изоляция ключа Gemini: в клиенте его нет', () => {
  const root = path.resolve(__dirname, '..');
  const FORBIDDEN = ['generativelanguage', 'x-goog-api-key', 'EXPO_PUBLIC_GEMINI', 'GoogleGenerativeAI', '@google/generative-ai', 'GEMINI_API_KEY', ['AI', 'za'].join('')];

  function walk(dir: string, out: string[] = []): string[] {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else out.push(p);
    }
    return out;
  }

  const files = [
    ...walk(path.join(root, 'src')),
    path.join(root, 'App.tsx'),
    path.join(root, 'app.json'),
    path.join(root, 'package.json'),
    path.join(root, '.env.example'),
    path.resolve(root, '..', '.github', 'workflows', 'food-audit-apk.yml'),
  ];

  it.each(FORBIDDEN)('исходники приложения и CI не содержат «%s»', (word) => {
    const hits = files.filter((f) => fs.readFileSync(f, 'utf8').includes(word)).map((f) => path.relative(root, f));
    expect(hits).toEqual([]);
  });

  it('в клиентском коде нет прямых обращений к Google, кроме нашего сервера и Open Food Facts', () => {
    const urls = new Set<string>();
    for (const f of files.filter((x) => x.includes(`${path.sep}src${path.sep}`))) {
      for (const m of fs.readFileSync(f, 'utf8').matchAll(/https?:\/\/[a-z0-9.-]+/gi)) urls.add(m[0].toLowerCase());
    }
    const allowed = ['https://world.openfoodfacts.org', 'https://openfoodfacts.github.io']; // второй — ссылка на документацию в комментарии
    expect([...urls].filter((u) => !allowed.some((a) => u.startsWith(a)) && !u.includes('example'))).toEqual([]);
  });
});
