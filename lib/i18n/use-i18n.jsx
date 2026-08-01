'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { dictionary } from './dictionary';

const I18nCtx = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState('en');
  useEffect(() => {
    try {
      const l = localStorage.getItem('lang');
      if (l && dictionary[l]) setLangState(l);
    } catch {}
  }, []);
  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem('lang', l); } catch {}
  }, []);
  const t = useCallback((key) => {
    const parts = key.split('.');
    let node = dictionary[lang] || dictionary.en;
    for (const p of parts) { node = node?.[p]; if (node == null) break; }
    if (node == null) {
      node = dictionary.en;
      for (const p of parts) { node = node?.[p]; if (node == null) break; }
    }
    return node ?? key;
  }, [lang]);
  return <I18nCtx.Provider value={{ lang, setLang, t }}>{children}</I18nCtx.Provider>;
}

export function useI18n() { return useContext(I18nCtx); }
export const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
  { code: 'nl', label: 'NL' },
];
