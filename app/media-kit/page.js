import { Section, Eyebrow, H2 } from '@/components/site/section';
import { Download, ArrowUpRight } from 'lucide-react';

export const metadata = {
  title: 'Media Kit',
  description: 'SmartLid logos, brand assets, product renders and investor deck.',
  alternates: { canonical: '/media-kit' },
};

const SWATCHES = [
  { name: 'Ink',    hex: '#0A0A0A' },
  { name: 'Paper',  hex: '#FAFAFA' },
  { name: 'Signal', hex: '#10B981' },
  { name: 'Alert',  hex: '#F59E0B' },
];

export default function MediaKitPage() {
  return (
    <>
      <Section className="pt-40">
        <Eyebrow>Media Kit</Eyebrow>
        <H2 className="mt-6">Brand · Product · Deck.</H2>
      </Section>

      <Section className="pt-0">
        <div className="grid gap-6 md:grid-cols-2">
          <a href="/favicon.svg" download className="group rounded-3xl border border-border/60 bg-card p-10 flex items-center justify-between hover:bg-secondary transition-colors">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">SVG</div>
              <div className="mt-4 text-2xl md:text-3xl font-medium tracking-tight">SmartLid Logo</div>
              <div className="mt-1 text-sm text-muted-foreground">Vector · monochrome</div>
            </div>
            <Download className="h-5 w-5 group-hover:translate-y-0.5 transition-transform" />
          </a>
          <a href="/pitch-deck.pdf" target="_blank" rel="noopener noreferrer" className="group rounded-3xl border border-border/60 bg-card p-10 flex items-center justify-between hover:bg-secondary transition-colors">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">PDF</div>
              <div className="mt-4 text-2xl md:text-3xl font-medium tracking-tight">Investor Deck</div>
              <div className="mt-1 text-sm text-muted-foreground">Latest version</div>
            </div>
            <Download className="h-5 w-5 group-hover:translate-y-0.5 transition-transform" />
          </a>
        </div>

        <div className="mt-10 rounded-3xl border border-border/60 bg-card p-10">
          <Eyebrow>Palette</Eyebrow>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {SWATCHES.map((s) => (
              <div key={s.name} className="rounded-2xl overflow-hidden border border-border/60">
                <div className="aspect-video" style={{ backgroundColor: s.hex }} />
                <div className="p-4 flex items-center justify-between">
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="font-mono text-[12px] text-muted-foreground">{s.hex}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-border/60 bg-card p-10">
          <Eyebrow>Contact for press</Eyebrow>
          <div className="mt-6 flex items-center gap-3">
            <a href="mailto:ceo@slid-tech.com" className="inline-flex items-center gap-2 text-lg md:text-2xl underline underline-offset-4">ceo@slid-tech.com <ArrowUpRight className="h-4 w-4" /></a>
          </div>
        </div>
      </Section>
    </>
  );
}
