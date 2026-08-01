import { Section, Eyebrow, H2 } from '@/components/site/section';

export const metadata = {
  title: 'Accessibility',
  description: 'Computers that meet people where they are.',
  alternates: { canonical: '/accessibility' },
};

export default function AccessibilityPage() {
  return (
    <>
      <Section className="pt-40">
        <Eyebrow>Accessibility</Eyebrow>
        <H2 className="mt-6">Computers that meet people where they are.</H2>
        <p className="mt-8 max-w-2xl text-xl md:text-2xl text-muted-foreground text-balance">
          For many, opening a laptop is a barrier. SmartLid removes it.
        </p>
      </Section>

      <Section className="pt-0">
        <div className="grid gap-px bg-border rounded-3xl overflow-hidden border border-border/60 md:grid-cols-2">
          {[
            { t: 'Autonomy', d: 'Hands-free — voice, wearable, or app.' },
            { t: 'Comfort', d: 'Gentle, predictable motion. No sudden actions.' },
            { t: 'Clarity', d: 'The device is always ready. No fumbling.' },
            { t: 'Universal', d: 'Better for everyone. Essential for some.' },
          ].map((f) => (
            <div key={f.t} className="bg-card p-10 md:p-14">
              <div className="display-sm text-3xl md:text-5xl">{f.t}</div>
              <p className="mt-5 text-muted-foreground text-lg">{f.d}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
