import { classifyIngredient } from '../src/engine/ingredientHighlight';
import { splitIngredients } from '../src/engine/ingredients';
import { sugarLevel, sugarSpoons } from '../src/services/sugar';
import type { AdditiveAuditResult, Issue } from '../src/types';

const issue = (original: string, severity: Issue['severity'], source: Issue['source'] = 'local'): Issue => ({
  key: original, original, translationRu: '', reasonRu: '', severity, categories: ['halal'], isTrace: false, source,
});
const additive = (code: string, halalStatus: AdditiveAuditResult['halalStatus']): AdditiveAuditResult => ({
  code, name: '', riskLevel: 'low', halalStatus, description: '',
});

describe('подсветка ингредиентов', () => {
  const issues = [issue('gelatine', 'BANNED'), issue('aroma', 'WARNING'), issue('suiker', 'SAFE')];

  it('красный для запрещённых, оранжевый для сомнительных, остальные без выделения', () => {
    expect(classifyIngredient('Gelatine (varken)', issues)).toBe('BANNED');
    expect(classifyIngredient('natuurlijk aroma', issues)).toBe('WARNING');
    expect(classifyIngredient('suiker', issues)).toBeNull();
    expect(classifyIngredient('water', issues)).toBeNull();
  });

  it('при нескольких совпадениях побеждает более строгое', () => {
    expect(classifyIngredient('aroma en gelatine', issues)).toBe('BANNED');
  });

  it('Е-добавки подсвечиваются по справочнику халяль-статуса', () => {
    const adds = [additive('E120', 'haram'), additive('E471', 'doubtful'), additive('E330', 'halal')];
    expect(classifyIngredient('kleurstof: E120', [], adds)).toBe('BANNED');
    expect(classifyIngredient('emulgator (E 471)', [], adds)).toBe('WARNING');
    expect(classifyIngredient('zuurteregelaar E330', [], adds)).toBeNull();
    expect(classifyIngredient('E1200', [], adds)).toBeNull();
  });

  it('запись сообщества не подсвечивает ингредиенты по случайному совпадению', () => {
    expect(classifyIngredient('Safa sap', [issue('SAFA', 'BANNED', 'community')])).toBeNull();
  });

  it('работает на реальном разборе списка', () => {
    const items = splitIngredients('Ingrediënten: water, suiker, gelatine, aroma.');
    expect(items.map((i) => classifyIngredient(i, issues))).toEqual([null, null, 'BANNED', 'WARNING']);
  });
});

describe('сахар в кубиках/ложках', () => {
  it('граммы на 100 г делятся на 4 с одним знаком после запятой', () => {
    expect(sugarSpoons(11.6)).toBe(2.9);
    expect(sugarSpoons(0)).toBe(0);
    expect(sugarSpoons(4)).toBe(1);
    expect(sugarSpoons(100)).toBe(25);
    expect(sugarSpoons(2)).toBe(0.5);
  });

  it('уровни согласованы с порогами пищевых факторов', () => {
    expect(sugarLevel(5)).toBe('low');
    expect(sugarLevel(11.6)).toBe('moderate');
    expect(sugarLevel(25)).toBe('high');
  });
});
