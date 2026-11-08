import { NextResponse } from 'next/server';
import { handleAudit } from '../../../lib/server/auditHandler.mjs';
import { clientIp, createRateLimiter } from '../../../lib/server/rateLimit.mjs';
import { readJsonBody } from '../../../lib/server/requestBody.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const limiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 40 });
const NO_STORE = { 'Cache-Control': 'no-store' };

/** Проверка, что сервер на связи и ключ задан (сам ключ не показывается). */
export async function GET() {
  return NextResponse.json({ ok: true, aiConfigured: Boolean(process.env.GEMINI_API_KEY) }, { headers: NO_STORE });
}

export async function POST(request) {
  const rl = limiter.check(clientIp(request.headers));
  if (!rl.ok) {
    return NextResponse.json(
      { error: { code: 'rate_limited', message: 'Слишком много запросов. Повторите позже.', retryAfterSec: rl.retryAfterSec } },
      { status: 429, headers: { ...NO_STORE, 'Retry-After': String(rl.retryAfterSec) } },
    );
  }
  const parsed = await readJsonBody(request, 3_000_000);
  if (parsed.error) {
    const { status, ...error } = parsed.error;
    return NextResponse.json({ error }, { status, headers: NO_STORE });
  }

  const result = await handleAudit(parsed.body, {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    fallbackModel: process.env.GEMINI_FALLBACK_MODEL || undefined,
    debug: process.env.AI_DEBUG_ERRORS === '1',
  });
  return NextResponse.json(result.body, { status: result.status, headers: { ...NO_STORE, ...(result.headers ?? {}) } });
}
