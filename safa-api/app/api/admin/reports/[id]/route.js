import { NextResponse } from 'next/server';
import { checkAdmin, decideReport, getReportImage } from '../../../../../lib/server/community.mjs';
import { getDb } from '../../../../../lib/server/db.mjs';
import { ValidationError } from '../../../../../lib/server/validate.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const ID_RE = /^[0-9a-f-]{36}$/i;
const err = (status, code, message) => NextResponse.json({ error: { code, message } }, { status, headers: NO_STORE });

function guard(request, id) {
  const auth = checkAdmin(request.headers, process.env.ADMIN_TOKEN);
  if (auth === 'disabled') return err(503, 'disabled', 'Модерация не настроена.');
  if (auth !== 'ok') return err(401, 'unauthorized', 'Нет доступа.');
  if (!ID_RE.test(id)) return err(400, 'bad_request', 'Неверный идентификатор.');
  return null;
}

/** Фото отчёта для модератора. */
export async function GET(request, { params }) {
  const { id } = await params;
  const denied = guard(request, id);
  if (denied) return denied;
  try {
    const img = await getReportImage(await getDb(), id);
    if (!img) return err(404, 'not_found', 'Отчёт не найден.');
    return new NextResponse(Buffer.from(img.base64, 'base64'), { headers: { ...NO_STORE, 'Content-Type': img.mimeType } });
  } catch {
    return err(503, 'storage_unavailable', 'Хранилище временно недоступно.');
  }
}

/** Решение модератора: POST {"decision": "approve" | "reject"}. */
export async function POST(request, { params }) {
  const { id } = await params;
  const denied = guard(request, id);
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    const updated = await decideReport(await getDb(), id, body?.decision);
    return updated ? NextResponse.json({ ok: true }, { headers: NO_STORE }) : err(404, 'not_found', 'Отчёт не найден или уже обработан.');
  } catch (e) {
    if (e instanceof ValidationError) return err(400, 'bad_request', e.message);
    return err(503, 'storage_unavailable', 'Хранилище временно недоступно.');
  }
}
