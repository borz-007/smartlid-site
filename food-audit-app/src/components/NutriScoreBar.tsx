import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GRADE_COLORS, gradeDescriptionKey } from '../services/nutriScore';
import { useI18n } from '../i18n';
import type { NutriScoreData, NutriScoreGrade } from '../types';

const GRADES: NutriScoreGrade[] = ['a', 'b', 'c', 'd', 'e'];

interface Props {
  data: NutriScoreData;
}

export function NutriScoreBar({ data }: Props) {
  const { t } = useI18n();
  const color = GRADE_COLORS[data.grade];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('nutriscore_title')}</Text>
        <View style={[styles.scoreBadge, { backgroundColor: color }]}>
          <Text style={styles.scoreText}>{data.score100}/100</Text>
        </View>
      </View>

      <View style={styles.bar}>
        {GRADES.map((g) => {
          const active = g === data.grade;
          const bg = GRADE_COLORS[g];
          return (
            <View
              key={g}
              style={[
                styles.cell,
                { backgroundColor: bg },
                active && styles.activeCell,
                g === 'a' && styles.firstCell,
                g === 'e' && styles.lastCell,
              ]}
            >
              <Text style={[styles.letter, active && styles.activeLetter]}>
                {g.toUpperCase()}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={[styles.description, { color }]}>
        {t(gradeDescriptionKey(data.grade))}
      </Text>
      {data.computed ? (
        <Text style={styles.computed}>{t('nutriscore_quality_index')}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#14171F' },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  bar: {
    flexDirection: 'row',
    height: 36,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstCell: { borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
  lastCell: { borderTopRightRadius: 8, borderBottomRightRadius: 8 },
  activeCell: {
    flex: 1.6,
    transform: [{ scaleY: 1.15 }],
    zIndex: 1,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  letter: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  activeLetter: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  description: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  computed: { fontSize: 11, color: '#8B949E', textAlign: 'center', marginTop: 2 },
});
