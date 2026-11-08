import { buildAuditImageBody, buildAuditTextBody, buildExpiryBody } from './aiPrompts.mjs';
import { AiError, candidateText, generate } from './geminiClient.mjs';
import { findProduct } from './productSearch.mjs';
import { ValidationError, validateAuditRequest } from './validate.mjs';

const ok = (body) => ({ status: 200, body });

/** Любая ошибка -> безопасный ответ клиенту. Сырой текст Google и ключ наружу не попадают. */
export function errorResponse(e, { debug = false, log = console.error } = {}) {
  if (e instanceof ValidationError) {
    return { status: 400, body: { error: { code: 'bad_request', message: e.message } } };
  }
  if (e instanceof AiError) {
    log('[ingredient-audit]', e.code, e.upstreamStatus ?? '', e.detail ?? '');
    const error = { code: e.code, message: e.message };
    if (e.retryAfterSec) error.retryAfterSec = e.retryAfterSec;
    if (debug && e.detail) error.detail = e.detail;
    return { status: e.status, body: { error }, headers: e.status === 429 ? { 'Retry-After': String(e.retryAfterSec ?? 60) } : undefined };
  }
  log('[ingredient-audit] internal', e?.name ?? 'Error');
  return { status: 500, body: { error: { code: 'internal', message: 'Внутренняя ошибка сервера.' } } };
}

/**
 * @param rawBody тело запроса (уже распарсенный JSON)
 * @param deps { apiKey, model, fallbackModel, debug, fetchImpl?, fetchPageImpl?, retryDelaysMs?, sleep?, log? }
 */
export async function handleAudit(rawBody, deps) {
  try {
    const req = validateAuditRequest(rawBody);
    const gemini = {
      apiKey: deps.apiKey,
      model: deps.model,
      fallbackModel: deps.fallbackModel,
      fetchImpl: deps.fetchImpl,
      retryDelaysMs: deps.retryDelaysMs,
      sleep: deps.sleep,
    };
    switch (req.action) {
      case 'audit-text': {
        const json = await generate({ ...gemini, body: buildAuditTextBody(req.text, req.profile, req.ctx) });
        return ok({ text: candidateText(json) });
      }
      case 'audit-image': {
        const json = await generate({ ...gemini, body: buildAuditImageBody(req.image.data, req.image.mimeType, req.profile, req.ctx) });
        return ok({ text: candidateText(json) });
      }
      case 'expiry': {
        const json = await generate({ ...gemini, body: buildExpiryBody(req.image.data, req.image.mimeType) });
        return ok({ text: candidateText(json) });
      }
      case 'find-product':
        return ok(await findProduct(req, { gemini, fetchPageImpl: deps.fetchPageImpl }));
      default:
        throw new ValidationError('Неизвестное действие.');
    }
  } catch (e) {
    return errorResponse(e, deps);
  }
}
