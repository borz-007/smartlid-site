import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';

interface Props {
  onScanBarcode: () => void;
  onScanPhoto: () => void;
  onOpenSettings: () => void;
}

export function HomeScreen({ onScanBarcode, onScanPhoto, onOpenSettings }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={{ width: 28 }} />
        <Text style={styles.title}>Food Audit</Text>
        <Pressable onPress={onOpenSettings} hitSlop={12} accessibilityLabel="Настройки">
          <Ionicons name="settings-outline" size={26} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.logoCircle}>
          <Ionicons name="shield-checkmark" size={64} color={colors.white} />
        </View>
        <Text style={styles.subtitle}>Проверка состава продуктов</Text>
        <Text style={styles.hint}>Halal · Vegan · Аллергены · Стоп-слова</Text>

        <View style={styles.buttons}>
          <Pressable style={[styles.bigBtn, styles.barcodeBtn]} onPress={onScanBarcode}>
            <View style={styles.iconCircle}>
              <Ionicons name="barcode-outline" size={36} color={colors.primary} />
            </View>
            <Text style={styles.btnTitle}>Сканировать код</Text>
            <Text style={styles.btnDesc}>Наведите камеру на штрихкод товара</Text>
          </Pressable>

          <Pressable style={[styles.bigBtn, styles.photoBtn]} onPress={onScanPhoto}>
            <View style={styles.iconCircle}>
              <Ionicons name="document-text-outline" size={36} color="#12B76A" />
            </View>
            <Text style={styles.btnTitle}>Сканировать состав</Text>
            <Text style={styles.btnDesc}>Сфотографируйте блок ингредиентов</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.footer}>
        Вспомогательный инструмент — при тяжёлой аллергии сверяйтесь с этикеткой
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  subtitle: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center' },
  hint: { fontSize: 14, color: colors.textMuted, marginTop: 6, marginBottom: 36 },
  buttons: { width: '100%', gap: 16 },
  bigBtn: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  barcodeBtn: { backgroundColor: colors.white },
  photoBtn: { backgroundColor: colors.white },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  btnDesc: { fontSize: 14, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  footer: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
});
