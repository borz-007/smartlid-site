/**
 * Резервный поиск состава: безопасная загрузка страницы товара и извлечение блока ингредиентов.
 * Адреса приходят из результатов поиска Google, но каждый переход всё равно проверяется:
 * только https, только публичные адреса, ограничение размера и времени.
 */
import dns from 'node:dns/promises';
import net from 'node:net';

export class UnsafeUrlError extends Error {
  constructor(message = 'Небезопасный адрес') {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

function isPrivateIPv4(ip) {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

export function isPrivateAddress(addr) {
  const v = net.isIP(addr);
  if (v === 4) return isPrivateIPv4(addr);
  if (v !== 6) return true;
  const ip = addr.toLowerCase();
  if (ip === '::' || ip === '::1') return true;
  const mappedDotted = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
  if (mappedDotted) return isPrivateIPv4(mappedDotted[1]);
  const mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(ip);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    return isPrivateIPv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  return /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || ip.startsWith('ff');
}

const defaultLookup = (host) => dns.lookup(host, { all: true });

/** Проверяет адрес и возвращает URL, либо бросает UnsafeUrlError. */
export async function assertPublicUrl(urlStr, lookup = defaultLookup) {
  let u;
  try {
    u = new URL(urlStr);
  } catch {
    throw new UnsafeUrlError('Неверный адрес');
  }
  if (u.protocol !== 'https:') throw new UnsafeUrlError('Разрешён только https');
  if (u.username || u.password) throw new UnsafeUrlError('Адрес с логином запрещён');
  if (u.port && u.port !== '443') throw new UnsafeUrlError('Нестандартный порт запрещён');
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    ['.localhost', '.local', '.internal', '.lan', '.home'].some((s) => host.endsWith(s)) ||
    net.isIP(host)
  ) {
    throw new UnsafeUrlError('Адрес не публичный');
  }
  const addrs = await lookup(host);
  if (!addrs?.length || addrs.some((a) => isPrivateAddress(a.address))) throw new UnsafeUrlError('Адрес не публичный');
  return u;
}

async function readLimited(res, maxBytes) {
  if (!res.body?.getReader) return (await res.text()).slice(0, maxBytes);
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  while (total < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  reader.cancel().catch(() => {});
  return new TextDecoder('utf-8').decode(Buffer.concat(chunks.map((c) => Buffer.from(c))).subarray(0, maxBytes));
}

/** Загружает HTML-страницу, вручную проходя редиректы и проверяя каждый шаг. */
export async function fetchPage(urlStr, { fetchImpl = globalThis.fetch, lookup = defaultLookup, maxBytes = 1_500_000, timeoutMs = 6000, maxHops = 5 } = {}) {
  let current = urlStr;
  for (let hop = 0; hop <= maxHops; hop++) {
    const u = await assertPublicUrl(current, lookup);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(u.href, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { 'user-agent': 'SAFA-IngredientBot/1.0', accept: 'text/html,application/xhtml+xml' },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        res.body?.cancel?.().catch?.(() => {});
        if (!loc) throw new Error('redirect without location');
        current = new URL(loc, u).href;
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!/html|xml/i.test(res.headers.get('content-type') ?? '')) throw new Error('not html');
      return { url: u.href, html: await readLimited(res, maxBytes) };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('too many redirects');
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function htmlToText(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\s*br\s*\/?>|<\/(p|div|li|ul|ol|tr|td|th|h[1-6]|section|article|dd|dt)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : ' ';
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .join('\n');
}

const LABEL = /^(?:ingredi[eë]nt(?:en)?|ingr[ée]dients?|zutaten|zusammensetzung|samenstelling|composition)\b/i;
const STOP = /^(?:voedingswaarde|valeurs? nutritionnelles?|n[äa]hrwert|nutrition|allerg|bewaar|conservation|aufbewahrung|storage|bereiding|preparation|herkomst|origine|herkunft|gemiddelde)/i;

const separators = (s) => (s.match(/[,;]/g) ?? []).length;
const plausible = (s) => s.length >= 15 && s.length <= 1500 && separators(s) >= 2;

function fromJsonLd(html) {
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const stack = [JSON.parse(m[1])];
      while (stack.length) {
        const node = stack.pop();
        if (Array.isArray(node)) stack.push(...node);
        else if (node && typeof node === 'object') {
          const v = node.ingredients ?? node.recipeIngredient;
          const s = Array.isArray(v) ? v.join(', ') : typeof v === 'string' ? v : '';
          if (plausible(s)) return s.trim();
          stack.push(...Object.values(node));
        }
      }
    } catch {
      /* битый JSON-LD пропускаем */
    }
  }
  return null;
}

/** Достаёт блок «Ingrediënten / Ingrédients / Zutaten …» из HTML страницы товара. */
export function extractIngredientBlock(html) {
  const ld = fromJsonLd(html);
  if (ld) return ld;

  const lines = htmlToText(html).split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!LABEL.test(lines[i])) continue;
    const first = lines[i].replace(LABEL, '').replace(/^[\s:：-]+/, '');
    let parts = first ? [first] : [];
    const joinedHasList = () => separators(parts.join(' ')) >= 2;
    if (!(first && joinedHasList() && !/[,;]$/.test(first))) {
      for (let j = i + 1; j < lines.length && j <= i + 4; j++) {
        const line = lines[j];
        if (!line || STOP.test(line) || LABEL.test(line)) break;
        parts.push(line);
        if (joinedHasList() && !/[,;]$/.test(line)) break;
      }
    }
    const candidate = parts.join(' ').replace(/\s+/g, ' ').trim();
    if (plausible(candidate)) return candidate;
  }
  return null;
}

/** Доля «значимых» слов состава, найденных в тексте страницы (0..1). */
export function corroboration(ingredientsText, pageHtml) {
  const words = (String(ingredientsText).toLowerCase().match(/[\p{L}]{4,}/gu) ?? []).slice(0, 60);
  if (!words.length) return 0;
  const page = htmlToText(pageHtml).toLowerCase();
  return words.filter((w) => page.includes(w)).length / words.length;
}
