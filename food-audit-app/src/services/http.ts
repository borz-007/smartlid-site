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

/**
 * Из тела 429 берём только тип лимита (в минуту / в сутки) и задержку повтора.
 * Сам текст ответа и идентификаторы квот наружу не выводятся.
 */
function quotaInfo(body: any): { kind: 'day' | 'minute' | 'unknown'; retryAfterSec?: number } {
  const details: any[] = Array.isArray(body?.error?.details) ? body.error.details : [];
  let ids = '';
  let retryAfterSec: number | undefined;
  for (const d of details) {
    if (Array.isArray(d?.violations)) {
      for (const v of d.violations) ids += ` ${String(v?.quotaId ?? '')} ${String(v?.quotaMetric ?? '')}`;
    }
    const m = typeof d?.retryDelay === 'string' ? /^(\d+(?:\.\d+)?)s$/.exec(d.retryDelay) : null;
    if (m) retryAfterSec = Math.ceil(Number(m[1]));
  }
  const kind = /perday/i.test(ids) ? 'day' : /perminute/i.test(ids) ? 'minute' : 'unknown';
  return { kind, retryAfterSec };
}

/** Безопасное сообщение по HTTP-статусу Gemini: без сырого текста ответа сервера. */
export function geminiHttpError(status: number, body?: unknown): HttpError {
  let message: string;
  if (status === 429) {
    const { kind, retryAfterSec } = quotaInfo(body);
    if (kind === 'day') {
      message = 'Исчерпан дневной лимит запросов Gemini. Проверьте квоту ключа в Google AI Studio.';
    } else if (kind === 'minute') {
      message =
        'Слишком много запросов к Gemini за минуту. ' +
        (retryAfterSec && retryAfterSec <= 600 ? `Повторите через ${retryAfterSec} с.` : 'Подождите минуту и повторите.');
    } else {
      message = 'Лимит запросов Gemini исчерпан или недоступен для вашего ключа. Проверьте квоту в Google AI Studio.';
    }
    return new HttpError(message, status, retryAfterSec);
  } else if (status === 400 || status === 401 || status === 403)
    message = 'Gemini отклонил запрос. Проверьте ключ API и его ограничения.';
  else if (status === 404) message = 'Выбранная модель Gemini недоступна.';
  else if (status >= 500) message = 'Сервис Gemini временно недоступен. Попробуйте позже.';
  else message = `Ошибка Gemini (HTTP ${status}).`;
  return new HttpError(message, status);
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
