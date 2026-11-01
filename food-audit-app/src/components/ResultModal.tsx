import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { severityColors, severityLabels, specificVerdicts } from '../constants/theme';
import { splitIngredients } from '../engine/ingredients';
import { addToHistory } from '../storage/historyStorage';
import {
  addFavorite,
  addToBlacklist,
  isFavorite,
  isBlacklisted,
  removeFavorite,
  removeFromBlacklist,
} from '../storage/favoritesStorage';
import { setCachedResult } from '../storage/cacheStorage';
import type { IngredientsSource, Issue, IssueCategory, ScanResult, SavedProduct } from '../types';

const INGREDIENTS_SOURCE_LABELS: Record<IngredientsSource, string> = {
  openfoodfacts: 'из базы Open Food Facts',
  web: 'найден в интернете',
  photo: 'распознан по фото',
};

interface Props {
  result: ScanResult | null;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<IssueCategory, string> = {
  halal: 'Halal',
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  allergen: 'Аллерген',
  custom: 'Стоп-слово',
  other: 'Прочее',
};

const SOURCE_LABELS: Record<Issue['source'], string> = {
  local: 'локальный фильтр',
  ai: 'ИИ',
  openfoodfacts: 'Open Food Facts',
};

function getSpecificTitle(result: ScanResult): string | null {
  if (result.verdict !== 'BANNED') return null;
  const cats = result.issues.filter((i) => i.severity === 'BANNED').flatMap((i) => i.categories);
  for (const key of ['halal', 'vegan', 'vegetarian', 'allergen', 'custom'] as const) {
    if (cats.includes(key) && specificVerdicts[key]) return specificVerdicts[key].title;
  }
  return null;
}

function getSpecificSubtitle(result: ScanResult): string | null {
  if (result.verdict !== 'BANNED') return null;
  const cats = result.issues.filter((i) => i.severity === 'BANNED').flatMap((i) => i.categories);
  for (const key of ['halal', 'vegan', 'vegetarian', 'allergen', 'custom'] as const) {
    if (cats.includes(key) && specificVerdicts[key]) return specificVerdicts[key].subtitle;
  }
  return null;
}

function IssueCard({ issue }: { issue: Issue }) {
  const c = severityColors[issue.severity];
  return (
    <View style={[styles.issue, { borderLeftColor: c.bg, backgroundColor: c.soft }]}>
      <Text style={styles.issueOriginal}>{issue.original}</Text>
      <Text style={styles.issueTranslation}>— {issue.translationRu}</Text>
      {issue.reasonRu ? <Text style={styles.issueReason}>{issue.reasonRu}</Text> : null}
      <View style={styles.tags}>
        {issue.categories.map((cat) => (
          <Text key={cat} style={styles.tag}>{CATEGORY_LABELS[cat]}</Text>
        ))}
        <Text style={styles.source}>{SOURCE_LABELS[issue.source]}</Text>
      </View>
    </View>
  );
}

function toSavedProduct(result: ScanResult): SavedProduct {
  return {
    barcode: result.product?.barcode,
    productName: result.product?.name,
    brand: result.product?.brand,
    verdict: result.verdict,
    imageUrl: result.product?.imageUrl,
    date: new Date().toISOString(),
  };
}

export function ResultModal({ result, onClose }: Props) {
  const [fav, setFav] = useState(false);
  const [bl, setBl] = useState(false);

  useEffect(() => {
    if (!result) return;
    addToHistory(result);
    if (result.product?.barcode) {
      setCachedResult(result.product.barcode, result);
    }
    const bc = result.product?.barcode;
    const nm = result.product?.name;
    isFavorite(bc, nm).then(setFav);
    isBlacklisted(bc, nm).then(setBl);
  }, [result]);

  if (!result) return null;

  const c = severityColors[result.verdict];
  const label = severityLabels[result.verdict];
  const specTitle = getSpecificTitle(result);
  const specSubtitle = getSpecificSubtitle(result);
  const { product } = result;

  const handleShare = async () => {
    const name = product?.name || 'Товар';
    const issues = result.issues.map((i) => `- ${i.translationRu}`).join('\n');
    const text = `${name}\nВердикт: ${specTitle || label.title}\n${issues ? `\nПроблемы:\n${issues}` : 'Проблем не найдено.'}\n\nПроверено через Food Audit`;
    try {
      await Share.share({ message: text });
    } catch {}
  };

  const toggleFav = async () => {
    const p = toSavedProduct(result);
    if (fav) { await removeFavorite(p); setFav(false); }
    else { await addFavorite(p); setFav(true); }
  };

  const toggleBl = async () => {
    const p = toSavedProduct(result);
    if (bl) { await removeFromBlacklist(p); setBl(false); }
    else { await addToBlacklist(p); setBl(true); }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={[styles.banner, { backgroundColor: c.bg }]}>
          <Text style={styles.bannerEmoji}>{label.emoji}</Text>
          <Text style={[styles.bannerTitle, { color: c.fg }]}>{specTitle || label.title}</Text>
          <Text style={[styles.bannerSubtitle, { color: c.fg }]}>{specSubtitle || label.subtitle}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {product?.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.bigImage} resizeMode="contain" />
          ) : null}

