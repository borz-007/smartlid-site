import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSeverityLabels, getSpecificVerdicts, severityColors } from '../constants/theme';
import { splitIngredients } from '../engine/ingredients';
import { submitCommunityReport, type ReportKind } from '../services/community';
import { userMessage } from '../services/http';
import { prepareImageForAi } from '../services/image';
import { pickReportPhoto } from '../services/reportPhoto';
import { useI18n } from '../i18n';
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
import type { ExpiryResult, IngredientsSource, Issue, IssueCategory, ScanResult, SavedProduct, UserProfile } from '../types';
import { NutriScoreBar } from './NutriScoreBar';
import { EcoScoreBar } from './EcoScoreBar';
import { NutrientFactorsList } from './NutrientFactorsList';
import { AdditivesList } from './AdditivesList';
import { AlternativesSection } from './AlternativesSection';
import { ExpiryBadge } from './ExpiryBadge';
import { IngredientsList } from './IngredientsList';
import { SugarIndicator } from './SugarIndicator';

interface Props {
  result: ScanResult | null;
  onClose: () => void;
  profile?: UserProfile;
  expiry?: ExpiryResult | null;
  onSelectAlternative?: (barcode: string) => void;
  /** false — просмотр уже сохранённого результата (из истории): не писать его в историю и кэш повторно. */
  saveToHistory?: boolean;
}

