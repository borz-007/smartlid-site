import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { severityColors } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import { loadBlacklist, loadFavorites, removeFavorite, removeFromBlacklist } from '../storage/favoritesStorage';
import type { SavedProduct } from '../types';

interface Props {
  onBack: () => void;
}

type Tab = 'favorites' | 'blacklist';

function ProductRow({ item, onRemove, colors, productLabel }: { item: SavedProduct; onRemove: () => void; colors: any; productLabel: string }) {
  const c = severityColors[item.verdict];
  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
          <Ionicons name="cube-outline" size={22} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {item.productName || item.barcode || productLabel}
        </Text>
        {item.brand ? <Text style={[styles.brand, { color: colors.textMuted }]}>{item.brand}</Text> : null}
      </View>
      <View style={[styles.badge, { backgroundColor: c.bg }]}>
        <Text style={{ color: c.fg, fontSize: 11, fontWeight: '700' }}>{item.verdict}</Text>
      </View>
      <Pressable onPress={onRemove} hitSlop={8}>
        <Ionicons name="close-circle" size={22} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

export function FavoritesScreen({ onBack }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>('favorites');
  const [favs, setFavs] = useState<SavedProduct[]>([]);
  const [blist, setBlist] = useState<SavedProduct[]>([]);

  useEffect(() => {
    loadFavorites().then(setFavs);
    loadBlacklist().then(setBlist);
  }, []);

  const handleRemoveFav = async (p: SavedProduct) => {
    await removeFavorite(p);
    setFavs(await loadFavorites());
  };

  const handleRemoveBl = async (p: SavedProduct) => {
    await removeFromBlacklist(p);
    setBlist(await loadBlacklist());
  };

  const data = tab === 'favorites' ? favs : blist;
  const emptyIcon = tab === 'favorites' ? 'heart-outline' : 'ban-outline';
  const emptyText = tab === 'favorites' ? t('no_favorites') : t('blacklist_empty');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{t('saved')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {(['favorites', 'blacklist'] as Tab[]).map((tb) => (
          <Pressable
            key={tb}
            style={[styles.tab, tab === tb && { backgroundColor: colors.primary }]}
            onPress={() => setTab(tb)}
          >
            <Ionicons
              name={tb === 'favorites' ? 'heart' : 'ban'}
              size={16}
              color={tab === tb ? colors.white : colors.textMuted}
            />
            <Text style={[styles.tabText, { color: tab === tb ? colors.white : colors.textMuted }]}>
              {tb === 'favorites' ? `${t('favorites_tab')} (${favs.length})` : `${t('blacklist_tab')} (${blist.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {data.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name={emptyIcon as any} size={48} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>{emptyText}</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(p, i) => `${p.barcode || p.productName}-${i}`}
          renderItem={({ item }) => (
            <ProductRow
              item={item}
              colors={colors}
              productLabel={t('product')}
              onRemove={() => (tab === 'favorites' ? handleRemoveFav(item) : handleRemoveBl(item))}
            />
          )}
        />
      )}
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
  tabs: {
    flexDirection: 'row', marginHorizontal: 12, borderRadius: 10,
    borderWidth: 1, overflow: 'hidden',
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 9,
  },
  tabText: { fontSize: 13, fontWeight: '600' },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: { width: 44, height: 44, borderRadius: 8 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  brand: { fontSize: 13, marginTop: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16 },
});
