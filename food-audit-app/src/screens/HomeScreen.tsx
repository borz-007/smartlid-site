import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResultModal } from '../components/ResultModal';
import { useProfile } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import { auditBarcode } from '../engine/auditor';
import { useI18n } from '../i18n';
import { getCachedResult } from '../storage/cacheStorage';
import { userMessage } from '../services/http';
import { isValidBarcode, searchProductsByName, type SearchResult } from '../services/openFoodFacts';
import type { ScanResult } from '../types';

interface Props {
  onScanBarcode: () => void;
  onScanPhoto: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenFavorites: () => void;
  activeProfileName?: string;
}

export function HomeScreen({
  onScanBarcode,
  onScanPhoto,
  onOpenSettings,
  onOpenHistory,
  onOpenFavorites,
  activeProfileName,
}: Props) {
  const { colors } = useTheme();
  const { profile } = useProfile();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [resultId, setResultId] = useState(0);

  const doSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setSearchResults([]);
      setShowSearch(false);
      return;
    }
    setShowSearch(true);
    setSearching(true);
    try {
      const res = await searchProductsByName(text.trim());
      setSearchResults(res);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleManualBarcode = useCallback(async () => {
    const code = query.trim();
    if (!isValidBarcode(code)) {
      Alert.alert(t('invalid_barcode'), t('invalid_barcode_msg'));
      return;
    }
    setBusy(true);
    setShowSearch(false);
    try {
      const cached = await getCachedResult(code);
      if (cached) {
        setResult(cached);
        setResultId((n) => n + 1);
        return;
      }
      const r = await auditBarcode(code, profile, setBusyText);
      setResult(r);
      setResultId((n) => n + 1);
    } catch (e) {
      Alert.alert(t('error'), userMessage(e, t('error_check')));
    } finally {
      setBusy(false);
    }
  }, [query, profile, t]);

  const handleSelectProduct = useCallback(async (item: SearchResult) => {
    setShowSearch(false);
    setQuery('');
    setBusy(true);
    try {
      const cached = await getCachedResult(item.barcode);
      if (cached) {
        setResult(cached);
        setResultId((n) => n + 1);
        return;
      }
      const r = await auditBarcode(item.barcode, profile, setBusyText);
      setResult(r);
      setResultId((n) => n + 1);
    } catch (e) {
      Alert.alert(t('error'), userMessage(e, t('error_check')));
    } finally {
      setBusy(false);
    }
  }, [profile, t]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={onOpenHistory} hitSlop={12} accessibilityLabel={t('history')}>
            <Ionicons name="time-outline" size={26} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Food Audit</Text>
          <Pressable onPress={onOpenSettings} hitSlop={12} accessibilityLabel={t('profile')}>
            <Ionicons name="settings-outline" size={26} color={colors.text} />
          </Pressable>
        </View>

        {activeProfileName ? (
          <View style={styles.profileRow}>
            <Ionicons name="person-circle-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.profileName, { color: colors.textMuted }]}>{activeProfileName}</Text>
          </View>
        ) : null}

        <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={doSearch}
            placeholder={t('search_placeholder')}
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={handleManualBarcode}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => { setQuery(''); setShowSearch(false); setSearchResults([]); }}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {showSearch && (searching || searchResults.length > 0) ? (
          <View style={[styles.searchDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {searching ? (
              <ActivityIndicator style={{ padding: 16 }} />
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(r) => r.barcode}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: 220 }}
                renderItem={({ item }) => (
                  <Pressable style={[styles.searchItem, { borderBottomColor: colors.border }]} onPress={() => handleSelectProduct(item)}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.searchThumb} />
                    ) : (
                      <View style={[styles.searchThumb, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
                        <Ionicons name="cube-outline" size={18} color={colors.textMuted} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.searchName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                      {item.brand ? <Text style={{ fontSize: 12, color: colors.textMuted }}>{item.brand}</Text> : null}
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>
        ) : null}

        <View style={styles.body}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="shield-checkmark" size={64} color={colors.white} />
          </View>
          <Text style={[styles.subtitle, { color: colors.text }]}>{t('check_ingredients')}</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>{t('halal_vegan_allergens')}</Text>

          <View style={styles.buttons}>
            <Pressable style={[styles.bigBtn, { backgroundColor: colors.card }]} onPress={onScanBarcode}>
              <View style={[styles.iconCircle, { backgroundColor: colors.bg }]}>
                <Ionicons name="barcode-outline" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.btnTitle, { color: colors.text }]}>{t('scan_barcode')}</Text>
              <Text style={[styles.btnDesc, { color: colors.textMuted }]}>{t('scan_barcode_hint')}</Text>
            </Pressable>

            <Pressable style={[styles.bigBtn, { backgroundColor: colors.card }]} onPress={onScanPhoto}>
              <View style={[styles.iconCircle, { backgroundColor: colors.bg }]}>
                <Ionicons name="document-text-outline" size={36} color="#12B76A" />
              </View>
              <Text style={[styles.btnTitle, { color: colors.text }]}>{t('scan_photo')}</Text>
              <Text style={[styles.btnDesc, { color: colors.textMuted }]}>{t('scan_photo_hint')}</Text>
            </Pressable>
          </View>

          <View style={styles.quickLinks}>
            <Pressable style={[styles.quickBtn, { backgroundColor: colors.card }]} onPress={onOpenHistory}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={[styles.quickText, { color: colors.text }]}>{t('history')}</Text>
            </Pressable>
            <Pressable style={[styles.quickBtn, { backgroundColor: colors.card }]} onPress={onOpenFavorites}>
              <Ionicons name="heart-outline" size={20} color="#D92D20" />
              <Text style={[styles.quickText, { color: colors.text }]}>{t('favorites')}</Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.footer, { color: colors.textMuted }]}>
          {t('disclaimer_footer')}
        </Text>
      </KeyboardAvoidingView>

      {busy ? (
        <View style={styles.busyOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.busyText}>{busyText}</Text>
        </View>
      ) : null}

      <ResultModal
        key={resultId}
        result={result}
        onClose={() => setResult(null)}
        profile={profile}
        onSelectAlternative={(barcode) => { setResult(null); setQuery(barcode); handleSelectProduct({ barcode, name: '' }); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: '800' },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, marginBottom: 4 },
  profileName: { fontSize: 13, fontWeight: '600' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6,
  },
  searchInput: { flex: 1, fontSize: 15 },
  searchDropdown: {
    marginHorizontal: 16, borderRadius: 12, borderWidth: 1,
    marginTop: 4, overflow: 'hidden',
  },
  searchItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchThumb: { width: 36, height: 36, borderRadius: 6 },
  searchName: { fontSize: 14, fontWeight: '600' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  logoCircle: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: '#1F6FEB', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 12,
  },
  subtitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  hint: { fontSize: 14, marginTop: 4, marginBottom: 24 },
  buttons: { width: '100%', gap: 12 },
  bigBtn: {
    borderRadius: 20, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  btnTitle: { fontSize: 17, fontWeight: '700' },
  btnDesc: { fontSize: 13, marginTop: 2, textAlign: 'center' },
  quickLinks: { flexDirection: 'row', gap: 12, marginTop: 16, width: '100%' },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  quickText: { fontSize: 14, fontWeight: '600' },
  footer: { fontSize: 12, textAlign: 'center', paddingHorizontal: 24, paddingBottom: 8 },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', gap: 12,
  },
  busyText: { color: '#FFFFFF', fontSize: 16 },
});
