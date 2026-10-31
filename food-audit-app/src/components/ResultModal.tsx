import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, severityColors, severityLabels } from '../constants/theme';
import { splitIngredients } from '../engine/ingredients';
import type { IngredientsSource, Issue, IssueCategory, ScanResult } from '../types';

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

function IssueCard({ issue }: { issue: Issue }) {
  const c = severityColors[issue.severity];
  return (
    <View style={[styles.issue, { borderLeftColor: c.bg, backgroundColor: c.soft }]}>
      <Text style={styles.issueOriginal}>{issue.original}</Text>
      <Text style={styles.issueTranslation}>— {issue.translationRu}</Text>
      {issue.reasonRu ? <Text style={styles.issueReason}>{issue.reasonRu}</Text> : null}
      <View style={styles.tags}>
        {issue.categories.map((cat) => (
          <Text key={cat} style={styles.tag}>
            {CATEGORY_LABELS[cat]}
          </Text>
        ))}
        <Text style={styles.source}>{SOURCE_LABELS[issue.source]}</Text>
      </View>
    </View>
  );
}

export function ResultModal({ result, onClose }: Props) {
  if (!result) return null;

  const c = severityColors[result.verdict];
  const label = severityLabels[result.verdict];
  const { product } = result;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={[styles.banner, { backgroundColor: c.bg }]}>
          <Text style={[styles.bannerEmoji]}>{label.emoji}</Text>
          <Text style={[styles.bannerTitle, { color: c.fg }]}>{label.title}</Text>
          <Text style={[styles.bannerSubtitle, { color: c.fg }]}>{label.subtitle}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {product && (product.name || product.brand) ? (
            <View style={styles.product}>
              {product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.productImg} /> : null}
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

          {result.aiSummaryRu ? (
            <View style={styles.summary}>
              <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
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
              {result.traces.map((i) => (
                <IssueCard key={i.key} issue={i} />
              ))}
            </>
          ) : null}

          {result.notes.length > 0 ? (
            <View style={styles.notes}>
              {result.notes.map((n) => (
                <Text key={n} style={styles.note}>
                  ⓘ {n}
                </Text>
              ))}
            </View>
          ) : null}

          {result.ingredientsText ? (
            <>
              <Text style={styles.h2}>Состав</Text>
              <Text style={styles.muted}>{INGREDIENTS_SOURCE_LABELS[result.ingredientsSource]}</Text>
              <View style={styles.ingredientsBox}>
                {splitIngredients(result.ingredientsText).map((ing, idx) => (
                  <Text key={`${idx}-${ing}`} style={styles.ingredient}>
                    • {ing}
                  </Text>
                ))}
              </View>
            </>
          ) : null}

          {product?.sources?.length ? (
            <>
              <Text style={styles.h2}>Источники</Text>
              {product.sources.slice(0, 5).map((src) => (
                <Pressable key={src.uri} onPress={() => Linking.openURL(src.uri)}>
                  <Text style={styles.link} numberOfLines={1}>
                    {src.title || src.uri}
                  </Text>
                </Pressable>
              ))}
            </>
          ) : null}
        </ScrollView>

        <Pressable style={styles.nextBtn} onPress={onClose} accessibilityRole="button">
          <Ionicons name="scan-outline" size={20} color={colors.white} />
          <Text style={styles.nextText}>Сканировать следующий товар</Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  banner: { paddingTop: 36, paddingBottom: 24, alignItems: 'center', paddingHorizontal: 20 },
  bannerEmoji: { fontSize: 44 },
  bannerTitle: { fontSize: 30, fontWeight: '800', letterSpacing: 1, marginTop: 6 },
  bannerSubtitle: { fontSize: 14, marginTop: 4, textAlign: 'center', opacity: 0.9 },
  content: { padding: 16, paddingBottom: 32 },
  product: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
  productImg: { width: 56, height: 56, borderRadius: 8, backgroundColor: colors.border },
  productName: { fontSize: 17, fontWeight: '700', color: colors.text },
  muted: { fontSize: 14, color: colors.textMuted },
  summary: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  summaryText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 19 },
  h2: { fontSize: 17, fontWeight: '700', color: colors.text, marginTop: 18, marginBottom: 8 },
  issue: { borderLeftWidth: 4, borderRadius: 8, padding: 12, marginBottom: 8 },
  issueOriginal: { fontSize: 16, fontWeight: '700', color: colors.text },
  issueTranslation: { fontSize: 15, color: colors.text, marginTop: 2 },
  issueReason: { fontSize: 14, color: colors.textMuted, marginTop: 4, lineHeight: 19 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' },
  tag: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  source: { fontSize: 12, color: colors.textMuted },
  notes: { marginTop: 16, gap: 4 },
  note: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  link: { color: colors.primary, fontSize: 15, fontWeight: '600', paddingVertical: 4 },
  ingredientsBox: { backgroundColor: colors.card, borderRadius: 10, padding: 12, marginTop: 8, gap: 4 },
  ingredient: { fontSize: 15, color: colors.text, lineHeight: 20 },
  nextBtn: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    margin: 16,
    paddingVertical: 16,
    borderRadius: 14,
  },
  nextText: { color: colors.white, fontSize: 17, fontWeight: '700' },
});
