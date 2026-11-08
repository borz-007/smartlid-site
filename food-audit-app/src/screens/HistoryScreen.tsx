import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResultModal } from '../components/ResultModal';
import { severityColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import { clearHistory, loadHistory } from '../storage/historyStorage';
import type { HistoryEntry, ScanResult } from '../types';

interface Props {
  onBack: () => void;
}

function EntryRow({ entry, onPress, colors, unknownLabel }: { entry: HistoryEntry; onPress: () => void; colors: any; unknownLabel: string }) {
  const c = severityColors[entry.verdict];
  const date = new Date(entry.date);
  const dateStr = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  return (
    <Pressable style={[styles.row, { backgroundColor: colors.card, borderBottomColor: colors.border }]} onPress={onPress}>
      {entry.imageUrl ? (
        <Image source={{ uri: entry.imageUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="cube-outline" size={22} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {entry.productName || entry.barcode || unknownLabel}
        </Text>
        {entry.brand ? <Text style={[styles.brand, { color: colors.textMuted }]} numberOfLines={1}>{entry.brand}</Text> : null}
        <Text style={[styles.date, { color: colors.textMuted }]}>{dateStr}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.fg, fontSize: 11, fontWeight: '700' }}>{entry.verdict}</Text>
      </View>
    </Pressable>
  );
}

export function HistoryScreen({ onBack }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [selected, setSelected] = useState<ScanResult | null>(null);
  const [resultId, setResultId] = useState(0);

  useEffect(() => {
    loadHistory().then(setEntries);
  }, []);

  const handleClear = useCallback(() => {
    Alert.alert(t('clear_history'), t('all_entries_deleted'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await clearHistory();
          setEntries([]);
        },
      },
    ]);
  }, [t]);

  const openResult = (entry: HistoryEntry) => {
    setSelected(entry.result);
    setResultId((n) => n + 1);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{t('history_title')}</Text>
        {entries.length > 0 ? (
          <Pressable onPress={handleClear} hitSlop={12}>
            <Ionicons name="trash-outline" size={22} color={colors.textMuted} />
          </Pressable>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>

      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t('no_scans_yet')}</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <EntryRow entry={item} onPress={() => openResult(item)} colors={colors} unknownLabel={t('unknown_product')} />}
        />
      )}

      <ResultModal key={resultId} result={selected} onClose={() => setSelected(null)} saveToHistory={false} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  title: { fontSize: 18, fontWeight: '700' },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 44, height: 44, borderRadius: 8 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  brand: { fontSize: 13, marginTop: 1 },
  date: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16 },
});
