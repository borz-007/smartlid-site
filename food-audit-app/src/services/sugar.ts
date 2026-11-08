/** 1 чайная ложка (кубик) сахара ≈ 4 г. */
export const GRAMS_PER_TEASPOON = 4;

/** Граммы сахара на 100 г/мл -> число кубиков/ложек с одним знаком после запятой. */
export function sugarSpoons(sugarsGrams: number): number {
  return Math.round((sugarsGrams / GRAMS_PER_TEASPOON) * 10) / 10;
}

/** Цвета условные и согласованы с порогами в nutrientFactors: >10 г умеренно, >20 г много (на 100 г/мл). */
export function sugarLevel(sugarsGrams: number): 'low' | 'moderate' | 'high' {
  return sugarsGrams > 20 ? 'high' : sugarsGrams > 10 ? 'moderate' : 'low';
}