function IssueCard({ issue, categoryLabels, sourceLabels }: { issue: Issue; categoryLabels: Record<IssueCategory, string>; sourceLabels: Record<Issue['source'], string> }) {
  const c = severityColors[issue.severity];
  return (
    <View style={[styles.issue, { borderLeftColor: c.bg, backgroundColor: c.soft }]}>
      <Text style={styles.issueOriginal}>{issue.original}</Text>
      <Text style={styles.issueTranslation}>— {issue.translationRu}</Text>
      {issue.reasonRu ? <Text style={styles.issueReason}>{issue.reasonRu}</Text> : null}
      <View style={styles.tags}>
        {issue.categories.map((cat) => (
          <Text key={cat} style={styles.tag}>{categoryLabels[cat]}</Text>
        ))}
        <Text style={styles.source}>{sourceLabels[issue.source]}</Text>
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

export function ResultModal({ result, onClose, profile, expiry, onSelectAlternative, saveToHistory = true }: Props) {
  const { t } = useI18n();
  const [fav, setFav] = useState(false);
  const [bl, setBl] = useState(false);
  const [reporting, setReporting] = useState(false);

  const severityLabelsI18n = getSeverityLabels(t);
  const specificVerdictsI18n = getSpecificVerdicts(t);

  const ingredientsSourceLabels: Record<IngredientsSource, string> = {
    openfoodfacts: t('source_off'),
    web: t('source_web'),
    manufacturer: t('source_manufacturer'),
    photo: t('source_photo'),
  };

  const categoryLabels: Record<IssueCategory, string> = {
    halal: t('cat_halal'),
    vegan: t('cat_vegan'),
    vegetarian: t('cat_vegetarian'),
    allergen: t('cat_allergen'),
    custom: t('cat_stopword'),
    other: t('cat_other'),
  };

  const sourceLabels: Record<Issue['source'], string> = {
    local: t('source_local'),
    ai: t('source_ai'),
    openfoodfacts: t('source_openfoodfacts'),
    community: t('community_title'),
  };

  useEffect(() => {
    if (!result) return;
    if (saveToHistory) {
      addToHistory(result);
      if (result.product?.barcode) setCachedResult(result.product.barcode, result);
    }
    const bc = result.product?.barcode;
    const nm = result.product?.name;
    isFavorite(bc, nm).then(setFav);
    isBlacklisted(bc, nm).then(setBl);
  }, [result]);

  if (!result) return null;

  const c = severityColors[result.verdict];
  const label = severityLabelsI18n[result.verdict];

  const getSpecificTitle = (): string | null => {
    if (result.verdict !== 'BANNED') return null;
    const cats = result.issues.filter((i) => i.severity === 'BANNED').flatMap((i) => i.categories);
    for (const key of ['halal', 'vegan', 'vegetarian', 'allergen', 'custom'] as const) {
      if (cats.includes(key) && specificVerdictsI18n[key]) return specificVerdictsI18n[key].title;
    }
    return null;
  };

  const getSpecificSubtitle = (): string | null => {
    if (result.verdict !== 'BANNED') return null;
    const cats = result.issues.filter((i) => i.severity === 'BANNED').flatMap((i) => i.categories);
    for (const key of ['halal', 'vegan', 'vegetarian', 'allergen', 'custom'] as const) {
      if (cats.includes(key) && specificVerdictsI18n[key]) return specificVerdictsI18n[key].subtitle;
    }
    return null;
  };

  const specTitle = getSpecificTitle();
  const specSubtitle = getSpecificSubtitle();
  const { product } = result;

  const shouldShowAlternatives = profile && result.categoryTag && (
    result.verdict === 'BANNED' ||
    (result.nutriScore && (result.nutriScore.grade === 'd' || result.nutriScore.grade === 'e'))
  );

  const handleShare = async () => {
    const name = product?.name || t('product');
    const issues = result.issues.map((i) => `- ${i.translationRu}`).join('\n');
    const nsInfo = result.nutriScore ? ` | Nutri-Score: ${result.nutriScore.grade.toUpperCase()} (${result.nutriScore.score100}/100)` : '';
    const text = `${name}${nsInfo}\n${t('verdict_text')}: ${specTitle || label.title}\n${issues ? `\n${t('issues_found')}:\n${issues}` : t('no_issues_short')}\n\n${t('checked_by')}`;
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

  const startReport = (kind: ReportKind) => {
    const barcode = product?.barcode;
    if (!barcode) {
      Alert.alert(t('report_need_barcode'));
      return;
    }
    const haram = kind === 'haram';
    const run = async (source: 'camera' | 'gallery') => {
      setReporting(true);
      try {
        const picked = await pickReportPhoto(source);
        if (picked.status === 'denied') {
          Alert.alert(t('report_permission'));
          return;
        }
        if (picked.status !== 'ok') return;
        const imageBase64 = await prepareImageForAi(picked.photo, { maxSide: 1280, quality: 0.6 });
        await submitCommunityReport({ kind, barcode, productName: product?.name, imageBase64 });
        Alert.alert(t('report_thanks_title'), t('report_thanks_msg'));
      } catch (e) {
        Alert.alert(t('error'), userMessage(e, t('error_check')));
      } finally {
        setReporting(false);
      }
    };
    Alert.alert(t(haram ? 'report_choose_title_haram' : 'report_choose_title_halal'), t(haram ? 'report_hint_haram' : 'report_hint_halal'), [
      { text: t('report_camera'), onPress: () => run('camera') },
      { text: t('report_gallery'), onPress: () => run('gallery') },
      { text: t('cancel'), style: 'cancel' },
    ]);
  };

  const communityColors = result.community
    ? severityColors[result.community.status === 'haram' ? 'BANNED' : result.community.status === 'disputed' ? 'WARNING' : 'SAFE']
    : null;

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
                <Text style={styles.productName}>{product.name ?? t('no_name')}</Text>
                {product.brand ? <Text style={styles.muted}>{product.brand}</Text> : null}
                {product.manufacturer && product.manufacturer !== product.brand ? (
                  <Text style={styles.muted}>{t('manufacturer')}: {product.manufacturer}</Text>
                ) : null}
                {product.barcode ? <Text style={styles.muted}>{product.barcode}</Text> : null}
              </View>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable style={styles.actionBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color="#1F6FEB" />
              <Text style={styles.actionLabel}>{t('share')}</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={toggleFav}>
              <Ionicons name={fav ? 'heart' : 'heart-outline'} size={20} color={fav ? '#D92D20' : '#1F6FEB'} />
              <Text style={styles.actionLabel}>{fav ? t('in_favorites') : t('add_favorite')}</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={toggleBl}>
              <Ionicons name={bl ? 'ban' : 'ban-outline'} size={20} color={bl ? '#D92D20' : '#1F6FEB'} />
              <Text style={styles.actionLabel}>{bl ? t('in_blacklist') : t('add_blacklist')}</Text>
            </Pressable>
          </View>

          <View style={styles.feedbackRow}>
            <Pressable
              style={[styles.feedbackBtn, { borderColor: '#D92D20' }]}
              onPress={() => startReport('haram')}
              disabled={reporting}
              accessibilityRole="button"
            >
              <Text style={[styles.feedbackText, { color: '#D92D20' }]}>{t('report_not_halal')}</Text>
            </Pressable>
            <Pressable
              style={[styles.feedbackBtn, { borderColor: '#12B76A' }]}
              onPress={() => startReport('halal')}
              disabled={reporting}
              accessibilityRole="button"
            >
              <Text style={[styles.feedbackText, { color: '#067647' }]}>{t('report_confirm_halal')}</Text>
            </Pressable>
          </View>
          {reporting ? (
            <View style={styles.sending}>
              <ActivityIndicator size="small" color="#1F6FEB" />
              <Text style={styles.muted}>{t('report_sending')}</Text>
            </View>
          ) : null}

          {result.community && result.community.status !== 'none' && communityColors ? (
            <View style={[styles.community, { backgroundColor: communityColors.soft, borderLeftColor: communityColors.bg }]}>
              <Text style={styles.communityTitle}>{t('community_title')}</Text>
              <Text style={styles.communityText}>{t(`community_${result.community.status}`)}</Text>
            </View>
          ) : null}

          {/* Expiry Badge */}
          {expiry && expiry.date ? <ExpiryBadge data={expiry} /> : null}

          {/* Nutri-Score */}
          {result.nutriScore ? <NutriScoreBar data={result.nutriScore} /> : null}

          {/* Сахар в кубиках/ложках */}
          <SugarIndicator sugars={result.nutriments?.sugars} />

          {/* Eco-Score */}
          {result.ecoScore ? <EcoScoreBar data={result.ecoScore} /> : null}

          {/* Nutrient Factors */}
          {result.nutrientFactors && result.nutrientFactors.length > 0 ? (
            <NutrientFactorsList factors={result.nutrientFactors} />
          ) : null}

          {/* Additives */}
          {result.additives && result.additives.length > 0 ? (
            <AdditivesList additives={result.additives} />
          ) : null}

          {result.aiSummaryRu ? (
            <View style={styles.summary}>
              <Ionicons name="sparkles-outline" size={16} color="#1F6FEB" />
              <Text style={styles.summaryText}>{result.aiSummaryRu}</Text>
            </View>
          ) : null}

          <Text style={styles.h2}>{t('issues_found')}</Text>
          {result.issues.length === 0 ? (
            <Text style={styles.muted}>{t('no_issues')}</Text>
          ) : (
            result.issues.map((i) => <IssueCard key={i.key} issue={i} categoryLabels={categoryLabels} sourceLabels={sourceLabels} />)
          )}

          {result.traces.length > 0 ? (
            <>
              <Text style={styles.h2}>{t('allergen_traces')}</Text>
              {result.traces.map((i) => <IssueCard key={i.key} issue={i} categoryLabels={categoryLabels} sourceLabels={sourceLabels} />)}
            </>
          ) : null}

          {result.notes.length > 0 ? (
            <View style={styles.notes}>
              {result.notes.map((n) => (
                <Text key={n} style={styles.note}>{n}</Text>
              ))}
            </View>
          ) : null}

          {result.ingredientsText ? (
            <>
              <Text style={styles.h2}>{t('ingredients')}</Text>
              <Text style={styles.muted}>{ingredientsSourceLabels[result.ingredientsSource]}</Text>
              <IngredientsList
                ingredients={splitIngredients(result.ingredientsText)}
                issues={result.issues}
                additives={profile?.halal ? result.additives : undefined}
              />
            </>
          ) : null}

          {product?.sources?.length ? (
            <>
              <Text style={styles.h2}>{t('sources')}</Text>
              {product.sources.slice(0, 5).map((src) => (
                <Pressable key={src.uri} onPress={() => Linking.openURL(src.uri)}>
                  <Text style={styles.link} numberOfLines={1}>{src.title || src.uri}</Text>
                </Pressable>
              ))}
            </>
          ) : null}

          {/* Alternatives */}
          {shouldShowAlternatives && profile ? (
            <AlternativesSection
              categoryTag={result.categoryTag}
              profile={profile}
              excludeBarcode={product?.barcode}
              onSelect={onSelectAlternative}
            />
          ) : null}
        </ScrollView>

        <Pressable style={styles.nextBtn} onPress={onClose} accessibilityRole="button">
          <Ionicons name="scan-outline" size={20} color="#FFFFFF" />
          <Text style={styles.nextText}>{t('scan_next')}</Text>
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
    paddingVertical: 12, marginBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E3E6EB',
  },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionLabel: { fontSize: 11, color: '#5B6372' },
  summary: {
    flexDirection: 'row', gap: 8, backgroundColor: '#FFFFFF',
    padding: 12, borderRadius: 10, marginBottom: 10,
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
  feedbackRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  feedbackBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', backgroundColor: '#FFFFFF' },
  feedbackText: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  sending: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  community: { borderLeftWidth: 4, borderRadius: 8, padding: 12, marginBottom: 10 },
  communityTitle: { fontSize: 12, fontWeight: '700', color: '#5B6372', marginBottom: 2 },
  communityText: { fontSize: 14, fontWeight: '700', color: '#14171F' },
  nextBtn: {
    flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1F6FEB', margin: 16, paddingVertical: 16, borderRadius: 14,
  },
  nextText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
});
