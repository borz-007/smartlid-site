import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HistoryEntry, ScanResult } from '../types';

const KEY = '@food_audit/history_v1';
const MAX = 200;

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? JSON.parse(json) : [];
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
    list.unshift(entry);
    if (list.length > MAX) list.length = MAX;
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('History save failed', e);
  }
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
