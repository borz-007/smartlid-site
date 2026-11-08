import assert from 'node:assert/strict';
import net from 'node:net';
import dnsPromises from 'node:dns/promises';
import { test } from 'node:test';
import { fetchPage } from '../lib/server/siteFetch.mjs';
import { getDb, StorageError } from '../lib/server/db.mjs';

test('тесты изолированы: серверные переменные окружения удалены', () => {
  for (const k of ['GEMINI_API_KEY', 'MONGO_URL', 'DB_NAME', 'ADMIN_TOKEN']) assert.equal(process.env[k], undefined, k);
});

test('настоящий fetch, DNS и TCP заблокированы', async () => {
  await assert.rejects(fetch('https://example.com'), /Сеть отключена/);
  await assert.rejects(dnsPromises.lookup('example.com'), /Сеть отключена/);
  assert.throws(() => new net.Socket().connect(80, '127.0.0.1'), /Сеть отключена/);
});

test('код по умолчанию (без подмен) не может случайно выйти в сеть', async () => {
  await assert.rejects(fetchPage('https://example.com/'), /Сеть отключена/);
});

test('база не используется без настроек: понятная ошибка хранилища, без обращения к серверу БД', async () => {
  await assert.rejects(getDb(), StorageError);
});
