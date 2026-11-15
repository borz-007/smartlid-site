import { cleanOcrText, extractIngredientsBlock } from '../src/engine/ocrText';
import { analyzeLocal } from '../src/engine/localFilter';
import { createDefaultProfile } from '../src/storage/profileStorage';

jest.mock('@react-native-async-storage/async-storage', () => ({}));

describe('cleanOcrText', () => {
  it('склеивает переносы слов и строки', () => {
    expect(cleanOcrText('suiker, gela-\ntine, water')).toBe('suiker, gelatine, water');
    expect(cleanOcrText('water,\nsuiker,\nmelkpoeder')).toBe('water, suiker, melkpoeder');
  });

  it('не склеивает «mono- en diglyceriden»', () => {
    expect(cleanOcrText('mono-\nen diglyceriden')).toBe('mono- en diglyceriden');
  });

  it('нормализует E-номера: E 471, E-471, E.471', () => {
    expect(cleanOcrText('emulgator (E 471), kleurstof E-120, E.330, E160a')).toBe('emulgator (E471), kleurstof E120, E330, E160a');
  });

  it('не трогает слова, начинающиеся на E, и обычные числа', () => {
    expect(cleanOcrText('Eieren 12 stuks, Energie 100 kJ')).toBe('Eieren 12 stuks, Energie 100 kJ');
  });

  it('убирает мусорные символы и пробелы перед знаками', () => {
    expect(cleanOcrText('water ,  suiker |  zout .')).toBe('water, suiker zout.');
  });

  it('пустой и не строковый ввод не ломают функцию', () => {
    expect(cleanOcrText('')).toBe('');
    expect(cleanOcrText(undefined as unknown as string)).toBe('');
  });
});

describe('extractIngredientsBlock', () => {
  const NL = [
    'Pinky Donuts',
    'Ingrediënten: tarwebloem, suiker, palmvet,',
    'gela-',
    'tine, emulgator (E 471), kleurstof E-120.',
    'Kan sporen van noten bevatten.',
    'Gemiddelde voedingswaarde per 100 g',
    'Energie 1500 kJ',
    'Bewaren op een koele plaats.',
  ].join('\n');

  it('берёт блок после заголовка до таблицы пищевой ценности', () => {
    const r = extractIngredientsBlock(NL);
    expect(r.headerFound).toBe(true);
    expect(r.text).toContain('tarwebloem, suiker, palmvet, gelatine, emulgator (E471), kleurstof E120');
    expect(r.text).not.toMatch(/Energie|Pinky|Bewaren/);
  });

  it('сохраняет предложение о следах', () => {
    expect(extractIngredientsBlock(NL).text).toMatch(/Kan sporen van noten bevatten/i);
  });

  it('сохраняет предложение о следах, которое стоит после таблицы', () => {
    const t = 'Zutaten: Zucker, Weizenmehl, Gelatine.\nNährwerte pro 100 g: Energie 1500 kJ\nKann Spuren von Milch enthalten.';
    const r = extractIngredientsBlock(t);
    expect(r.text).toMatch(/Zucker, Weizenmehl, Gelatine/);
    expect(r.text).toMatch(/Kann Spuren von Milch enthalten/);
    expect(r.text).not.toMatch(/Energie/);
  });

  it.each([
    ['Ingrédients : sucre, gélatine, arôme.\nValeurs nutritionnelles moyennes', 'sucre, gélatine, arôme'],
    ['Ingredients: sugar, pork gelatin, E120.\nNutrition facts per 100g', 'sugar, pork gelatin, E120'],
    ['lngrediënten: water, suiker.\nVoedingswaarden', 'water, suiker'],
  ])('находит заголовок на разных языках и при ошибках OCR: %#', (input, expected) => {
    const r = extractIngredientsBlock(input);
    expect(r.headerFound).toBe(true);
    expect(r.text).toBe(expected);
  });

  it('без заголовка возвращает весь очищенный текст', () => {
    const r = extractIngredientsBlock('suiker, gelatine,\nwater');
    expect(r.headerFound).toBe(false);
    expect(r.text).toBe('suiker, gelatine, water');
  });

  it('результат попадает в локальный анализатор: желатин и E120 дают нарушение для халяль-профиля', () => {
    const profile = { ...createDefaultProfile(), halal: true };
    const r = analyzeLocal({ text: extractIngredientsBlock(NL).text }, profile);
    expect(['WARNING', 'BANNED']).toContain(r.verdict);
    expect(r.issues.length).toBeGreaterThan(0);
  });
});
