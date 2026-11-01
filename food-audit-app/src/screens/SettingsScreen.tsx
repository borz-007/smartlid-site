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
    Alert.alert('Очистить все данные?', 'История, избранное, чёрный список и кэш будут удалены', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          await Promise.all([clearHistory(), clearFavorites(), clearBlacklist(), clearCache()]);
          Alert.alert('Готово', 'Все данные очищены');
        },
      },
    ]);
  };

  const handleResetOnboarding = async () => {
    await resetOnboarding();
    Alert.alert('Готово', 'При следующем запуске приложение покажет экран приветствия');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Назад">
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Профиль</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Section title="Оформление">
            <View style={[styles.themeRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.themeLabel, { color: colors.text }]}>Тема</Text>
              <View style={styles.themeBtns}>
                {(['system', 'light', 'dark'] as const).map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.themeBtn, mode === m && { backgroundColor: colors.primary }]}
                    onPress={() => setMode(m)}
                  >
                    <Text style={[styles.themeBtnText, { color: mode === m ? colors.white : colors.text }]}>
                      {m === 'system' ? 'Авто' : m === 'light' ? 'Светлая' : 'Тёмная'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Section>

          <Section title="Религиозные стандарты">
            <ToggleRow
              label="Halal (строгий фильтр)"
              hint="Свинина, сало, алкоголь, кармин E120, желатин без сертификата; E471/E422 и сычужный фермент — сомнительно"
              value={profile.halal}
              onValueChange={(v) => update({ halal: v })}
              colors={colors}
            />
          </Section>

          <Section title="Этические стандарты">
            <ToggleRow
              label="Vegan"
              hint="Мясо, рыба, молоко, яйца, мёд, кармин, шеллак E904, воск E901"
              value={profile.vegan}
              onValueChange={(v) => update({ vegan: v })}
              colors={colors}
            />
            <ToggleRow
              label="Vegetarian"
              hint={profile.vegan ? 'Включено автоматически вместе с Vegan' : 'Убойные продукты и сычужный фермент; молоко и яйца разрешены'}
              value={profile.vegetarian || profile.vegan}
              disabled={profile.vegan}
              onValueChange={(v) => update({ vegetarian: v })}
              colors={colors}
            />
          </Section>

          <Section title="Аллергены (14 по нормам ЕС)">
            {ALLERGENS.map((a) => (
              <ToggleRow
                key={a.id}
                label={a.labelRu}
                hint={a.hintRu}
                value={profile.allergens[a.id]}
                onValueChange={() => toggleAllergen(a.id)}
                colors={colors}
              />
            ))}
            <ToggleRow
              label="Учитывать следы"
              hint="«kan sporen bevatten…», «peut contenir des traces…» — считать критическим риском"
              value={profile.considerTraces}
              onValueChange={(v) => update({ considerTraces: v })}
              colors={colors}
            />
          </Section>

          <Section title="Персональные стоп-слова">
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                value={draft}
                onChangeText={setDraft}
                placeholder="например: пальмовое масло"
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={submitWord}
                returnKeyType="done"
              />
              <Pressable style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={submitWord} accessibilityLabel="Добавить">
                <Ionicons name="add" size={22} color={colors.white} />
              </Pressable>
            </View>
            <View style={styles.chips}>
              {profile.customStopWords.length === 0 ? (
                <Text style={[styles.hintText, { color: colors.textMuted }]}>Пока пусто.</Text>
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

          <Section title="ИИ-аудитор">
            <ToggleRow
              label="Проверять сложные составы через Gemini"
              hint={
                isAIConfigured()
                  ? 'Gemini ищет состав в интернете, если товара нет в базе, и проверяет каждый состав.'
                  : 'Ключ EXPO_PUBLIC_GEMINI_API_KEY не задан — работает только локальный фильтр'
              }
              value={profile.aiEnabled}
              onValueChange={(v) => update({ aiEnabled: v })}
              colors={colors}
            />
          </Section>

          <Section title="Данные">
            <Pressable style={[styles.textBtn, { borderBottomColor: colors.border }]} onPress={handleClearAll}>
              <Ionicons name="trash-outline" size={20} color="#D92D20" />
              <Text style={[styles.textBtnLabel, { color: '#D92D20' }]}>Очистить все данные</Text>
            </Pressable>
            <Pressable style={[styles.textBtn, { borderBottomColor: colors.border }]} onPress={handleResetOnboarding}>
              <Ionicons name="refresh-outline" size={20} color={colors.primary} />
              <Text style={[styles.textBtnLabel, { color: colors.primary }]}>Пройти приветствие снова</Text>
            </Pressable>
          </Section>

          <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
            Приложение — вспомогательный инструмент. При тяжёлой аллергии всегда сверяйтесь с этикеткой и
            производителем: базы данных и распознавание могут содержать ошибки.
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
