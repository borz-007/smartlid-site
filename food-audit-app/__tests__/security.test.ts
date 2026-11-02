const FAKE_KEY = 'AIzaFAKE-test-key-0123456789abcdefghijk';
process.env.EXPO_PUBLIC_GEMINI_API_KEY = FAKE_KEY;

import { config } from '../src/constants/config';
import { findProductOnWeb, postGenerate, resetWebSearchCooldown } from '../src/services/gemini';
import { hasValidGtinChecksum } from '../src/services/openFoodFacts';
import { fetchWithTimeout, geminiHttpError, HttpError, userMessage } from '../src/services/http';

const respond = (status: number, body: unknown) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);

// CI собирает APK с EXPO_PUBLIC_DEBUG_AI_ERRORS=1 и запасной моделью: тесты не должны от этого зависеть
beforeEach(() => {
  config.debugErrors = false;
  config.geminiFallbackModel = '';
});

describe('безопасность сетевого слоя', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    (global as any).fetch = fetchMock;
  });

  it('запрещает запросы по http://', async () => {
    await expect(fetchWithTimeout('http://example.com/api')).rejects.toThrow(HttpError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ключ Gemini уходит заголовком, а не в URL', async () => {
    fetchMock.mockReturnValueOnce(respond(200, { candidates: [] }));
    await postGenerate({});
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/^https:\/\//);
    expect(url).not.toContain(FAKE_KEY);
    expect(url).not.toContain('key=');
    expect(init.headers['x-goog-api-key']).toBe(FAKE_KEY);
  });

  it('сырой текст ошибки Gemini не попадает в сообщение для пользователя', async () => {
    const raw = `API key not valid: ${FAKE_KEY}. Quota exceeded for project 123456789, see https://ai.google.dev/x`;
    fetchMock.mockReturnValueOnce(respond(429, { error: { message: raw } }));
    const err = await postGenerate({}).catch((e) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err.message).not.toContain(FAKE_KEY);
    expect(err.message).not.toContain('123456789');
    expect(err.message).not.toContain('http');
    expect(err.status).toBe(429);
  });

  it('сбой сети не раскрывает исходное исключение (оно может содержать URL)', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError(`Network request failed: https://x/?key=${FAKE_KEY}`));
    const err = await postGenerate({}).catch((e) => e);
    expect(err.message).not.toContain(FAKE_KEY);
  });

  it('userMessage показывает только HttpError, остальное заменяет запасным текстом', () => {
    expect(userMessage(geminiHttpError(429), 'fallback')).toMatch(/Лимит/);
    expect(userMessage(new TypeError(`boom ${FAKE_KEY}`), 'fallback')).toBe('fallback');
    expect(userMessage('строка', 'fallback')).toBe('fallback');
  });
});

describe('ошибка лимита Gemini (429)', () => {
  const body = (quotaId: string, retryDelay?: string) => ({
    error: {
      message: `quota exceeded ${FAKE_KEY}`,
      details: [
        { '@type': 'type.googleapis.com/google.rpc.QuotaFailure', violations: [{ quotaId, quotaMetric: 'x' }] },
        ...(retryDelay ? [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay }] : []),
      ],
    },
  });

  it('различает дневной и минутный лимит и не показывает идентификаторы квот', () => {
    const day = geminiHttpError(429, body('GenerateRequestsPerDayPerProjectPerModel-FreeTier'));
    expect(day.message).toMatch(/дневной лимит/);
    expect(day.message).not.toMatch(/PerDay|FreeTier|AIza/);

    const min = geminiHttpError(429, body('GenerateRequestsPerMinutePerProjectPerModel-FreeTier', '34.2s'));
    expect(min.message).toMatch(/через 35 с/);
    expect(min.retryAfterSec).toBe(35);
  });

  it('без деталей даёт общее сообщение', () => {
    expect(geminiHttpError(429, { error: { message: 'x' } }).message).toMatch(/Лимит запросов Gemini/);
    expect(geminiHttpError(429).message).toMatch(/Лимит запросов Gemini/);
  });
});

