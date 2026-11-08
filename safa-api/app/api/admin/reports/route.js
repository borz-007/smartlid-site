import { NextResponse } from 'next/server';
import { checkAdmin, listReports } from '../../../../lib/server/community.mjs';
import { getDb } from '../../../../lib/server/db.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

/** Модерация: GET /api/admin/reports?status=pending  (заголовок Authorization: Bearer <ADMIN_TOKEN>) */
export async function GET(request) {
  const auth = checkAdmin(request.headers, process.env.ADMIN_TOKEN);
  if (auth === 'disabled') return NextResponse.json({ error: { code: 'disabled', message: 'Модерация не настроена.' } }, { status: 503, headers: NO_STORE });
  if (auth !== 'ok') return NextResponse.json({ error: { code: 'unauthorized', message: 'Нет доступа.' } }, { status: 401, headers: NO_STORE });

  const params = new URL(request.url).searchParams;
  const status = ['pending', 'approved', 'rejected'].includes(params.get('status')) ? params.get('status') : 'pending';
  try {
    const items = await listReports(await getDb(), { status, limit: Number(params.get('limit')) || 50 });
    return NextResponse.json({ items }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: { code: 'storage_unavailable', message: 'Хранилище временно недоступно.' } }, { status: 503, headers: NO_STORE });
  }
}
