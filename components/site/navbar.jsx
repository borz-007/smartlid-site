'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import ThemeToggle from './theme-toggle';
import LanguageToggle from './language-toggle';
import { useI18n } from '@/lib/i18n/use-i18n';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const NAV = [
    { href: '/', label: t('nav.home') },
    { href: '/technology', label: t('nav.technology') },
    { href: '/patent', label: t('nav.patent') },
    { href: '/accessibility', label: t('nav.accessibility') },
    { href: '/investors', label: t('nav.investors') },
    { href: '/press', label: t('nav.press') },
    { href: '/faq', label: t('nav.faq') },
    { href: '/contact', label: t('nav.contact') },
  ];

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <header className={cn('fixed top-0 z-50 w-full transition-all duration-500', scrolled ? 'glass bg-background/70 border-b border-border/60' : 'bg-transparent border-b border-transparent')}>
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-baseline gap-1.5" aria-label="SmartLid · Home">
          <span className="wordmark text-[19px] leading-none">SmartLid</span>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand translate-y-[-2px]" />
        </Link>

        <nav className="hidden lg:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link key={n.href} href={n.href} className={cn('px-3 py-1.5 text-[12.5px] rounded-full transition-colors', active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
          <button aria-label="Toggle menu" onClick={() => setOpen(!open)} className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-secondary">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border/60 bg-background/95 glass">
          <div className="container py-2 flex flex-col">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={cn('py-3 text-sm border-b border-border/40 last:border-none', pathname === n.href ? 'text-foreground' : 'text-muted-foreground')}>
                {n.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
