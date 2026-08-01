import { Section, Eyebrow, H2 } from '@/components/site/section';
import RoadmapTimeline from '@/components/site/roadmap-timeline';
import { ArrowRight } from 'lucide-react';

export const metadata = {
  title: 'Investors',
  description: 'OEM licensing. Market. Roadmap. Deck.',
  alternates: { canonical: '/investors' },
};

export default function InvestorsPage() {
  return (
    <>
      <Section className="pt-40">
        <Eyebrow>Investors</Eyebrow>
        <H2 className="mt-6">A new hardware category.<br />Licensed at scale.</H2>
        <div className="mt-12 flex flex-wrap gap-3">
          <a href="/pitch-deck.pdf" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3.5 text-[14px] font-medium hover:opacity-90">
            Download Investor Deck (PDF) <ArrowRight className="h-4 w-4" />
          </a>
          <a href="/contact" className="inline-flex items-center gap-2 rounded-full border border-border/70 px-6 py-3.5 text-[14px] font-medium hover:bg-secondary">
            Request a meeting
          </a>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="grid gap-px bg-border rounded-3xl overflow-hidden border border-border/60 md:grid-cols-2">
          {[
            { k: 'Model',   t: 'OEM licensing', d: 'Per-unit royalty. Integration services.' },
            { k: 'Market',  t: '$200B+',        d: 'Personal computing. Plus accessibility & enterprise.' },
            { k: 'IP',      t: 'Patent pending', d: 'Belgium & US filings. Confidential architecture.' },
            { k: 'Margins', t: 'High',          d: 'Capital-efficient. Software + reference designs.' },
          ].map((f) => (
            <div key={f.k} className="bg-card p-10 md:p-14">
              <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{f.k}</div>
              <div className="display-sm mt-6 text-4xl md:text-6xl">{f.t}</div>
              <p className="mt-4 text-muted-foreground text-lg max-w-md">{f.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="pt-0">
        <Eyebrow>Roadmap</Eyebrow>
        <H2 className="mt-6">Path to mass integration.</H2>
        <div className="mt-14"><RoadmapTimeline /></div>
      </Section>
    </>
  );
}
