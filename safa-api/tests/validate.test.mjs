import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ValidationError, validateAuditRequest } from '../lib/server/validate.mjs';

const profile = { halal: true, allergens: [{ id: 'milk', label: 'Молоко' }], customStopWords: [] };

test('корректные запросы проходят и нормализуются', () => {
  const r = validateAuditRequest({ action: 'audit-text', text: '  suiker, melk ', profile, context: { barcode: '4335619128279', countries: ['en:belgium'] } });
  assert.equal(r.text, 'suiker, melk');
  assert.equal(r.profile.halal, true);
  assert.equal(r.profile.vegan, false);
  assert.equal(r.ctx.barcode, '4335619128279');
  assert.equal(validateAuditRequest({ action: 'find-product', barcode: '4335619128279', brand: 'Milbona' }).brand, 'Milbona');
  assert.equal(validateAuditRequest({ action: 'expiry', image: 'QUJD' }).image.mimeType, 'image/jpeg');
});

test('некорректные запросы отклоняются', () => {
  const bad = [
    null, [], {}, { action: 'drop-tables' },
    { action: 'audit-text', text: 'x'.repeat(6001), profile },
    { action: 'audit-text', text: 'x' },
    { action: 'audit-text', text: 'x', profile: { allergens: [{ id: 'unobtainium' }] } },
    { action: 'audit-text', text: 'x', profile: { allergens: [], customStopWords: Array(31).fill('a') } },
    { action: 'find-product', barcode: '12ab' },
    { action: 'expiry', image: 'not base64!!' },
    { action: 'expiry', image: 'QUJD', mimeType: 'text/html' },
    { action: 'expiry', image: 'A'.repeat(1_500_001) },
  ];
  for (const b of bad) assert.throws(() => validateAuditRequest(b), ValidationError, JSON.stringify(b)?.slice(0, 60));
});

import { isIsolatedDbName } from '../lib/server/db.mjs';

test('база SAFA изолирована: имя обязано содержать safa', () => {
  assert.ok(isIsolatedDbName('safa'));
  assert.ok(isIsolatedDbName('SAFA_prod'));
  assert.ok(!isIsolatedDbName('smartlid'));
  assert.ok(!isIsolatedDbName('your_database_name'));
  assert.ok(!isIsolatedDbName(undefined));
  assert.ok(!isIsolatedDbName(''));
});
