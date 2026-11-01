import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ToggleRow } from '../components/ToggleRow';
import { ALLERGENS } from '../constants/allergens';
import { useProfile } from '../context/ProfileContext';
import { useTheme } from '../context/ThemeContext';
import { setOnboardingComplete } from '../storage/onboardingStorage';

interface Props {
  onDone: () => void;
}

type Step = 'disclaimer' | 'diet' | 'allergens';

export function OnboardingScreen({ onDone }: Props) {
  const { colors } = useTheme();
  const { update, toggleAllergen, profile } = useProfile();
  const [step, setStep] = useState<Step>('disclaimer');

  const finish = async () => {
    await setOnboardingComplete();
    onDone();
  };

  if (step === 'disclaimer') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name="shield-checkmark" size={56} color={colors.white} />
          </View>
          <Text style={[styles.bigTitle, { color: colors.text }]}>Food Audit</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Проверка состава продуктов{'\n'}Halal · Vegan · Аллергены
          </Text>

          <View style={[styles.disclaimerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="warning-outline" size={24} color="#F5B300" />
            <Text style={[styles.disclaimerText, { color: colors.text }]}>
              Это вспомогательный инструмент. Приложение использует базы данных и ИИ, которые могут содержать ошибки.{'\n\n'}
              При тяжёлой аллергии или строгих религиозных требованиях всегда сверяйтесь с этикеткой и производителем.{'\n\n'}
              Разработчик не несёт ответственности за решения, принятые на основе результатов проверки.
            </Text>
          </View>
        </ScrollView>

        <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => setStep('diet')}>
          <Text style={[styles.btnText, { color: colors.white }]}>Понятно, продолжить</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (step === 'diet') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
        <Text style={[styles.stepTitle, { color: colors.text }]}>Ваши стандарты питания</Text>
        <Text style={[styles.stepHint, { color: colors.textMuted }]}>Можно изменить позже в настройках</Text>

        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <ToggleRow
            label="Halal"
            hint="Свинина, алкоголь, кармин, желатин без сертификата"
            value={profile.halal}
            onValueChange={(v) => update({ halal: v })}
          />
          <ToggleRow
            label="Vegan"
            hint="Мясо, рыба, молоко, яйца, мёд, кармин"
            value={profile.vegan}
            onValueChange={(v) => update({ vegan: v })}
          />
          <ToggleRow
            label="Vegetarian"
            hint="Убойные продукты; молоко и яйца разрешены"
            value={profile.vegetarian || profile.vegan}
            disabled={profile.vegan}
            onValueChange={(v) => update({ vegetarian: v })}
          />
        </View>

        <View style={{ flex: 1 }} />
        <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={() => setStep('allergens')}>
          <Text style={[styles.btnText, { color: colors.white }]}>Далее</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Аллергены</Text>
      <Text style={[styles.stepHint, { color: colors.textMuted }]}>Выберите продукты, на которые есть аллергия</Text>

      <ScrollView style={{ flex: 1 }}>
        <View style={[styles.card, { backgroundColor: colors.card }]}>
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
            hint="«Может содержать следы…» — критический риск"
            value={profile.considerTraces}
            onValueChange={(v) => update({ considerTraces: v })}
          />
        </View>
      </ScrollView>

      <Pressable style={[styles.btn, { backgroundColor: colors.primary }]} onPress={finish}>
        <Text style={[styles.btnText, { color: colors.white }]}>Готово</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 16 },
  center: { alignItems: 'center', paddingTop: 60, paddingBottom: 24 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  bigTitle: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 16, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  disclaimerCard: {
    marginTop: 32, padding: 16, borderRadius: 12,
    borderWidth: 1, gap: 8, alignItems: 'center',
  },
  disclaimerText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  stepTitle: { fontSize: 24, fontWeight: '700', marginTop: 24, marginBottom: 4 },
  stepHint: { fontSize: 14, marginBottom: 16 },
  card: { borderRadius: 12, overflow: 'hidden' },
  btn: {
    paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 12,
  },
  btnText: { fontSize: 17, fontWeight: '700' },
});
