import type { NutrientFactor, NutrimentData } from '../types';

export function analyzeNutrientFactors(n: NutrimentData | undefined): NutrientFactor[] {
  if (!n) return [];
  const factors: NutrientFactor[] = [];

  const kcal = n.energy_kcal ?? 0;
  const sugars = n.sugars ?? 0;
  const satFat = n.saturated_fat ?? 0;
  const salt = n.salt ?? (n.sodium !== undefined ? n.sodium * 2.5 : 0);
  const protein = n.proteins ?? 0;
  const fiber = n.fiber ?? 0;

  if (sugars > 10) {
    factors.push({
      type: 'negative',
      labelKey: 'factor_sugar_high',
      value: `${sugars.toFixed(1)} g`,
      level: sugars > 20 ? 'high' : 'moderate',
    });
  }

  if (satFat > 5) {
    factors.push({
      type: 'negative',
      labelKey: 'factor_sat_fat_high',
      value: `${satFat.toFixed(1)} g`,
      level: satFat > 10 ? 'high' : 'moderate',
    });
  }

  if (salt > 1.2) {
    factors.push({
      type: 'negative',
      labelKey: 'factor_salt_high',
      value: `${salt.toFixed(1)} g`,
      level: salt > 2.0 ? 'high' : 'moderate',
    });
  }

  if (kcal > 400) {
    factors.push({
      type: 'negative',
      labelKey: 'factor_calories_high',
      value: `${Math.round(kcal)} kcal`,
      level: kcal > 600 ? 'high' : 'moderate',
    });
  }

  if (protein > 8) {
    factors.push({
      type: 'positive',
      labelKey: 'factor_protein_good',
      value: `${protein.toFixed(1)} g`,
      level: 'high',
    });
  }

  if (fiber > 3.5) {
    factors.push({
      type: 'positive',
      labelKey: 'factor_fiber_good',
      value: `${fiber.toFixed(1)} g`,
      level: 'high',
    });
  }

  if (sugars <= 2 && sugars >= 0) {
    factors.push({
      type: 'positive',
      labelKey: 'factor_sugar_low',
      value: `${sugars.toFixed(1)} g`,
      level: 'low',
    });
  }

  if (salt <= 0.3 && salt >= 0) {
    factors.push({
      type: 'positive',
      labelKey: 'factor_salt_low',
      value: `${salt.toFixed(1)} g`,
      level: 'low',
    });
  }

  return factors;
}
