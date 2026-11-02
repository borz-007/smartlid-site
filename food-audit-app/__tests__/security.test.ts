const FAKE_KEY = 'AIzaFAKE-test-key-0123456789abcdefghijk';
process.env.EXPO_PUBLIC_GEMINI_API_KEY = FAKE_KEY;

import { postGenerate } from '../src/services/gemini';
import { fetchWithTimeout, geminiHttpError, HttpError, userMessage } from '../src/services/http';

const respond = (status: number, body: unknown) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);

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
