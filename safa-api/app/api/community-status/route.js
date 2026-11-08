import { NextResponse } from 'next/server';
import { getCommunityStatus } from '../../../lib/server/community.mjs';
import { getDb } from '../../../lib/server/db.mjs';
import { ValidationError, barcode } from '../../../lib/server/validate.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/** Подтверждённый модератором статус товара для всех пользователей: GET /api/community-status?barcode=... */
export async function GET(request) {
  try {
    const code = barcode(new URL(request.url).searchParams.get('barcode'));
    const db = await getDb();
    const status = await getCommunityStatus(db, code);
    return NextResponse.json(status, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
  } catch (e) {
    if (e instanceof ValidationError) return NextResponse.json({ error: { code: 'bad_request', message: e.message } }, { status: 400 });
    return NextResponse.json({ error: { code: 'storage_unavailable', message: 'Хранилище временно недоступно.' } }, { status: 503 });
  }
}
