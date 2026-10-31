import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ToggleRow } from '../components/ToggleRow';
import { ALLERGENS } from '../constants/allergens';
import { isAIConfigured } from '../constants/config';
import { colors } from '../constants/theme';
import { useProfile } from '../context/ProfileContext';

interface Props {
  onClose: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export function SettingsScreen({ onClose }: Props) {
  const { profile, update, toggleAllergen, addStopWord, removeStopWord } = useProfile();
  const [draft, setDraft] = useState('');

  const submitWord = () => {
    addStopWord(draft);
    setDraft('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Назад к сканеру">
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Профиль</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Section title="Религиозные стандарты">
            <ToggleRow
              label="Halal (строгий фильтр)"
              hint="Свинина, сало, алкоголь, кармин E120, желатин без сертификата; E471/E422 и сычужный фермент — сомнительно"
              value={profile.halal}
              onValueChange={(v) => update({ halal: v })}
            />
          </Section>

          <Section title="Этические стандарты">
            <ToggleRow
              label="Vegan"
              hint="Мясо, рыба, молоко, яйца, мёд, кармин, шеллак E904, воск E901"
              value={profile.vegan}
              onValueChange={(v) => update({ vegan: v })}
            />
            <ToggleRow
              label="Vegetarian"
              hint={profile.vegan ? 'Включено автоматически вместе с Vegan' : 'Убойные продукты и сычужный фермент; молоко и яйца разрешены'}
              value={profile.vegetarian || profile.vegan}
              disabled={profile.vegan}
              onValueChange={(v) => update({ vegetarian: v })}
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
              />
            ))}
            <ToggleRow
              label="Учитывать следы"
              hint="«kan sporen bevatten…», «peut contenir des traces…» — считать критическим риском"
              value={profile.considerTraces}
              onValueChange={(v) => update({ considerTraces: v })}
            />
          </Section>

          <Section title="Персональные стоп-слова">
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="например: пальмовое масло"
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={submitWord}
                returnKeyType="done"
              />
              <Pressable style={styles.addBtn} onPress={submitWord} accessibilityLabel="Добавить стоп-слово">
                <Ionicons name="add" size={22} color={colors.white} />
              </Pressable>
            </View>
            <View style={styles.chips}>
              {profile.customStopWords.length === 0 ? (
                <Text style={styles.hint}>Пока пусто. Слова на русском переводятся локально (частые) или через ИИ.</Text>
              ) : (
                profile.customStopWords.map((w) => (
                  <Pressable key={w} style={styles.chip} onPress={() => removeStopWord(w)} accessibilityLabel={`Удалить ${w}`}>
                    <Text style={styles.chipText}>{w}</Text>
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
                  ? 'Gemini ищет состав в интернете, если товара нет в базе, и проверяет каждый состав. Явный запрет находится локально без ИИ.'
                  : 'Ключ EXPO_PUBLIC_GEMINI_API_KEY не задан — работает только локальный фильтр'
              }
              value={profile.aiEnabled}
              onValueChange={(v) => update({ aiEnabled: v })}
            />
          </Section>

          <Text style={styles.disclaimer}>
            Приложение — вспомогательный инструмент. При тяжёлой аллергии всегда сверяйтесь с этикеткой и
            производителем: базы данных и распознавание могут содержать ошибки.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  content: { paddingBottom: 40 },
  section: { marginTop: 18 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginBottom: 6,
  },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    fontSize: 16,
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingBottom: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.bg,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 14, color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted },
  disclaimer: { fontSize: 12, color: colors.textMuted, margin: 16, lineHeight: 17 },
});
