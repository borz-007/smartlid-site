import { Section, Eyebrow, H2 } from '@/components/site/section';
import { IconShield } from '@/components/site/custom-icons';

export const metadata = {
  title: 'Patent',
  description: 'SmartLid — Patent Pending. BE2026/0042 and US Provisional 64/129,698.',
  alternates: { canonical: '/patent' },
};

export default function PatentPage() {
  return (
    <>
      <Section className="pt-40">
        <Eyebrow>Intellectual Property</Eyebrow>
        <H2 className="mt-6">Patent pending.</H2>
      </Section>

      <Section className="pt-0">
        <div className="grid gap-6 md:grid-cols-2">
          <PatentCard region="Belgium" refNo="BE2026/0042" />
          <PatentCard region="United States" refNo="64/129,698" prov />
        </div>
        <div className="mt-10 rounded-3xl border border-border/60 bg-card p-8 md:p-10 flex items-start gap-5">
          <IconShield className="h-8 w-8 shrink-0" />
          <div className="text-sm md:text-base text-muted-foreground max-w-3xl">
            All rights reserved. Confidential technical details are not disclosed. Any use of the SmartLid architecture requires an explicit written license.
          </div>
        </div>
      </Section>
    </>
  );
}

function PatentCard({ region, refNo, prov }) {
  return (
    <div className="relative rounded-3xl border border-border/60 bg-card p-10 overflow-hidden">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-foreground/[0.04] blur-2xl" />
      <div className="relative">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{region}{prov ? ' · Provisional' : ''}</div>
        <div className="mt-6 font-mono text-4xl md:text-6xl tracking-tight">{refNo}</div>
        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Pending
        </div>
      </div>
    </div>
  );
}
