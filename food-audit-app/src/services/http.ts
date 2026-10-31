export class HttpError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'HttpError';
  }
}

/** fetch с таймаутом через AbortController. */
export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
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
