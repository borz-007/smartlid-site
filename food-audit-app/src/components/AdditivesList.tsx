import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import type { AdditiveAuditResult, AdditiveRiskLevel, HalalAdditiveStatus } from '../types';

interface Props {
  additives: AdditiveAuditResult[];
}

const RISK_COLORS: Record<AdditiveRiskLevel, { bg: string; text: string; dot: string }> = {
  safe: { bg: '#D1FADF', text: '#065F46', dot: '#12B76A' },
  low: { bg: '#FFF9DB', text: '#7A5900', dot: '#F5B300' },
  moderate: { bg: '#FFEDD5', text: '#7A3D00', dot: '#EE8100' },
  high: { bg: '#FEE4E2', text: '#7A1414', dot: '#D92D20' },
  unknown: { bg: '#F0F0F0', text: '#5B6372', dot: '#8B949E' },
};

const RISK_KEY: Record<AdditiveRiskLevel, string> = {
  safe: 'additive_risk_safe',
  low: 'additive_risk_low',
  moderate: 'additive_risk_moderate',
  high: 'additive_risk_high',
  unknown: 'additive_risk_unknown',
};

const HALAL_KEY: Record<HalalAdditiveStatus, string> = {
  halal: 'additive_halal',
  haram: 'additive_haram',
  doubtful: 'additive_doubtful',
};

const HALAL_DOT: Record<HalalAdditiveStatus, string> = {
  halal: '#12B76A',
  haram: '#D92D20',
  doubtful: '#F5B300',
};

export function AdditivesList({ additives }: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  if (additives.length === 0) return null;

  const highCount = additives.filter((a) => a.riskLevel === 'high' || a.riskLevel === 'moderate').length;

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={() => setExpanded(!expanded)}>
        <Text style={styles.title}>{t('additives_title')}</Text>
        <View style={styles.badges}>
          <View style={[styles.countBadge, { backgroundColor: highCount > 0 ? '#FEE4E2' : '#D1FADF' }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: highCount > 0 ? '#D92D20' : '#12B76A' }}>
              {additives.length}
            </Text>
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#8B949E" />
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.list}>
          {additives.map((a) => {
            const rc = RISK_COLORS[a.riskLevel];
            return (
              <View key={a.code} style={[styles.card, { backgroundColor: rc.bg }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.codeRow}>
                    <View style={[styles.dot, { backgroundColor: rc.dot }]} />
                    <Text style={[styles.code, { color: rc.text }]}>{a.code}</Text>
                    <Text style={[styles.riskLabel, { color: rc.text }]}>{t(RISK_KEY[a.riskLevel])}</Text>
                  </View>
                  <View style={styles.halalBadge}>
                    <View style={[styles.dot, { backgroundColor: HALAL_DOT[a.halalStatus] }]} />
                    <Text style={styles.halalText}>{t(HALAL_KEY[a.halalStatus])}</Text>
                  </View>
                </View>
                <Text style={[styles.name, { color: rc.text }]}>{a.name}</Text>
                <Text style={[styles.desc, { color: rc.text }]}>{a.description}</Text>
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
  countBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  list: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  card: { borderRadius: 10, padding: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  code: { fontSize: 15, fontWeight: '800' },
  riskLabel: { fontSize: 12, fontWeight: '600' },
  halalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  halalText: { fontSize: 11, color: '#5B6372', fontWeight: '600' },
  name: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  desc: { fontSize: 12, lineHeight: 16 },
});
