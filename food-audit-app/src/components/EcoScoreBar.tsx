import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import type { EcoScoreData, EcoScoreGrade } from '../types';

const GRADES: EcoScoreGrade[] = ['a', 'b', 'c', 'd', 'e'];
const COLORS: Record<EcoScoreGrade, string> = {
  a: '#1E8F4E',
  b: '#60AC0E',
  c: '#EEAE0E',
  d: '#FF6F1E',
  e: '#DF1F1F',
};

interface Props {
  data?: EcoScoreData;
}

export function EcoScoreBar({ data }: Props) {
  const { t } = useI18n();

  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('ecoscore_title')}</Text>
        <Text style={styles.noData}>{t('ecoscore_no_data')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('ecoscore_title')}</Text>
      <View style={styles.bar}>
        {GRADES.map((g) => {
          const active = g === data.grade;
          return (
            <View
              key={g}
              style={[
                styles.cell,
                { backgroundColor: COLORS[g] },
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
  title: { fontSize: 16, fontWeight: '700', color: '#14171F', marginBottom: 8 },
  noData: { fontSize: 13, color: '#8B949E' },
  bar: {
    flexDirection: 'row',
    height: 30,
    borderRadius: 6,
    overflow: 'hidden',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firstCell: { borderTopLeftRadius: 6, borderBottomLeftRadius: 6 },
  lastCell: { borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  activeCell: {
    flex: 1.5,
    transform: [{ scaleY: 1.1 }],
    borderRadius: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  letter: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  activeLetter: { fontSize: 17, fontWeight: '900', color: '#FFFFFF' },
});
