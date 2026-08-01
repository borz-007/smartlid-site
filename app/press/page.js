import { Section, Eyebrow, H2 } from '@/components/site/section';
import { ArrowUpRight } from 'lucide-react';

export const metadata = {
  title: 'Press',
  description: 'SmartLid — press, quotes, and inquiries.',
  alternates: { canonical: '/press' },
};

export default function PressPage() {
  return (
    <>
      <Section className="pt-40">
        <Eyebrow>Press</Eyebrow>
        <H2 className="mt-6">Coverage & inquiries.</H2>
        <p className="mt-8 max-w-2xl text-xl md:text-2xl text-muted-foreground text-balance">
          For interviews, images, and product details — write to <a href="mailto:ceo@slid-tech.com" className="underline underline-offset-4">ceo@slid-tech.com</a>.
        </p>
      </Section>

      <Section className="pt-0">
        <div className="grid gap-px bg-border rounded-3xl overflow-hidden border border-border/60 md:grid-cols-3">
          {[
            { k: '01', t: 'Founder quote', d: 'SmartLid is not an accessory. It is a category.' },
            { k: '02', t: 'Status', d: 'Prototype complete. Patents pending. Partnering with OEMs.' },
            { k: '03', t: 'Headquartered', d: 'Belgium. European IP. Global ambition.' },
          ].map((c) => (
            <div key={c.k} className="bg-card p-10 md:p-14">
              <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{c.k}</div>
              <div className="display-sm mt-6 text-3xl md:text-5xl text-balance">{c.t}</div>
              <p className="mt-4 text-muted-foreground text-lg">{c.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-3xl border border-border/60 bg-card p-10 md:p-16 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <Eyebrow>Media Kit</Eyebrow>
            <div className="display-sm mt-6 text-4xl md:text-6xl text-balance">Everything you need.</div>
            <p className="mt-5 text-muted-foreground max-w-md text-lg">Logos, brand guidelines, product renders and the investor deck.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href="/media-kit" className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3.5 text-[14px] font-medium hover:opacity-90">Open Media Kit <ArrowUpRight className="h-4 w-4" /></a>
            <a href="/pitch-deck.pdf" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border/70 px-6 py-3.5 text-[14px] font-medium hover:bg-secondary">Investor Deck (PDF)</a>
          </div>
        </div>
      </Section>
    </>
  );
}
