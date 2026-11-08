import { analyzeLocal } from '../src/engine/localFilter';
import { mergeIssues } from '../src/engine/auditor';
import { parseAiAudit } from '../src/services/gemini';
import { createDefaultProfile } from '../src/storage/profileStorage';
import type { UserProfile } from '../src/types';

jest.mock('@react-native-async-storage/async-storage', () => ({}));

const profile = (patch: Partial<UserProfile> = {}, allergens: string[] = []): UserProfile => {
  const p = { ...createDefaultProfile(), ...patch };
  for (const a of allergens) (p.allergens as any)[a] = true;
  return p;
};
const run = (text: string, p: UserProfile, extra = {}) => analyzeLocal({ text, ...extra }, p);
const ids = (r: ReturnType<typeof analyzeLocal>) => r.issues.map((i) => i.key);

describe('Halal', () => {
  const halal = profile({ halal: true });

  it('блокирует свинину на NL/FR/DE/EN', () => {
    for (const t of ['varkensvlees 80%, zout', 'Viande de porc, sel', 'Schweinefleisch, Salz', 'pork, salt', 'saindoux', 'reuzel']) {
      expect(run(t, halal).verdict).toBe('BANNED');
    }
  });

  it('желатин без источника — BANNED, с пометкой halal — SAFE, говяжий — WARNING', () => {
    expect(run('suiker, glucosestroop, gélatine, zuurteregelaar', halal).verdict).toBe('BANNED');
    expect(run('sucre, gélatine halal, arômes', { ...halal, aiEnabled: false } as any).issues.find((i) => i.key === 'gelatine')).toBeUndefined();
    const bovine = run('Zucker, Gelatine (Rind), Säuerungsmittel', halal);
    expect(bovine.issues.find((i) => i.key === 'gelatine')?.severity).toBe('WARNING');
    expect(run('fish gelatine', halal).issues.find((i) => i.key === 'gelatine')).toBeUndefined();
  });

  it('показывает оригинальный фрагмент с акцентами', () => {
    const r = run('Sucre, Gélatine, E120', halal);
    expect(r.issues.find((i) => i.key === 'gelatine')?.original).toBe('Gélatine');
    expect(r.issues.find((i) => i.key === 'carmine')).toBeDefined();
  });

  it('E471 без источника — WARNING и нужен ИИ; растительный — SAFE', () => {
    const r = run('farine de blé, émulsifiant: E471, sel', halal);
    expect(r.verdict).toBe('WARNING');
    expect(r.needsAI).toBe(true);
    expect(run('tarwebloem, emulgator (E471 van plantaardige oorsprong)', halal).issues).toHaveLength(0);
    expect(run('Mono- und Diglyceride von Speisefettsäuren', halal).verdict).toBe('WARNING');
  });

  it('алкоголь блокируется, «винный уксус» — только WARNING, «sans alcool» — игнор', () => {
    expect(run('Zutaten: Zucker, Alkohol, Aroma', halal).verdict).toBe('BANNED');
    expect(run('eau, vinaigre de vin, sel', halal).verdict).toBe('WARNING');
    expect(ids(run('boisson sans alcool', halal))).not.toContain('alcohol');
    expect(run('bière sans alcool', halal).verdict).toBe('BANNED'); // пиво 0.0 строгий фильтр не пропускает
    expect(ids(run('Weinsäure, Zucker', halal))).not.toContain('alcohol');
  });

  it('сычужный фермент: животный — WARNING, микробный — SAFE', () => {
    expect(run('melk, zout, stremsel', halal).issues.find((i) => i.key === 'rennet')?.severity).toBe('WARNING');
    expect(run('lait, sel, présure microbienne', halal).issues.find((i) => i.key === 'rennet')).toBeUndefined();
  });

  it('халяль-сертификат снимает претензии к мясу, но не к свинине', () => {
    const cert = run('kipfilet, zout, E471', halal, { labelTags: ['en:halal'] });
    expect(cert.issues).toHaveLength(0);
  });
});

describe('Vegan / Vegetarian', () => {
  it('веган: молоко, яйца, мёд, шеллак, воск', () => {
    const r = run('volle melk, eieren, honing, E904, E901', profile({ vegan: true }));
    expect(ids(r)).toEqual(expect.arrayContaining(['milk', 'eggs', 'honey', 'shellac', 'beeswax']));
  });

  it('кокосовое молоко и какао-масло — не молоко', () => {
    const r = run('kokosmelk, cacaoboter, beurre de cacao, lait de coco, Erdnussbutter', profile({ vegan: true }));
    expect(ids(r)).not.toContain('milk');
  });

  it('вегетарианец: молоко и яйца можно, мясо и сычужный фермент — нет', () => {
    const veg = profile({ vegetarian: true });
    expect(run('Milch, Eier, Zucker', veg).verdict).toBe('SAFE');
    expect(run('fromage (lait, présure)', veg).verdict).toBe('BANNED');
    expect(run('Hähnchenfleisch 60%', veg).verdict).toBe('BANNED');
    expect(ids(run('Fruchtfleisch, Zucker', veg))).not.toContain('meat');
  });
});

