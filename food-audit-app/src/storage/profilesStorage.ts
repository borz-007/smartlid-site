import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NamedProfile } from '../types';
import { createDefaultProfile } from './profileStorage';

const PROFILES_KEY = '@food_audit/profiles_v1';
const ACTIVE_KEY = '@food_audit/active_profile_v1';

export async function loadProfiles(): Promise<NamedProfile[]> {
  try {
    const json = await AsyncStorage.getItem(PROFILES_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveProfiles(profiles: NamedProfile[]): Promise<void> {
  await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export async function getActiveProfileId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

export async function setActiveProfileId(id: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_KEY, id);
}

export function createNamedProfile(name: string): NamedProfile {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    profile: createDefaultProfile(),
  };
}
