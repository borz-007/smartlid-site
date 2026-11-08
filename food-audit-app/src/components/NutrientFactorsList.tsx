import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import type { NutrientFactor } from '../types';

interface Props {
  factors: NutrientFactor[];
}

const LEVEL_COLORS = {
  positive: { bg: '#D1FADF', icon: '#12B76A', text: '#065F46' },
  negative_moderate: { bg: '#FFF4CC', icon: '#F5B300', text: '#7A5900' },
  negative_high: { bg: '#FEE4E2', icon: '#D92D20', text: '#7A1414' },
};

function factorColors(f: NutrientFactor) {
  if (f.type === 'positive') return LEVEL_COLORS.positive;
  return f.level === 'high' ? LEVEL_COLORS.negative_high : LEVEL_COLORS.negative_moderate;
}

export function NutrientFactorsList({ factors }: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  if (factors.length === 0) return null;

  const negatives = factors.filter((f) => f.type === 'negative');
  const positives = factors.filter((f) => f.type === 'positive');

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.title}>{t('factors_title')}</Text>
        <View style={styles.badges}>
          {negatives.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: '#FEE4E2' }]}>
              <Text style={{ fontSize: 11, color: '#D92D20', fontWeight: '700' }}>-{negatives.length}</Text>
            </View>
          )}
          {positives.length > 0 && (
            <View style={[styles.countBadge, { backgroundColor: '#D1FADF' }]}>
              <Text style={{ fontSize: 11, color: '#12B76A', fontWeight: '700' }}>+{positives.length}</Text>
            </View>
          )}
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#8B949E" />
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.list}>
          {factors.map((f, i) => {
            const c = factorColors(f);
            return (
              <View key={`${f.labelKey}-${i}`} style={[styles.factor, { backgroundColor: c.bg }]}>
                <Ionicons
                  name={f.type === 'positive' ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={c.icon}
                />
                <View style={styles.factorText}>
                  <Text style={[styles.factorLabel, { color: c.text }]}>{t(f.labelKey)}</Text>
                  <Text style={[styles.factorValue, { color: c.text }]}>
                    {f.value} {t('factor_per_100g')}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#14171F' },
  badges: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  list: { paddingHorizontal: 14, paddingBottom: 14, gap: 6 },
  factor: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  factorText: { flex: 1 },
  factorLabel: { fontSize: 14, fontWeight: '600' },
  factorValue: { fontSize: 12, marginTop: 1 },
});
