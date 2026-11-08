/** Краудсорсинг: отчёты пользователей «это не халяль» / «подтвердить халяль» + модерация. */
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { ValidationError, barcode as vBarcode, image as vImage, LIMITS, str } from './validate.mjs';

export class CommunityError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'CommunityError';
    this.status = status;
    this.code = code;
  }
}

const COLLECTION = 'community_reports';
const DEVICE_RE = /^[A-Za-z0-9_-]{16,64}$/;
const KINDS = ['haram', 'halal'];
const MAX_PER_DAY = 10;

export function hashDevice(deviceId, salt = '') {
  return createHash('sha256').update(`${salt}:${deviceId}`).digest('hex');
}

export function validateReport(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError();
  if (!KINDS.includes(body.kind)) throw new ValidationError('Неизвестный тип отчёта.');
  const deviceId = str(body.deviceId, 64, { required: true, field: 'устройство' });
  if (!DEVICE_RE.test(deviceId)) throw new ValidationError('Неверный идентификатор устройства.');
  return {
    kind: body.kind,
    barcode: vBarcode(body.barcode),
    productName: str(body.productName, 160, { field: 'название' }),
    note: str(body.note, 300, { field: 'комментарий' }),
    image: vImage(body.image, body.mimeType, LIMITS.reportImageChars),
    deviceId,
  };
}

export async function createReport(db, input, { salt = '', now = new Date(), makeId = randomUUID } = {}) {
  const col = db.collection(COLLECTION);
  const deviceHash = hashDevice(input.deviceId, salt);
  const since = new Date(now.getTime() - 24 * 3600 * 1000);
  if ((await col.countDocuments({ deviceHash, createdAt: { $gte: since } })) >= MAX_PER_DAY) {
    throw new CommunityError(429, 'report_limit', 'Слишком много отчётов за сутки. Попробуйте завтра.');
  }
  if ((await col.countDocuments({ deviceHash, barcode: input.barcode, kind: input.kind })) > 0) {
    throw new CommunityError(409, 'duplicate', 'Вы уже отправляли такой отчёт по этому товару.');
  }
  const doc = {
    id: makeId(),
    barcode: input.barcode,
    kind: input.kind,
    status: 'pending',
    productName: input.productName,
    note: input.note,
    imageMime: input.image.mimeType,
    imageBase64: input.image.data,
    deviceHash,
    createdAt: now,
  };
  await col.insertOne(doc);
  return { id: doc.id };
}

/** Статус по подтверждённым модератором отчётам. Неподтверждённые никого не затрагивают. */
export async function getCommunityStatus(db, barcode) {
  const col = db.collection(COLLECTION);
  const [haram, halal] = await Promise.all([
    col.countDocuments({ barcode, status: 'approved', kind: 'haram' }),
    col.countDocuments({ barcode, status: 'approved', kind: 'halal' }),
  ]);
  const status = haram && halal ? 'disputed' : haram ? 'haram' : halal ? 'halal' : 'none';
  return { barcode, status, haram, halal };
}

export async function listReports(db, { status = 'pending', limit = 50 } = {}) {
  const rows = await db
    .collection(COLLECTION)
    .find({ status }, { projection: { imageBase64: 0, deviceHash: 0, _id: 0 } })
    .sort({ createdAt: 1 })
    .limit(Math.min(Math.max(1, limit), 200))
    .toArray();
  return rows.map((r) => ({
    id: r.id,
    barcode: r.barcode,
    kind: r.kind,
    status: r.status,
    productName: r.productName,
    note: r.note,
    createdAt: r.createdAt,
    imageUrl: `/api/admin/reports/${r.id}`,
  }));
}

export async function getReportImage(db, id) {
  const r = await db.collection(COLLECTION).findOne({ id });
  return r ? { mimeType: r.imageMime, base64: r.imageBase64 } : null;
}

export async function decideReport(db, id, decision, now = new Date()) {
  if (!['approve', 'reject'].includes(decision)) throw new ValidationError('Неизвестное решение.');
  const res = await db
    .collection(COLLECTION)
    .updateOne({ id, status: 'pending' }, { $set: { status: decision === 'approve' ? 'approved' : 'rejected', decidedAt: now } });
  return res.matchedCount > 0;
}

/** 'ok' | 'disabled' (токен не задан на сервере) | 'denied'. */
export function checkAdmin(headers, token) {
  if (!token) return 'disabled';
  const given = (headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  const h = (s) => createHash('sha256').update(s).digest();
  return timingSafeEqual(h(given), h(token)) ? 'ok' : 'denied';
}
