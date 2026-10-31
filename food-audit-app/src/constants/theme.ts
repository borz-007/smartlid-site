import type { Severity } from '../types';

export const colors = {
  bg: '#F6F7F9',
  card: '#FFFFFF',
  text: '#14171F',
  textMuted: '#5B6372',
  border: '#E3E6EB',
  primary: '#1F6FEB',
  overlay: 'rgba(0,0,0,0.55)',
  white: '#FFFFFF',
};

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
