import type { NutrimentData, NutriScoreData, NutriScoreGrade } from '../types';

type Category = 'solid' | 'beverage';

function detectCategory(n: NutrimentData): Category {
  if (n.energy_kcal !== undefined && n.energy_kcal < 5 && n.proteins === undefined) return 'beverage';
  return 'solid';
}

// ─── Negative points (N) ───

function energyPoints(kcal: number, cat: Category): number {
  if (cat === 'beverage') {
    const t = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270];
    return t.findIndex((v, i) => i === t.length - 1 || kcal <= v) >= 0
      ? t.reduce((acc, v) => (kcal > v ? acc + 1 : acc), 0)
      : 10;
  }
  const thresholds = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350];
  const kj = kcal * 4.184;
  return thresholds.reduce((acc, v) => (kj > v ? acc + 1 : acc), 0);
}

function sugarsPoints(g: number, cat: Category): number {
  if (cat === 'beverage') {
    const t = [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5];
    return t.reduce((acc, v) => (g > v ? acc + 1 : acc), 0);
  }
  const t = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45];
  return t.reduce((acc, v) => (g > v ? acc + 1 : acc), 0);
}

function satFatPoints(g: number): number {
  const t = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  return t.reduce((acc, v) => (g > v ? acc + 1 : acc), 0);
}

function sodiumPoints(mg: number): number {
  const t = [90, 180, 270, 360, 450, 540, 630, 720, 810, 900];
  return t.reduce((acc, v) => (mg > v ? acc + 1 : acc), 0);
}

// ─── Positive points (P) ───

function fiberPoints(g: number): number {
  const t = [0.9, 1.9, 2.8, 3.7, 4.7];
  return t.reduce((acc, v) => (g > v ? acc + 1 : acc), 0);
}

function proteinPoints(g: number): number {
  const t = [1.6, 3.2, 4.8, 6.4, 8.0];
  return t.reduce((acc, v) => (g > v ? acc + 1 : acc), 0);
}

function fvnPoints(pct: number): number {
  if (pct > 80) return 5;
  if (pct > 60) return 2;
  if (pct > 40) return 1;
  return 0;
}

export function calculateRawScore(n: NutrimentData): number | null {
  if (n.energy_kcal === undefined && n.sugars === undefined && n.saturated_fat === undefined) {
    return null;
  }
  const cat = detectCategory(n);
  const energy = energyPoints(n.energy_kcal ?? 0, cat);
  const sugars = sugarsPoints(n.sugars ?? 0, cat);
  const satFat = satFatPoints(n.saturated_fat ?? 0);
  const sodium = sodiumPoints(n.sodium !== undefined ? n.sodium * 1000 : (n.salt ?? 0) / 2.5 * 1000);
  const pointsN = energy + sugars + satFat + sodium;

  const fiber = fiberPoints(n.fiber ?? 0);
  const protein = proteinPoints(n.proteins ?? 0);
  const fvn = fvnPoints(n.fruits_vegetables_nuts_estimate ?? 0);
  let pointsP = fiber + fvn;

  if (pointsN >= 11 && fvn < 5) {
    return pointsN - pointsP;
  }
  pointsP += protein;
  return pointsN - pointsP;
}

export function rawScoreToGrade(score: number, cat: Category = 'solid'): NutriScoreGrade {
  if (cat === 'beverage') {
    if (score <= 1) return 'a';
    if (score <= 5) return 'b';
    if (score <= 9) return 'c';
    if (score <= 13) return 'd';
    return 'e';
  }
  if (score <= -1) return 'a';
  if (score <= 2) return 'b';
  if (score <= 10) return 'c';
  if (score <= 18) return 'd';
  return 'e';
}

export function rawScoreTo100(score: number): number {
  const clamped = Math.max(-15, Math.min(40, score));
  return Math.round(((40 - clamped) / 55) * 100);
}

export function gradeDescriptionKey(grade: NutriScoreGrade): string {
  const map: Record<NutriScoreGrade, string> = {
    a: 'nutriscore_excellent',
    b: 'nutriscore_good',
    c: 'nutriscore_average',
    d: 'nutriscore_poor',
    e: 'nutriscore_bad',
  };
  return map[grade];
}

export const GRADE_COLORS: Record<NutriScoreGrade, string> = {
  a: '#038141',
  b: '#85BB2F',
  c: '#FECB02',
  d: '#EE8100',
  e: '#E63E11',
};

export function computeNutriScore(
  nutriments: NutrimentData | undefined,
  offGrade?: string,
  offScore?: number,
): NutriScoreData | undefined {
  if (offGrade && /^[a-e]$/.test(offGrade)) {
    const grade = offGrade as NutriScoreGrade;
    const score = offScore ?? 0;
    return { grade, score, score100: rawScoreTo100(score), computed: false };
  }
  if (!nutriments) return undefined;
  const score = calculateRawScore(nutriments);
  if (score === null) return undefined;
  const cat = detectCategory(nutriments);
  return { grade: rawScoreToGrade(score, cat), score, score100: rawScoreTo100(score), computed: true };
}
