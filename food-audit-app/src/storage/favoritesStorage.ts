import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedProduct } from '../types';

const FAV_KEY = '@food_audit/favorites_v1';
const BL_KEY = '@food_audit/blacklist_v1';
const MAX = 500;

async function loadList(key: string): Promise<SavedProduct[]> {
  try {
    const json = await AsyncStorage.getItem(key);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

async function saveList(key: string, list: SavedProduct[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

function makeId(p: SavedProduct): string {
  return p.barcode || `${p.productName}:${p.brand}`;
}

async function addTo(key: string, item: SavedProduct): Promise<void> {
  const list = await loadList(key);
  const id = makeId(item);
  if (list.some((x) => makeId(x) === id)) return;
  list.unshift(item);
  if (list.length > MAX) list.length = MAX;
  await saveList(key, list);
}

async function removeFrom(key: string, item: SavedProduct): Promise<void> {
  const list = await loadList(key);
  const id = makeId(item);
  await saveList(key, list.filter((x) => makeId(x) !== id));
}

async function isIn(key: string, barcode?: string, name?: string): Promise<boolean> {
  const list = await loadList(key);
  const id = barcode || `${name}:`;
  return list.some((x) => makeId(x) === id || (barcode && x.barcode === barcode));
}

export const loadFavorites = () => loadList(FAV_KEY);
export const addFavorite = (p: SavedProduct) => addTo(FAV_KEY, p);
export const removeFavorite = (p: SavedProduct) => removeFrom(FAV_KEY, p);
export const isFavorite = (barcode?: string, name?: string) => isIn(FAV_KEY, barcode, name);

export const loadBlacklist = () => loadList(BL_KEY);
export const addToBlacklist = (p: SavedProduct) => addTo(BL_KEY, p);
export const removeFromBlacklist = (p: SavedProduct) => removeFrom(BL_KEY, p);
export const isBlacklisted = (barcode?: string, name?: string) => isIn(BL_KEY, barcode, name);

export async function clearFavorites(): Promise<void> { await AsyncStorage.removeItem(FAV_KEY); }
export async function clearBlacklist(): Promise<void> { await AsyncStorage.removeItem(BL_KEY); }
