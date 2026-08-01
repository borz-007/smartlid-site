'use client';

import { useI18n, LANGS } from '@/lib/i18n/use-i18n';
import { useState, useRef, useEffect } from 'react';
import { Languages, Check } from 'lucide-react';

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc); return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} aria-label="Language" className="h-9 px-2.5 inline-flex items-center gap-1.5 rounded-full hover:bg-secondary text-[12px] font-mono uppercase tracking-widest">
        <Languages className="h-3.5 w-3.5" />{lang.toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-32 rounded-xl border border-border/60 bg-popover glass p-1 shadow-2xl z-50">
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }} className="w-full flex items-center justify-between px-2.5 py-1.5 text-[13px] rounded-lg hover:bg-secondary">
              <span>{l.label}</span>
              {lang === l.code && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
