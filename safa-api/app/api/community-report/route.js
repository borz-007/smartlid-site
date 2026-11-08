import { NextResponse } from 'next/server';
import { CommunityError, createReport, validateReport } from '../../../lib/server/community.mjs';
import { getDb, StorageError } from '../../../lib/server/db.mjs';
import { clientIp, createRateLimiter } from '../../../lib/server/rateLimit.mjs';
import { readJsonBody } from '../../../lib/server/requestBody.mjs';
import { ValidationError } from '../../../lib/server/validate.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const limiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 20 });
const NO_STORE = { 'Cache-Control': 'no-store' };
const fail = (status, code, message, extra) => NextResponse.json({ error: { code, message } }, { status, headers: { ...NO_STORE, ...extra } });

export async function POST(request) {
  const rl = limiter.check(clientIp(request.headers));
  if (!rl.ok) return fail(429, 'rate_limited', 'Слишком много запросов. Повторите позже.', { 'Retry-After': String(rl.retryAfterSec) });

  const parsed = await readJsonBody(request, 1_600_000);
  if (parsed.error) return fail(parsed.error.status, parsed.error.code, parsed.error.message);

  try {
    const input = validateReport(parsed.body);
    const db = await getDb();
    const { id } = await createReport(db, input, { salt: process.env.REPORT_SALT ?? '' });
    return NextResponse.json({ ok: true, id }, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof ValidationError) return fail(400, 'bad_request', e.message);
    if (e instanceof CommunityError) return fail(e.status, e.code, e.message);
    if (e instanceof StorageError) return fail(503, 'storage_unavailable', e.message);
    console.error('[community-report] internal', e?.name ?? 'Error');
    return fail(503, 'storage_unavailable', 'Хранилище временно недоступно.');
  }
}
