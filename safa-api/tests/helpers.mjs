export const KEY = ['AI', 'zaFAKE-server-key-0123456789abcdefghij'].join('');

export const jsonRes = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const geminiOk = (text, extra = {}) => ({ candidates: [{ content: { parts: [{ text }] }, ...extra }] });

/** Минимальная имитация коллекций MongoDB для тестов. */
export function fakeDb() {
  const store = new Map();
  const matches = (doc, filter) =>
    Object.entries(filter).every(([k, v]) =>
      v && typeof v === 'object' && !(v instanceof Date) && '$gte' in v ? doc[k] >= v.$gte : doc[k] === v);
  return {
    collection(name) {
      if (!store.has(name)) store.set(name, []);
      const docs = store.get(name);
      return {
        insertOne: async (d) => void docs.push({ ...d }),
        countDocuments: async (f = {}) => docs.filter((d) => matches(d, f)).length,
        findOne: async (f) => docs.find((d) => matches(d, f)) ?? null,
        find: (f = {}) => {
          let rows = docs.filter((d) => matches(d, f));
          const cur = {
            sort: (s) => {
              const [[k, dir]] = Object.entries(s);
              rows = [...rows].sort((a, b) => (a[k] > b[k] ? dir : -dir));
              return cur;
            },
            limit: (n) => ((rows = rows.slice(0, n)), cur),
            toArray: async () => rows.map((r) => ({ ...r })),
          };
          return cur;
        },
        updateOne: async (f, u) => {
          const d = docs.find((x) => matches(x, f));
          if (d) Object.assign(d, u.$set);
          return { matchedCount: d ? 1 : 0 };
        },
      };
    },
  };
}