describe('поиск товара в интернете после 429', () => {
  beforeEach(() => {
    resetWebSearchCooldown();
    (global as any).fetch = jest.fn();
  });

  it('повторно не вызывает Gemini, пока действует пауза', async () => {
    const f = (global as any).fetch as jest.Mock;
    f.mockReturnValueOnce(respond(429, { error: { details: [] } }));
    await expect(findProductOnWeb('5449000000996')).rejects.toThrow(HttpError);
    await expect(findProductOnWeb('5449000000996')).rejects.toThrow(/Gemini/);
    expect(f).toHaveBeenCalledTimes(1);
  });
});

describe('контрольная цифра штрихкода', () => {
  it('принимает корректные GTIN и отклоняет ошибочные', () => {
    expect(hasValidGtinChecksum('259378663397')).toBe(true);
    expect(hasValidGtinChecksum('5449000000996')).toBe(true);
    expect(hasValidGtinChecksum('12345670')).toBe(true);
    expect(hasValidGtinChecksum('5449000000997')).toBe(false);
    expect(hasValidGtinChecksum('12345')).toBe(false);
    expect(hasValidGtinChecksum('abc')).toBe(false);
  });
});

describe('ответы 5xx: повторы, запасная модель, отладочные подробности', () => {
  let f: jest.Mock;
  const original = { ...config };

  beforeEach(() => {
    f = jest.fn();
    (global as any).fetch = f;
    config.retryDelaysMs = [0, 0];
    config.geminiFallbackModel = '';
    config.debugErrors = false;
  });
  afterAll(() => Object.assign(config, original));

  const modelOf = (call: unknown[]) => String(call[0]).match(/models\/([^:]+):/)?.[1];

  it('повторяет запрос при 503 и возвращает успешный ответ', async () => {
    f.mockReturnValueOnce(respond(503, { error: { status: 'UNAVAILABLE' } })).mockReturnValueOnce(respond(200, { candidates: [] }));
    await expect(postGenerate({})).resolves.toEqual({ candidates: [] });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('после исчерпания повторов пробует запасную модель', async () => {
    config.geminiFallbackModel = 'fallback-model';
    f.mockReturnValue(respond(503, {}));
    f.mockReturnValueOnce(respond(503, {})).mockReturnValueOnce(respond(503, {})).mockReturnValueOnce(respond(503, {}));
    f.mockReturnValueOnce(respond(200, { candidates: ['ok'] }));
    await expect(postGenerate({})).resolves.toEqual({ candidates: ['ok'] });
    expect(f).toHaveBeenCalledTimes(4);
    expect(modelOf(f.mock.calls[3])).toBe('fallback-model');
    expect(modelOf(f.mock.calls[0])).toBe(config.geminiModel);
  });

  it('4xx (кроме 404) не повторяются', async () => {
    f.mockReturnValue(respond(403, {}));
    await expect(postGenerate({})).rejects.toMatchObject({ status: 403 });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('в обычном режиме в сообщении только код, без текста Google', async () => {
    f.mockReturnValue(respond(503, { error: { status: 'UNAVAILABLE', message: `overloaded ${FAKE_KEY}` } }));
    const err = await postGenerate({}).catch((e) => e);
    expect(err.message).toMatch(/\(HTTP 503\)/);
    expect(err.message).not.toMatch(/overloaded|UNAVAILABLE|AIza/);
  });

  it('в режиме отладки показывает статус и сообщение Google, но вырезает ключ', async () => {
    config.debugErrors = true;
    f.mockReturnValue(respond(503, { error: { status: 'UNAVAILABLE', message: `The model is overloaded ${FAKE_KEY}` } }));
    const err = await postGenerate({}).catch((e) => e);
    expect(err.message).toMatch(/HTTP 503 UNAVAILABLE/);
    expect(err.message).toMatch(/The model is overloaded/);
    expect(err.message).not.toContain(FAKE_KEY);
    expect(err.message).toContain('[ключ]');
  });
});