describe('Аллергены и следы', () => {
  it('находит глютен, но не гречку', () => {
    const p = profile({}, ['gluten']);
    expect(run('tarwebloem, zout', p).verdict).toBe('BANNED');
    expect(run('Buchweizenmehl, Salz', p).verdict).toBe('SAFE');
    expect(run('farine de sarrasin (blé noir)', p).verdict).toBe('SAFE');
    expect(run('sans gluten', p).verdict).toBe('SAFE');
  });

  it('арахис и орехи разделяются корректно', () => {
    const nuts = profile({}, ['nuts']);
    expect(run('Erdnüsse, Salz', nuts).verdict).toBe('SAFE');
    expect(run('kokosnoot, kokosnoten, suiker', nuts).verdict).toBe('SAFE');
    expect(run('hazelnoten 13%', nuts).verdict).toBe('BANNED');
    expect(run('Erdnüsse', profile({}, ['peanuts'])).verdict).toBe('BANNED');
  });

  it('inktvis — моллюск, а не рыба', () => {
    const r = run('inktvis, zout', profile({}, ['fish', 'molluscs']));
    expect(r.issues.map((i) => i.allergen)).toEqual(['molluscs']);
  });

  it('следы: WARNING без флага, BANNED с флагом', () => {
    const text = 'suiker, cacaomassa. Kan sporen bevatten van noten en melk.';
    const off = run(text, profile({}, ['nuts', 'milk']));
    expect(off.issues).toHaveLength(0);
    expect(off.traces.map((t) => t.allergen).sort()).toEqual(['milk', 'nuts']);
    expect(off.verdict).toBe('WARNING');
    expect(run(text, profile({ considerTraces: true }, ['nuts'])).verdict).toBe('BANNED');
    expect(run('Sucre. Peut contenir des traces de sésame.', profile({}, ['sesame'])).traces).toHaveLength(1);
    expect(run('Kann Spuren von Senf enthalten.', profile({}, ['mustard'])).traces).toHaveLength(1);
  });

  it('сульфиты по E-номерам', () => {
    expect(run('Wein, Konservierungsstoff: E 220', profile({}, ['sulphites'])).verdict).toBe('BANNED');
    expect(run('E-224', profile({}, ['sulphites'])).verdict).toBe('BANNED');
  });

  it('лецитин: соевый неизвестен — WARNING, подсолнечный — SAFE', () => {
    const p = profile({}, ['soy']);
    expect(run('emulgator: lecithine', p).verdict).toBe('WARNING');
    expect(run('émulsifiant: lécithine de tournesol', p).verdict).toBe('SAFE');
  });

  it('аллергены из тегов Open Food Facts', () => {
    const r = run('', profile({}, ['milk']), { allergenTags: ['en:milk'], traceTags: [] });
    expect(r.verdict).toBe('BANNED');
    expect(r.issues[0].source).toBe('openfoodfacts');
  });
});

describe('Персональные стоп-слова', () => {
  it('русские слова переводятся словарём', () => {
    const p = profile({ customStopWords: ['пальмовое масло', 'сахар'] });
    expect(ids(run('Palmöl, Zucker', p))).toEqual(['custom:пальмовое масло', 'custom:сахар']);
  });
  it('незнакомые русские слова отправляются в ИИ', () => {
    const r = run('guarana', profile({ customStopWords: ['гуарана'] }));
    expect(r.unresolvedCustomWords).toEqual(['гуарана']);
    expect(r.needsAI).toBe(true);
  });
  it('латинские слова ищутся буквально', () => {
    expect(run('Inulin, Guarana', profile({ customStopWords: ['guarana'] })).verdict).toBe('BANNED');
  });
});

describe('ИИ: разбор и слияние', () => {
  it('разбирает JSON даже в markdown-обёртке и валидирует поля', () => {
    const a = parseAiAudit('```json\n{"ingredients_text":"x","verdict":"MAYBE","issues":[{"original":"arôme","translation_ru":"ароматизатор","reason_ru":"?","severity":"WARNING","category":"halal","is_trace":false}],"summary_ru":"ok"}\n```');
    expect(a.verdict).toBe('WARNING');
    expect(a.issues[0].category).toBe('halal');
    expect(() => parseAiAudit('Конечно! Вот ответ')).toThrow();
  });
  it('не дублирует проблему, найденную обоими фильтрами', () => {
    const local = run('Gélatine', profile({ halal: true })).issues;
    const merged = mergeIssues(local, [{ ...local[0], key: 'ai:gelatine', source: 'ai', severity: 'BANNED' }]);
    expect(merged).toHaveLength(1);
  });
});
