import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HistoryEntry, ScanResult } from '../types';

const KEY = '@food_audit/history_v1';
/** Хранится только несколько последних проверок, чтобы не раздувать хранилище и не тормозить запуск. */
export const HISTORY_MAX = 8;

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    const list: HistoryEntry[] = json ? JSON.parse(json) : [];
    return list.slice(0, HISTORY_MAX);
  } catch {
    return [];
  }
}

export async function addToHistory(result: ScanResult): Promise<void> {
  try {
    const list = await loadHistory();
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      barcode: result.product?.barcode,
      productName: result.product?.name,
      brand: result.product?.brand,
      verdict: result.verdict,
      date: new Date().toISOString(),
      imageUrl: result.product?.imageUrl,
      ingredientsSource: result.ingredientsSource,
      result,
    };
    const barcode = entry.barcode;
    const rest = barcode ? list.filter((e) => e.barcode !== barcode) : list;
    await AsyncStorage.setItem(KEY, JSON.stringify([entry, ...rest].slice(0, HISTORY_MAX)));
  } catch (e) {
    console.warn('History save failed', e);
  }
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
