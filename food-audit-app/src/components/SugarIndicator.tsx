import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { sugarLevel, sugarSpoons } from '../services/sugar';

const COLORS = { low: '#12B76A', moderate: '#DC6803', high: '#D92D20' };
const MAX_CUBES = 10;

/** «Кубики/ложки сахара: X шт.» по данным пищевой ценности (граммы сахара на 100 г/мл ÷ 4). */
export function SugarIndicator({ sugars }: { sugars?: number }) {
  const { t } = useI18n();
  if (sugars === undefined || !Number.isFinite(sugars) || sugars < 0) return null;

  const spoons = sugarSpoons(sugars);
  const color = COLORS[sugarLevel(sugars)];
  const total = Math.ceil(spoons);
  const shown = Math.min(total, MAX_CUBES);
  const fraction = spoons - Math.floor(spoons);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('sugar_title')}</Text>
      <Text style={[styles.value, { color }]}>{t('sugar_cubes_label', { n: String(spoons) })}</Text>
      {shown > 0 ? (
        <View style={styles.cubes}>
          {Array.from({ length: shown }, (_, i) => {
            const partial = i === total - 1 && fraction > 0 && total <= MAX_CUBES;
            return <View key={i} style={[styles.cube, { backgroundColor: color, opacity: partial ? 0.3 + 0.7 * fraction : 1 }]} />;
          })}
          {total > MAX_CUBES ? <Text style={[styles.more, { color }]}>+</Text> : null}
        </View>
      ) : null}
      <Text style={styles.hint}>{t('sugar_per100')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700', color: '#14171F', marginBottom: 4 },
  value: { fontSize: 15, fontWeight: '700' },
  cubes: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 8 },
  cube: { width: 16, height: 16, borderRadius: 3 },
  more: { fontSize: 18, fontWeight: '800' },
  hint: { fontSize: 11, color: '#8B949E', marginTop: 8 },
});
