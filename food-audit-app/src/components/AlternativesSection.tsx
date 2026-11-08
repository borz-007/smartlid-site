import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { GRADE_COLORS } from '../services/nutriScore';
import { fetchHealthyAlternatives } from '../services/alternatives';
import type { ProductSummary, UserProfile } from '../types';

interface Props {
  categoryTag?: string;
  profile: UserProfile;
  excludeBarcode?: string;
  onSelect?: (barcode: string) => void;
}

export function AlternativesSection({ categoryTag, profile, excludeBarcode, onSelect }: Props) {
  const { t } = useI18n();
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!categoryTag || loaded) return;
    setLoading(true);
    fetchHealthyAlternatives(categoryTag, profile, excludeBarcode)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => { setLoading(false); setLoaded(true); });
  }, [categoryTag, loaded, profile, excludeBarcode]);

  if (!categoryTag) return null;
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('alternatives_title')}</Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#1F6FEB" />
          <Text style={styles.loadingText}>{t('alternatives_loading')}</Text>
        </View>
      </View>
    );
  }
  if (loaded && items.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('alternatives_title')}</Text>
        <Text style={styles.empty}>{t('alternatives_none')}</Text>
      </View>
    );
  }
  if (!loaded) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('alternatives_title')}</Text>
      <View style={styles.cards}>
        {items.map((item) => (
          <Pressable
            key={item.barcode}
            style={styles.card}
            onPress={() => onSelect?.(item.barcode)}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="contain" />
            ) : (
              <View style={[styles.image, styles.placeholder]} />
            )}
            <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
            {item.brand ? <Text style={styles.brand} numberOfLines={1}>{item.brand}</Text> : null}
            <View style={styles.bottom}>
              {item.nutriScoreGrade ? (
                <View style={[styles.gradeBadge, { backgroundColor: GRADE_COLORS[item.nutriScoreGrade] }]}>
                  <Text style={styles.gradeText}>{item.nutriScoreGrade.toUpperCase()}</Text>
                </View>
              ) : null}
              {item.score100 !== undefined ? (
                <Text style={styles.score}>{item.score100}/100</Text>
              ) : null}
            </View>
          </Pressable>
        ))}
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
  title: { fontSize: 16, fontWeight: '700', color: '#14171F', marginBottom: 10 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  loadingText: { fontSize: 13, color: '#5B6372' },
  empty: { fontSize: 13, color: '#8B949E' },
  cards: { flexDirection: 'row', gap: 10 },
  card: {
    flex: 1,
    backgroundColor: '#F6F7F9',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  image: { width: 60, height: 60, borderRadius: 8, marginBottom: 6, backgroundColor: '#E3E6EB' },
  placeholder: { backgroundColor: '#E3E6EB' },
  name: { fontSize: 12, fontWeight: '600', color: '#14171F', textAlign: 'center' },
  brand: { fontSize: 10, color: '#5B6372', marginTop: 1 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  gradeBadge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: { fontSize: 12, fontWeight: '900', color: '#FFFFFF' },
  score: { fontSize: 11, fontWeight: '700', color: '#5B6372' },
});
