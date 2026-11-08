import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ToggleRow } from '../components/ToggleRow';
import { ALLERGENS } from '../constants/allergens';
import { isAIConfigured } from '../constants/config';
import { useProfile } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import { SUPPORTED_LOCALES, useI18n } from '../i18n';
import { resetOnboarding } from '../storage/onboardingStorage';
import { clearHistory } from '../storage/historyStorage';
import { clearFavorites, clearBlacklist } from '../storage/favoritesStorage';
import { clearCache } from '../storage/cacheStorage';

interface Props {
  onClose: () => void;
}

export function SettingsScreen({ onClose }: Props) {
  const { colors, mode, setMode } = useTheme();
  const { profile, update, toggleAllergen, addStopWord, removeStopWord } = useProfile();
  const { t, locale, setLocale } = useI18n();
  const [draft, setDraft] = useState('');

  const submitWord = () => {
    addStopWord(draft);
    setDraft('');
  };

  function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
        <View style={[styles.card, { backgroundColor: colors.card }]}>{children}</View>
      </View>
    );
  }

  const handleClearAll = () => {
    Alert.alert(t('clear_all_confirm'), t('clear_all_msg'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await Promise.all([clearHistory(), clearFavorites(), clearBlacklist(), clearCache()]);
          Alert.alert(t('done'), t('all_cleared'));
        },
      },
    ]);
  };

  const handleResetOnboarding = async () => {
    await resetOnboarding();
    Alert.alert(t('done'), t('redo_onboarding_msg'));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel={t('history')}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Section title={t('appearance')}>
            <View style={[styles.themeRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.themeLabel, { color: colors.text }]}>{t('theme')}</Text>
              <View style={styles.themeBtns}>
                {(['system', 'light', 'dark'] as const).map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.themeBtn, mode === m && { backgroundColor: colors.primary }]}
                    onPress={() => setMode(m)}
                  >
                    <Text style={[styles.themeBtnText, { color: mode === m ? colors.white : colors.text }]}>
                      {m === 'system' ? t('theme_auto') : m === 'light' ? t('theme_light') : t('theme_dark')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={[styles.themeRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.themeLabel, { color: colors.text }]}>{t('language')}</Text>
              <View style={styles.langBtns}>
                {SUPPORTED_LOCALES.map((l) => (
                  <Pressable
                    key={l.code}
                    style={[styles.langBtn, locale === l.code && { backgroundColor: colors.primary }]}
                    onPress={() => setLocale(l.code)}
                  >
                    <Text style={styles.langFlag}>{l.flag}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Section>

          <Section title={t('religious')}>
            <ToggleRow
              label={t('halal_filter')}
              hint={t('halal_full_hint')}
              value={profile.halal}
              onValueChange={(v) => update({ halal: v })}
              colors={colors}
            />
          </Section>

          <Section title={t('ethical')}>
            <ToggleRow
              label="Vegan"
              hint={t('vegan_full_hint')}
              value={profile.vegan}
              onValueChange={(v) => update({ vegan: v })}
              colors={colors}
            />
            <ToggleRow
              label="Vegetarian"
              hint={profile.vegan ? t('veg_auto_hint') : t('veg_full_hint')}
              value={profile.vegetarian || profile.vegan}
              disabled={profile.vegan}
              onValueChange={(v) => update({ vegetarian: v })}
              colors={colors}
            />
          </Section>

          <Section title={t('eu_allergens')}>
            {ALLERGENS.map((a) => (
              <ToggleRow
                key={a.id}
                label={t(a.labelKey)}
                hint={t(a.hintKey)}
                value={profile.allergens[a.id]}
                onValueChange={() => toggleAllergen(a.id)}
                colors={colors}
              />
            ))}
            <ToggleRow
              label={t('consider_traces')}
              hint={t('traces_hint_settings')}
              value={profile.considerTraces}
              onValueChange={(v) => update({ considerTraces: v })}
              colors={colors}
            />
          </Section>

          <Section title={t('stop_words')}>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                value={draft}
                onChangeText={setDraft}
                placeholder={t('stop_word_placeholder')}
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={submitWord}
                returnKeyType="done"
              />
              <Pressable style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={submitWord}>
                <Ionicons name="add" size={22} color={colors.white} />
              </Pressable>
            </View>
            <View style={styles.chips}>
              {profile.customStopWords.length === 0 ? (
                <Text style={[styles.hintText, { color: colors.textMuted }]}>{t('empty_stop')}</Text>
              ) : (
                profile.customStopWords.map((w) => (
                  <Pressable key={w} style={[styles.chip, { backgroundColor: colors.bg }]} onPress={() => removeStopWord(w)}>
                    <Text style={[styles.chipText, { color: colors.text }]}>{w}</Text>
                    <Ionicons name="close" size={14} color={colors.textMuted} />
                  </Pressable>
                ))
              )}
            </View>
          </Section>

          <Section title={t('ai_auditor')}>
            <ToggleRow
              label={t('ai_toggle')}
              hint={isAIConfigured() ? t('ai_hint_configured') : t('ai_hint_not_configured')}
              value={profile.aiEnabled}
              onValueChange={(v) => update({ aiEnabled: v })}
              colors={colors}
            />
          </Section>

          <Section title={t('data_section')}>
            <Pressable style={[styles.textBtn, { borderBottomColor: colors.border }]} onPress={handleClearAll}>
              <Ionicons name="trash-outline" size={20} color="#D92D20" />
              <Text style={[styles.textBtnLabel, { color: '#D92D20' }]}>{t('clear_all')}</Text>
            </Pressable>
            <Pressable style={[styles.textBtn, { borderBottomColor: colors.border }]} onPress={handleResetOnboarding}>
              <Ionicons name="refresh-outline" size={20} color={colors.primary} />
              <Text style={[styles.textBtnLabel, { color: colors.primary }]}>{t('redo_onboarding')}</Text>
            </Pressable>
          </Section>

          <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
            {t('settings_disclaimer')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  content: { paddingBottom: 40 },
  section: { marginTop: 18 },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', textTransform: 'uppercase',
    marginHorizontal: 16, marginBottom: 6,
  },
  card: { marginHorizontal: 12, borderRadius: 12, overflow: 'hidden' },
  themeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  themeLabel: { fontSize: 16, fontWeight: '500' },
  themeBtns: { flexDirection: 'row', gap: 6 },
  themeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  themeBtnText: { fontSize: 13, fontWeight: '600' },
  langBtns: { flexDirection: 'row', gap: 4 },
  langBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  langFlag: { fontSize: 20 },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8 },
  input: {
    flex: 1, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6, fontSize: 16,
  },
  addBtn: { borderRadius: 10, width: 44, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6,
  },
  chipText: { fontSize: 14 },
  hintText: { fontSize: 13 },
  textBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textBtnLabel: { fontSize: 15, fontWeight: '500' },
  disclaimer: { fontSize: 12, margin: 16, lineHeight: 17 },
});
