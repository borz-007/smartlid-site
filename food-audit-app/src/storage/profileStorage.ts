import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALLERGENS } from '../constants/allergens';
import type { AllergenId, UserProfile } from '../types';

const STORAGE_KEY = '@food_audit/profile_v1';

export function createDefaultProfile(): UserProfile {
  return {
    halal: false,
    vegan: false,
    vegetarian: false,
    allergens: ALLERGENS.reduce((acc, a) => ({ ...acc, [a.id]: false }), {} as Record<AllergenId, boolean>),
    considerTraces: false,
    customStopWords: [],
    aiEnabled: true,
  };
}

/** Слияние с дефолтами — чтобы новые поля не ломали старые сохранённые профили. */
export function mergeWithDefaults(stored: Partial<UserProfile> | null | undefined): UserProfile {
  const def = createDefaultProfile();
  if (!stored || typeof stored !== 'object') return def;
  return {
    ...def,
    ...stored,
    allergens: { ...def.allergens, ...(stored.allergens ?? {}) },
    customStopWords: Array.isArray(stored.customStopWords)
      ? stored.customStopWords.filter((w): w is string => typeof w === 'string')
      : [],
  };
}

export async function loadProfile(): Promise<UserProfile> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return mergeWithDefaults(json ? JSON.parse(json) : null);
  } catch {
    return createDefaultProfile();
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Не удалось сохранить профиль', e);
  }
}
