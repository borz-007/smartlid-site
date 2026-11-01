import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResultModal } from '../components/ResultModal';
import { colors } from '../constants/theme';
import { useProfile } from '../context/ProfileContext';
import { auditBarcode, auditPhoto } from '../engine/auditor';
import { useI18n } from '../i18n';
import { ProductNotFoundError } from '../services/openFoodFacts';
import type { ScanResult } from '../types';

type Mode = 'barcode' | 'photo';

interface Props {
  initialMode?: Mode;
  onOpenSettings: () => void;
  onBack?: () => void;
}

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

export function ScannerScreen({ initialMode = 'barcode', onOpenSettings, onBack }: Props) {
  const { profile } = useProfile();
  const { t } = useI18n();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyText, setBusyText] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [resultId, setResultId] = useState(0);
  const lockRef = useRef(false);

  const showResult = (r: ScanResult) => {
    setResult(r);
    setResultId((n) => n + 1);
  };

  const fail = (title: string, message: string, offerPhoto = false) => {
    Alert.alert(title, message, [
      ...(offerPhoto ? [{ text: t('photo_ingredients'), onPress: () => setMode('photo') }] : []),
      { text: t('ok'), onPress: () => (lockRef.current = false) },
    ]);
    if (offerPhoto) lockRef.current = false;
  };

  const handleBarcode = useCallback(
    async ({ data }: BarcodeScanningResult) => {
      if (lockRef.current || mode !== 'barcode') return;
      lockRef.current = true;
      setBusy(true);
      try {
        showResult(await auditBarcode(data, profile, setBusyText));
      } catch (e: any) {
        if (e instanceof ProductNotFoundError) {
          fail(
            t('product_not_found'),
            t('product_not_found_msg', { barcode: data }) + (e.detail ? `\n${e.detail}` : ''),
            true,
          );
        } else {
          fail(t('error'), e?.message ?? t('error_check'));
        }
      } finally {
        setBusy(false);
      }
    },
    [mode, profile, t],
  );

  const handleCapture = async () => {
    if (busy || !cameraRef.current) return;
    setBusy(true);
    setBusyText(t('recognizing'));
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6, skipProcessing: false });
      if (!photo?.base64) throw new Error(t('no_photo'));
      showResult(await auditPhoto(photo.base64, profile));
    } catch (e: any) {
      fail(t('photo_error'), e?.message ?? t('photo_error_hint'));
    } finally {
      setBusy(false);
    }
  };

  const closeResult = () => {
    setResult(null);
    lockRef.current = false;
  };

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Ionicons name="camera-outline" size={56} color={colors.textMuted} />
        <Text style={styles.permText}>{t('camera_needed')}</Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>{t('allow_camera')}</Text>
        </Pressable>
        <Pressable onPress={onOpenSettings} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.primary }}>{t('open_profile')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const scanningActive = mode === 'barcode' && !busy && !result;

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={scanningActive ? handleBarcode : undefined}
      />

      <View style={styles.overlay} pointerEvents="none">
        <View style={[styles.frame, mode === 'barcode' ? styles.frameBarcode : styles.framePhoto]} />
        <Text style={styles.hint}>
          {mode === 'barcode' ? t('aim_barcode') : t('aim_photo')}
        </Text>
      </View>

      <SafeAreaView style={styles.ui} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.topBar}>
          {onBack ? (
            <Pressable style={styles.roundBtn} onPress={onBack} accessibilityLabel={t('history')}>
              <Ionicons name="chevron-back" size={26} color={colors.white} />
            </Pressable>
          ) : (
            <View style={{ width: 48 }} />
          )}
          <Pressable style={styles.roundBtn} onPress={() => setTorch((v) => !v)}>
            <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={24} color={colors.white} />
          </Pressable>
          <Pressable style={styles.roundBtn} onPress={onOpenSettings} accessibilityLabel={t('profile')}>
            <Ionicons name="settings-outline" size={24} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.bottom}>
          {mode === 'photo' ? (
            <Pressable style={styles.shutter} onPress={handleCapture} disabled={busy}>
              <View style={styles.shutterInner} />
            </Pressable>
          ) : null}

          <View style={styles.segment}>
            {(['barcode', 'photo'] as Mode[]).map((m) => (
              <Pressable
                key={m}
                style={[styles.segmentItem, mode === m && styles.segmentActive]}
                onPress={() => setMode(m)}
              >
                <Ionicons
                  name={m === 'barcode' ? 'barcode-outline' : 'document-text-outline'}
                  size={18}
                  color={mode === m ? colors.text : colors.white}
                />
                <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
                  {m === 'barcode' ? t('barcode_tab') : t('photo_tab')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator size="large" color={colors.white} />
          <Text style={styles.busyText}>{busyText}</Text>
        </View>
      ) : null}

      <ResultModal key={resultId} result={result} onClose={closeResult} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  permText: { fontSize: 16, color: colors.text, textAlign: 'center', marginVertical: 16 },
  permBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  permBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: {
    borderWidth: 3,
    borderColor: colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  frameBarcode: { width: '80%', height: 160 },
  framePhoto: { width: '88%', height: '45%' },
  hint: {
    color: colors.white,
    fontSize: 15,
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
    textShadowColor: '#000',
    textShadowRadius: 4,
  },
  ui: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  roundBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: { alignItems: 'center', paddingBottom: 16, gap: 16 },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.white },
  segment: { flexDirection: 'row', backgroundColor: colors.overlay, borderRadius: 24, padding: 4 },
  segmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  segmentActive: { backgroundColor: colors.white },
  segmentText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  segmentTextActive: { color: colors.text },
  busy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  busyText: { color: colors.white, fontSize: 16 },
});
