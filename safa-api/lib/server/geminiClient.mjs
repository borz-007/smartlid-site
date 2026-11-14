/**
 * Серверный клиент Gemini. Ключ приходит только из process.env.GEMINI_API_KEY (его передаёт route),
 * уходит только заголовком x-goog-api-key и никогда не попадает ни в ответ клиенту, ни в логи.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export class AiError extends Error {
  /**
   * @param {{status:number, code:string, message:string, retryAfterSec?:number, upstreamStatus?:number, detail?:string}} p
   * status — HTTP-статус нашего ответа клиенту; upstreamStatus — статус Google.
   */
  constructor({ status, code, message, retryAfterSec, upstreamStatus, detail }) {
    super(message);
    this.name = 'AiError';
    this.status = status;
    this.code = code;
    this.retryAfterSec = retryAfterSec;
    this.upstreamStatus = upstreamStatus;
    this.detail = detail;
  }
}

/** Вырезает ключ и всё, что на него похоже, из строки для логов/отладки. */
export function redact(text, apiKey) {
  let out = String(text ?? '');
  if (apiKey) out = out.split(apiKey).join('[key]');
  return out.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[key]');
}

function quotaInfo(body) {
  const details = Array.isArray(body?.error?.details) ? body.error.details : [];
  let ids = '';
  let retryAfterSec;
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

/** Ответ Google с ошибкой -> безопасная AiError. Сырой текст Google в message не попадает. */
export function mapUpstreamError(upstreamStatus, body, { model, apiKey } = {}) {
  const gStatus = typeof body?.error?.status === 'string' && /^[A-Z_]{3,40}$/.test(body.error.status) ? ` ${body.error.status}` : '';
  const detail = redact(`[HTTP ${upstreamStatus}${gStatus}${model ? `, модель ${model}` : ''}] ${String(body?.error?.message ?? '').slice(0, 300)}`, apiKey);
  const base = { upstreamStatus, detail };

  if (upstreamStatus === 429) {
    const { kind, retryAfterSec } = quotaInfo(body);
    const message =
      kind === 'day'
        ? 'Дневной лимит запросов к ИИ исчерпан. Попробуйте завтра.'
        : kind === 'minute'
          ? `Слишком много запросов к ИИ. ${retryAfterSec && retryAfterSec <= 600 ? `Повторите через ${retryAfterSec} с.` : 'Подождите минуту и повторите.'}`
          : 'Лимит запросов к ИИ исчерпан. Попробуйте позже.';
    return new AiError({ ...base, status: 429, code: 'quota', message, retryAfterSec });
  }
  if (upstreamStatus === 400 || upstreamStatus === 401 || upstreamStatus === 403) {
    return new AiError({ ...base, status: 502, code: 'upstream_rejected', message: 'Сервис ИИ сейчас недоступен (ошибка настройки сервера).' });
  }
  if (upstreamStatus === 404) {
    return new AiError({ ...base, status: 502, code: 'model_unavailable', message: 'Выбранная модель ИИ недоступна на сервере.' });
  }
  if (upstreamStatus >= 500) {
    return new AiError({ ...base, status: 503, code: 'upstream_unavailable', message: 'Сервис ИИ временно перегружен или недоступен. Попробуйте позже.' });
  }
  return new AiError({ ...base, status: 502, code: 'upstream_error', message: 'Ошибка сервиса ИИ.' });
}

export function candidateText(json) {
  return (json?.candidates?.[0]?.content?.parts ?? []).map((p) => p?.text ?? '').join('');
}

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isRetryable = (e) => e instanceof AiError && (e.code === 'upstream_unavailable' || e.code === 'upstream_network');
// Тайм-аут не повторяем на той же модели (это съест весь бюджет), но запасной модели даём шанс.
const isFallbackWorthy = (e) => isRetryable(e) || (e instanceof AiError && (e.code === 'model_unavailable' || e.code === 'upstream_timeout'));

/**
 * Вызов generateContent с повтором при 5xx/обрыве сети и запасной моделью при 5xx/404.
 * Общий бюджет времени ограничен deadlineMs, чтобы уложиться в maxDuration функции.
 */
export async function generate({
  apiKey,
  model,
  fallbackModel,
  body,
  fetchImpl = globalThis.fetch,
  retryDelaysMs = [800, 1600],
  timeoutMs = 25000,
  deadlineMs = 50000,
  sleep = defaultSleep,
  now = Date.now,
}) {
  if (!apiKey) throw new AiError({ status: 503, code: 'not_configured', message: 'На сервере не настроен ключ ИИ.' });
  if (!model) throw new AiError({ status: 503, code: 'not_configured', message: 'На сервере не задана модель ИИ.' });

  const started = now();
  const remaining = () => deadlineMs - (now() - started);
  const models = [model, ...(fallbackModel && fallbackModel !== model ? [fallbackModel] : [])];

  async function once(m) {
    const budget = Math.min(timeoutMs, remaining());
    if (budget < 1000) throw new AiError({ status: 504, code: 'upstream_timeout', message: 'ИИ слишком долго отвечает. Попробуйте ещё раз.' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), budget);
    let res;
    try {
      res = await fetchImpl(`${API_BASE}/${encodeURIComponent(m)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (e) {
      if (e?.name === 'AbortError') throw new AiError({ status: 504, code: 'upstream_timeout', message: 'ИИ слишком долго отвечает. Попробуйте ещё раз.' });
      throw new AiError({ status: 502, code: 'upstream_network', message: 'Не удалось связаться с сервисом ИИ.', detail: redact(e?.message, apiKey) });
    } finally {
      clearTimeout(timer);
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw mapUpstreamError(res.status, json, { model: m, apiKey });
    const reason = json?.promptFeedback?.blockReason;
    if (reason) {
      const safe = /^[A-Z_]{3,40}$/.test(String(reason)) ? ` (${reason})` : '';
      throw new AiError({ status: 422, code: 'blocked', message: `Сервис ИИ отклонил запрос${safe}.` });
    }
    return json;
  }

  let lastError;
  for (const m of models) {
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          return await once(m);
        } catch (e) {
          if (!isRetryable(e) || attempt >= retryDelaysMs.length || remaining() < retryDelaysMs[attempt] + 1000) throw e;
          await sleep(retryDelaysMs[attempt]);
        }
      }
    } catch (e) {
      lastError = e;
      if (!isFallbackWorthy(e)) throw e;
    }
  }
  throw lastError;
}
