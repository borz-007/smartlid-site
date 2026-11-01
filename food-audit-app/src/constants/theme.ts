import type { Severity } from '../types';

export interface AppColors {
  bg: string;
  card: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  overlay: string;
  white: string;
}

export const lightColors: AppColors = {
  bg: '#F6F7F9',
  card: '#FFFFFF',
  text: '#14171F',
  textMuted: '#5B6372',
  border: '#E3E6EB',
  primary: '#1F6FEB',
  overlay: 'rgba(0,0,0,0.55)',
  white: '#FFFFFF',
};

export const darkColors: AppColors = {
  bg: '#0D1117',
  card: '#161B22',
  text: '#E6EDF3',
  textMuted: '#8B949E',
  border: '#30363D',
  primary: '#58A6FF',
  overlay: 'rgba(0,0,0,0.7)',
  white: '#FFFFFF',
};

/** Default export for backwards compat — light theme. */
export const colors = lightColors;

export const severityColors: Record<Severity, { bg: string; fg: string; soft: string }> = {
  BANNED: { bg: '#D92D20', fg: '#FFFFFF', soft: '#FEE4E2' },
  WARNING: { bg: '#F5B300', fg: '#1F1600', soft: '#FFF4CC' },
  SAFE: { bg: '#12B76A', fg: '#FFFFFF', soft: '#D1FADF' },
};

export const severityLabels: Record<Severity, { title: string; subtitle: string; emoji: string }> = {
  BANNED: { title: 'ЗАПРЕЩЕНО', subtitle: 'Найден прямой запрет для вашего профиля', emoji: '🔴' },
  WARNING: { title: 'СОМНИТЕЛЬНО', subtitle: 'Есть следы аллергенов или добавки неясного происхождения', emoji: '🟡' },
  SAFE: { title: 'БЕЗОПАСНО', subtitle: 'Проблем для вашего профиля не найдено', emoji: '🟢' },
};

export type SpecificVerdict = { title: string; subtitle: string };
export const specificVerdicts: Record<string, SpecificVerdict> = {
  halal: { title: 'ХАРАМ', subtitle: 'Содержит запрещённые компоненты (Halal)' },
  vegan: { title: 'НЕ ВЕГАНСКОЕ', subtitle: 'Содержит продукты животного происхождения' },
  vegetarian: { title: 'НЕ ВЕГЕТАРИАНСКОЕ', subtitle: 'Содержит убойные продукты' },
  allergen: { title: 'АЛЛЕРГЕН', subtitle: 'Содержит аллерген из вашего списка' },
  custom: { title: 'СТОП-СЛОВО', subtitle: 'Найдено персональное стоп-слово' },
};
