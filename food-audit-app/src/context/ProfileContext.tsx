import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createDefaultProfile, loadProfile, saveProfile } from '../storage/profileStorage';
import type { AllergenId, UserProfile } from '../types';

interface ProfileContextValue {
  profile: UserProfile;
  loaded: boolean;
  update: (patch: Partial<UserProfile>) => void;
  toggleAllergen: (id: AllergenId) => void;
  addStopWord: (word: string) => void;
  removeStopWord: (word: string) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(createDefaultProfile);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadProfile().then((p) => {
      setProfile(p);
      setLoaded(true);
    });
  }, []);

  /** Каждое изменение сразу сохраняется в AsyncStorage. */
  const apply = useCallback((fn: (p: UserProfile) => UserProfile) => {
    setProfile((prev) => {
      const next = fn(prev);
      saveProfile(next);
      return next;
    });
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      loaded,
      update: (patch) => apply((p) => ({ ...p, ...patch })),
      toggleAllergen: (id) => apply((p) => ({ ...p, allergens: { ...p.allergens, [id]: !p.allergens[id] } })),
      addStopWord: (word) =>
        apply((p) => {
          const w = word.trim();
          if (!w || p.customStopWords.some((x) => x.toLowerCase() === w.toLowerCase())) return p;
          return { ...p, customStopWords: [...p.customStopWords, w] };
        }),
      removeStopWord: (word) => apply((p) => ({ ...p, customStopWords: p.customStopWords.filter((w) => w !== word) })),
    }),
    [profile, loaded, apply],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile должен использоваться внутри ProfileProvider');
  return ctx;
}