          {product && (product.name || product.brand) ? (
            <View style={styles.product}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{product.name ?? 'Без названия'}</Text>
                {product.brand ? <Text style={styles.muted}>{product.brand}</Text> : null}
                {product.manufacturer && product.manufacturer !== product.brand ? (
                  <Text style={styles.muted}>Производитель: {product.manufacturer}</Text>
                ) : null}
                {product.barcode ? <Text style={styles.muted}>{product.barcode}</Text> : null}
              </View>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable style={styles.actionBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color="#1F6FEB" />
              <Text style={styles.actionLabel}>Поделиться</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={toggleFav}>
              <Ionicons name={fav ? 'heart' : 'heart-outline'} size={20} color={fav ? '#D92D20' : '#1F6FEB'} />
              <Text style={styles.actionLabel}>{fav ? 'В избранном' : 'В избранное'}</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={toggleBl}>
              <Ionicons name={bl ? 'ban' : 'ban-outline'} size={20} color={bl ? '#D92D20' : '#1F6FEB'} />
              <Text style={styles.actionLabel}>{bl ? 'В чёрном списке' : 'В чёрный список'}</Text>
            </Pressable>
          </View>

          {result.aiSummaryRu ? (
            <View style={styles.summary}>
              <Ionicons name="sparkles-outline" size={16} color="#1F6FEB" />
              <Text style={styles.summaryText}>{result.aiSummaryRu}</Text>
            </View>
          ) : null}

          <Text style={styles.h2}>Найденные проблемы</Text>
          {result.issues.length === 0 ? (
            <Text style={styles.muted}>Запрещённых или сомнительных компонентов не найдено.</Text>
          ) : (
            result.issues.map((i) => <IssueCard key={i.key} issue={i} />)
          )}

          {result.traces.length > 0 ? (
            <>
              <Text style={styles.h2}>Следы аллергенов</Text>
              {result.traces.map((i) => <IssueCard key={i.key} issue={i} />)}
            </>
          ) : null}

          {result.notes.length > 0 ? (
            <View style={styles.notes}>
              {result.notes.map((n) => (
                <Text key={n} style={styles.note}>ⓘ {n}</Text>
              ))}
            </View>
          ) : null}

          {result.ingredientsText ? (
            <>
              <Text style={styles.h2}>Состав</Text>
              <Text style={styles.muted}>{INGREDIENTS_SOURCE_LABELS[result.ingredientsSource]}</Text>
              <View style={styles.ingredientsBox}>
                {splitIngredients(result.ingredientsText).map((ing, idx) => (
                  <Text key={`${idx}-${ing}`} style={styles.ingredient}>• {ing}</Text>
                ))}
              </View>
            </>
          ) : null}

          {product?.sources?.length ? (
            <>
              <Text style={styles.h2}>Источники</Text>
              {product.sources.slice(0, 5).map((src) => (
                <Pressable key={src.uri} onPress={() => Linking.openURL(src.uri)}>
                  <Text style={styles.link} numberOfLines={1}>{src.title || src.uri}</Text>
                </Pressable>
              ))}
            </>
          ) : null}
        </ScrollView>

        <Pressable style={styles.nextBtn} onPress={onClose} accessibilityRole="button">
          <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
          <Text style={styles.nextText}>Сканировать следующий товар</Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F7F9' },
  banner: { paddingTop: 36, paddingBottom: 24, alignItems: 'center', paddingHorizontal: 20 },
  bannerEmoji: { fontSize: 44 },
  bannerTitle: { fontSize: 30, fontWeight: '800', letterSpacing: 1, marginTop: 6 },
  bannerSubtitle: { fontSize: 14, marginTop: 4, textAlign: 'center', opacity: 0.9 },
  content: { padding: 16, paddingBottom: 32 },
  bigImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 12, backgroundColor: '#E3E6EB' },
  product: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
  productName: { fontSize: 17, fontWeight: '700', color: '#14171F' },
  muted: { fontSize: 14, color: '#5B6372' },
  actions: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 12, marginBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E3E6EB',
  },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionLabel: { fontSize: 11, color: '#5B6372' },
  summary: {
    flexDirection: 'row', gap: 8, backgroundColor: '#FFFFFF',
    padding: 12, borderRadius: 10, marginBottom: 4,
  },
  summaryText: { flex: 1, fontSize: 14, color: '#14171F', lineHeight: 19 },
  h2: { fontSize: 17, fontWeight: '700', color: '#14171F', marginTop: 18, marginBottom: 8 },
  issue: { borderLeftWidth: 4, borderRadius: 8, padding: 12, marginBottom: 8 },
  issueOriginal: { fontSize: 16, fontWeight: '700', color: '#14171F' },
  issueTranslation: { fontSize: 15, color: '#14171F', marginTop: 2 },
  issueReason: { fontSize: 14, color: '#5B6372', marginTop: 4, lineHeight: 19 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' },
  tag: {
    fontSize: 12, fontWeight: '600', color: '#14171F',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden',
  },
  source: { fontSize: 12, color: '#5B6372' },
  notes: { marginTop: 16, gap: 4 },
  note: { fontSize: 13, color: '#5B6372', lineHeight: 18 },
  link: { color: '#1F6FEB', fontSize: 15, fontWeight: '600', paddingVertical: 4 },
  ingredientsBox: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, marginTop: 8, gap: 4 },
  ingredient: { fontSize: 15, color: '#14171F', lineHeight: 20 },
  nextBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1F6FEB', margin: 16, paddingVertical: 16, borderRadius: 14,
  },
  nextText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
