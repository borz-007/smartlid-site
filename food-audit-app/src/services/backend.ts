/**
 * Единственная точка связи с нашим сервером (Vercel). Клиент отправляет обычные POST/GET-запросы
 * по HTTPS; никаких ключей с телефона не передаётся. Ошибки превращаются в понятные сообщения
 * без технических деталей.
 */
import { config } from '../constants/config';
import { fetchWithTimeout, HttpError } from './http';

export const SERVER_UNREACHABLE = 'Сервер SAFA недоступен. Проверьте интернет и повторите позже.';

function url(path: string): string {
  if (!config.apiBaseUrl) throw new HttpError('Сервер SAFA не настроен в этой сборке приложения.');
  return config.apiBaseUrl.replace(/\/+$/, '') + path;
}

async function request<T>(path: string, init: RequestInit, timeoutMs: number): Promise<T> {
  let res: Response;
  try {
    res = await fetchWithTimeout(url(path), init, timeoutMs);
  } catch (e) {
    if (e instanceof HttpError && e.message === 'Нет соединения с сервером') throw new HttpError(SERVER_UNREACHABLE);
    throw e;
  }
  const json: any = await res.json().catch(() => null);
  if (!res.ok) {
    const err = json?.error;
    const base =
      typeof err?.message === 'string' && err.message
        ? err.message
        : res.status >= 500 || res.status === 404 || res.status === 401 || res.status === 403
          ? 'Сервер SAFA временно недоступен.'
          : 'Сервер не смог обработать запрос.';
    // Подробности (err.detail) сервер присылает только в режиме отладки AI_DEBUG_ERRORS=1
    const detail = typeof err?.detail === 'string' && err.detail ? `\n${err.detail.slice(0, 300)}` : '';
    throw new HttpError(`${base} (HTTP ${res.status})${detail}`, res.status, typeof err?.retryAfterSec === 'number' ? err.retryAfterSec : undefined);
  }
  if (json === null) throw new HttpError('Сервер вернул некорректный ответ.', res.status);
  return json as T;
}

export function postBackend<T>(path: string, body: unknown, timeoutMs = config.aiTimeoutMs): Promise<T> {
  return request<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, timeoutMs);
}

export function getBackend<T>(path: string, timeoutMs = config.apiTimeoutMs): Promise<T> {
  return request<T>(path, { method: 'GET', headers: { Accept: 'application/json' } }, timeoutMs);
}
