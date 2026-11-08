/**
 * Подгружается перед каждым тестовым процессом (`node --import`): тесты hermetic.
 * - сеть закрыта: fetch, DNS и TCP-соединения бросают ошибку, а не уходят наружу;
 * - переменные окружения сервера удалены: тест не зависит ни от ключей, ни от базы на машине разработчика или в CI.
 * Внешние зависимости в тестах подменяются внедрением (fetchImpl, lookup, fake db), а не настоящими сервисами.
 */
import dns from 'node:dns';
import dnsPromises from 'node:dns/promises';
import net from 'node:net';

const SERVER_ENV = ['GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_FALLBACK_MODEL', 'AI_DEBUG_ERRORS', 'MONGO_URL', 'DB_NAME', 'ADMIN_TOKEN', 'REPORT_SALT'];
for (const k of SERVER_ENV) delete process.env[k];

const fail = (what) => {
  throw new Error(`Сеть отключена в тестах (${what}): подмените зависимость через fetchImpl / lookup / fake db`);
};

globalThis.fetch = async () => fail('fetch');
dns.lookup = () => fail('dns.lookup');
dnsPromises.lookup = async () => fail('dns/promises.lookup');
net.Socket.prototype.connect = function () {
  return fail('net.Socket.connect');
};
