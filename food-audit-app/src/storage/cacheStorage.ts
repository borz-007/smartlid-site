import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ScanResult } from '../types';

const KEY = '@food_audit/cache_v1';
const MAX_ENTRIES = 300;
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  result: ScanResult;
  ts: number;
}

type CacheMap = Record<string, CacheEntry>;

async function loadMap(): Promise<CacheMap> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? JSON.parse(json) : {};
  } catch {
    return {};
  }
}

async function saveMap(map: CacheMap): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Cache save failed', e);
  }
}

export async function getCachedResult(barcode: string): Promise<ScanResult | null> {
  const map = await loadMap();
  const entry = map[barcode];
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL_MS) return null;
  return entry.result;
}

export async function setCachedResult(barcode: string, result: ScanResult): Promise<void> {
  const map = await loadMap();
  map[barcode] = { result, ts: Date.now() };
  const keys = Object.keys(map);
  if (keys.length > MAX_ENTRIES) {
    const sorted = keys.sort((a, b) => (map[a].ts ?? 0) - (map[b].ts ?? 0));
    for (let i = 0; i < sorted.length - MAX_ENTRIES; i++) delete map[sorted[i]];
  }
  await saveMap(map);
}

export async function clearCache(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
