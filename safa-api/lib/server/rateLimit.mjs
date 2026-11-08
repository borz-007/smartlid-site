/**
 * Простой счётчик запросов в памяти процесса (скользящее окно).
 * На serverless каждый экземпляр функции считает отдельно, поэтому это защита «от случайного
 * залпа», а не строгий лимит. Для строгого лимита нужно общее хранилище.
 */
export function createRateLimiter({ windowMs, max, now = Date.now }) {
  const hits = new Map();
  return {
    check(key) {
      const t = now();
      const arr = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
      if (arr.length >= max) {
        hits.set(key, arr);
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (t - arr[0])) / 1000)) };
      }
      arr.push(t);
      hits.set(key, arr);
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (v.every((x) => t - x >= windowMs)) hits.delete(k);
      }
      return { ok: true };
    },
  };
}

/** IP клиента из заголовков Vercel/прокси (первый адрес в x-forwarded-for). */
export function clientIp(headers) {
  const xff = headers.get('x-forwarded-for');
  return (xff ? xff.split(',')[0].trim() : headers.get('x-real-ip')) || 'unknown';
}
