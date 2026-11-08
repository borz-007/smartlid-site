import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CommunityError, checkAdmin, createReport, decideReport, getCommunityStatus, getReportImage, listReports, validateReport } from '../lib/server/community.mjs';
import { ValidationError } from '../lib/server/validate.mjs';
import { fakeDb } from './helpers.mjs';

const body = (over = {}) => ({ kind: 'haram', barcode: '4335619128279', deviceId: 'device-id-0123456789', image: 'QUJDREVG', mimeType: 'image/jpeg', productName: 'Yogo Drink', ...over });

test('отчёт проверяется и сохраняется со статусом pending', async () => {
  const db = fakeDb();
  const { id } = await createReport(db, validateReport(body()), { makeId: () => '11111111-1111-1111-1111-111111111111', salt: 's' });
  assert.equal(id, '11111111-1111-1111-1111-111111111111');
  const pending = await listReports(db, { status: 'pending' });
  assert.equal(pending.length, 1);
  assert.equal(pending[0].imageUrl, '/api/admin/reports/11111111-1111-1111-1111-111111111111');
  assert.ok(!('imageBase64' in pending[0]) && !('deviceHash' in pending[0]));
  assert.deepEqual(await getReportImage(db, id), { mimeType: 'image/jpeg', base64: 'QUJDREVG' });
});

test('неподтверждённые отчёты не влияют на статус; после approve — влияют', async () => {
  const db = fakeDb();
  const { id } = await createReport(db, validateReport(body()), { makeId: () => '22222222-2222-2222-2222-222222222222' });
  assert.equal((await getCommunityStatus(db, '4335619128279')).status, 'none');
  assert.equal(await decideReport(db, id, 'approve'), true);
  assert.deepEqual(await getCommunityStatus(db, '4335619128279'), { barcode: '4335619128279', status: 'haram', haram: 1, halal: 0 });
  assert.equal(await decideReport(db, id, 'reject'), false, 'повторное решение не применяется');
});

test('противоречивые подтверждённые отчёты дают disputed, отклонённые не считаются', async () => {
  const db = fakeDb();
  const a = await createReport(db, validateReport(body({ deviceId: 'device-aaaaaaaaaaaaaaaa' })));
  const b = await createReport(db, validateReport(body({ kind: 'halal', deviceId: 'device-bbbbbbbbbbbbbbbb' })));
  const c = await createReport(db, validateReport(body({ deviceId: 'device-cccccccccccccccc' })));
  await decideReport(db, a.id, 'approve');
  await decideReport(db, b.id, 'approve');
  await decideReport(db, c.id, 'reject');
  const s = await getCommunityStatus(db, '4335619128279');
  assert.equal(s.status, 'disputed');
  assert.equal(s.haram, 1);
});

test('повтор того же отчёта и превышение суточного лимита блокируются', async () => {
  const db = fakeDb();
  await createReport(db, validateReport(body()));
  await assert.rejects(createReport(db, validateReport(body())), (e) => e instanceof CommunityError && e.status === 409);
  for (let i = 0; i < 9; i++) await createReport(db, validateReport(body({ barcode: String(40000000 + i) })));
  await assert.rejects(createReport(db, validateReport(body({ barcode: '99999999' }))), (e) => e instanceof CommunityError && e.status === 429);
});

test('некорректные отчёты отклоняются', () => {
  for (const over of [{ kind: 'maybe' }, { barcode: 'abc' }, { deviceId: 'short' }, { image: '!!!' }, { mimeType: 'text/html' }, { image: 'A'.repeat(900_001) }, { image: undefined }]) {
    assert.throws(() => validateReport(body(over)), ValidationError, JSON.stringify(over).slice(0, 40));
  }
  assert.throws(() => validateReport(null), ValidationError);
});

test('доступ модератора: токен не задан -> disabled, неверный -> denied', () => {
  const h = (v) => new Headers(v ? { authorization: v } : {});
  assert.equal(checkAdmin(h('Bearer x'), undefined), 'disabled');
  assert.equal(checkAdmin(h(), 'secret'), 'denied');
  assert.equal(checkAdmin(h('Bearer nope'), 'secret'), 'denied');
  assert.equal(checkAdmin(h('Bearer secret'), 'secret'), 'ok');
});

test('решение должно быть approve или reject', async () => {
  await assert.rejects(decideReport(fakeDb(), 'x', 'delete'), ValidationError);
});
