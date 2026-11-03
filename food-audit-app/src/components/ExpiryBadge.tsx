import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import type { ExpiryResult } from '../types';

interface Props {
  data: ExpiryResult;
}

const STATUS_COLORS = {
  fresh: { bg: '#D1FADF', text: '#065F46', icon: '#12B76A' },
  expiring_soon: { bg: '#FFF4CC', text: '#7A5900', icon: '#F5B300' },
  expired: { bg: '#FEE4E2', text: '#7A1414', icon: '#D92D20' },
};

const STATUS_KEY = {
  fresh: 'expiry_fresh',
  expiring_soon: 'expiry_expiring',
  expired: 'expiry_expired',
};

export function ExpiryBadge({ data }: Props) {
  const { t } = useI18n();
  const c = STATUS_COLORS[data.status];

  const remaining = (): string => {
    if (data.status === 'expired') return t('expiry_expired');
    const d = data.daysRemaining;
    if (d > 60) return t('expiry_months_left', { months: String(Math.floor(d / 30)) });
    return t('expiry_days_left', { days: String(d) });
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Ionicons
        name={data.status === 'expired' ? 'warning' : data.status === 'expiring_soon' ? 'time' : 'checkmark-circle'}
        size={22}
        color={c.icon}
      />
      <View style={styles.textBlock}>
        <Text style={[styles.status, { color: c.text }]}>{t(STATUS_KEY[data.status])}</Text>
        <Text style={[styles.remaining, { color: c.text }]}>{remaining()}</Text>
        {data.rawText ? <Text style={[styles.raw, { color: c.text }]}>{data.rawText}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  textBlock: { flex: 1 },
  status: { fontSize: 15, fontWeight: '700' },
  remaining: { fontSize: 13, marginTop: 2 },
  raw: { fontSize: 11, marginTop: 2, opacity: 0.7 },
});
