'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/use-i18n';

export default function Footer() {
  const year = new Date().getFullYear();
  const { t } = useI18n();
  return (
    <footer className="border-t border-border/60 mt-0">
      <div className="container py-24">
        {/* Wordmark block */}
        <div className="flex items-baseline gap-2">
          <span className="wordmark text-6xl md:text-9xl leading-none">SmartLid</span>
          <span className="inline-block h-3 w-3 md:h-4 md:w-4 rounded-full bg-brand translate-y-[-6px]" />
        </div>
        <p className="mt-8 max-w-xl text-lg text-muted-foreground">
          Automated, safety-monitored physical movement for computing devices — beginning with the laptop lid.
        </p>

        <div className="mt-16 grid gap-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Company</div>
            <ul className="mt-5 space-y-3 text-[14px]">
              <li><Link className="hover:text-foreground text-muted-foreground" href="/technology">{t('nav.technology')}</Link></li>
              <li><Link className="hover:text-foreground text-muted-foreground" href="/investors">{t('nav.investors')}</Link></li>
              <li><Link className="hover:text-foreground text-muted-foreground" href="/patent">{t('nav.patent')}</Link></li>
              <li><Link className="hover:text-foreground text-muted-foreground" href="/accessibility">{t('nav.accessibility')}</Link></li>
            </ul>
          </div>
          <div className="md:col-span-4">
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Resources</div>
            <ul className="mt-5 space-y-3 text-[14px]">
              <li><Link className="hover:text-foreground text-muted-foreground" href="/press">{t('nav.press')}</Link></li>
              <li><Link className="hover:text-foreground text-muted-foreground" href="/media-kit">{t('nav.mediaKit')}</Link></li>
              <li><Link className="hover:text-foreground text-muted-foreground" href="/faq">{t('nav.faq')}</Link></li>
              <li><a target="_blank" rel="noopener noreferrer" className="hover:text-foreground text-muted-foreground" href="/pitch-deck.pdf">Investor Deck (PDF)</a></li>
              <li><a className="hover:text-foreground text-muted-foreground" href="/sitemap.xml">Sitemap</a></li>
            </ul>
          </div>
          <div className="md:col-span-4">
            <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Contact</div>
            <ul className="mt-5 space-y-3 text-[14px]">
              <li><a className="hover:text-foreground text-muted-foreground" href="mailto:ceo@slid-tech.com">ceo@slid-tech.com</a></li>
              <li><a className="hover:text-foreground text-muted-foreground" href="https://slid-tech.com">slid-tech.com</a></li>
              <li className="text-muted-foreground">Usman Esamerzaev · Founder</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="container py-6 flex flex-col md:flex-row items-center justify-between gap-2 text-[12px] text-muted-foreground">
          <div>© {year} SmartLid. All rights reserved.</div>
          <div className="font-mono">Patent pending · BE2026/0042 · US 64/129,698 · Priority 13 March 2026</div>
        </div>
      </div>
    </footer>
  );
}
