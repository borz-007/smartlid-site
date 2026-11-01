import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, I18nManager } from 'react-native';
import ar from './locales/ar';
import de from './locales/de';
import en from './locales/en';
import fr from './locales/fr';
import nl from './locales/nl';
import ru from './locales/ru';

export type Locale = 'ru' | 'en' | 'fr' | 'nl' | 'de' | 'ar';

export type Translations = Record<string, string>;

const STORAGE_KEY = '@food_audit_locale';

const locales: Record<Locale, Translations> = { ru, en, fr, nl, de, ar };

export const SUPPORTED_LOCALES: { code: Locale; flag: string; name: string }[] = [
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'nl', flag: '🇳🇱', name: 'Nederlands' },
  { code: 'de', flag: '🇩🇪', name: 'Deutsch' },
  { code: 'ar', flag: '🇸🇦', name: 'العربية' },
];

function detectDeviceLocale(): Locale {
  try {
    const full = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    const lang = full.split('-')[0]?.toLowerCase();
    if (lang && lang in locales) return lang as Locale;
  } catch {}
  return 'en';
}

type TFn = (key: string, params?: Record<string, string>) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: TFn;
  isRTL: boolean;
  ready: boolean;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (k) => k,
  isRTL: false,
  ready: false,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved && saved in locales) {
        setLocaleState(saved as Locale);
      } else {
        const detected = detectDeviceLocale();
        setLocaleState(detected);
      }
      setReady(true);
    });
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    const wasRTL = locale === 'ar';
    const willBeRTL = newLocale === 'ar';
    setLocaleState(newLocale);
    AsyncStorage.setItem(STORAGE_KEY, newLocale);

    if (wasRTL !== willBeRTL) {
      I18nManager.allowRTL(willBeRTL);
      I18nManager.forceRTL(willBeRTL);
      const strings = locales[newLocale];
      Alert.alert(
        strings.rtl_restart_title ?? 'Restart',
        strings.rtl_restart_msg ?? 'Please restart the app.',
        [{ text: strings.ok ?? 'OK' }],
      );
    }
  }, [locale]);

  const t: TFn = useCallback(
    (key, params) => {
      let str = locales[locale]?.[key] ?? locales.en[key] ?? locales.ru[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
        }
      }
      return str;
    },
    [locale],
  );

  const isRTL = locale === 'ar';

  const value = useMemo(
    () => ({ locale, setLocale, t, isRTL, ready }),
    [locale, setLocale, t, isRTL, ready],
  );

  return React.createElement(I18nContext.Provider, { value }, children);
}
