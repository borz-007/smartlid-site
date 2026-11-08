export class HttpError extends Error {
  constructor(message: string, public status?: number, public retryAfterSec?: number) {
    super(message);
    this.name = 'HttpError';
  }
}

/**
 * Текст ошибки, который можно показать пользователю. Показываем только сообщения
 * HttpError (они формируются в коде и не содержат ответов сервера); любые другие
 * исключения заменяются на запасной текст.
 */
export function userMessage(e: unknown, fallback: string): string {
  return e instanceof HttpError && e.message ? e.message : fallback;
}

/** fetch с таймаутом через AbortController. Только HTTPS. */
export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
  if (!/^https:\/\//i.test(url)) throw new HttpError('Небезопасное соединение запрещено: разрешён только HTTPS');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new HttpError('Превышено время ожидания ответа сервера');
    throw new HttpError('Нет соединения с сервером');
  } finally {
    clearTimeout(timer);
  }
}
