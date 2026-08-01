import { Section, Eyebrow, H2 } from '@/components/site/section';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export const metadata = {
  title: 'FAQ',
  description: 'SmartLid — frequently asked questions.',
  alternates: { canonical: '/faq' },
};

const faqs = [
  { q: 'What is SmartLid?', a: 'The first intelligent control system that enables computing devices to move safely and automatically.' },
  { q: 'Which devices does it work with?', a: 'Designed as OEM technology for laptops and adjacent devices — monitors, kiosks.' },
  { q: 'How is safety ensured?', a: 'Continuous real-time force monitoring and multi-layered safeguards on every movement.' },
  { q: 'How is it controlled?', a: 'Voice, smartphone, wearable, and ambient sensors — individually or combined.' },
  { q: 'Is the technology patented?', a: 'Pending in Belgium (BE2026/0042) and the United States (US Provisional 64/129,698).' },
  { q: 'How is it monetized?', a: 'OEM licensing — per-unit royalties and integration services.' },
  { q: 'How can I partner or invest?', a: 'Email ceo@slid-tech.com or use the Contact page.' },
];

const jsonLd = {
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
};

export default function FaqPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Section className="pt-40">
        <Eyebrow>Frequently Asked</Eyebrow>
        <H2 className="mt-6">Everything, briefly.</H2>
      </Section>
      <Section className="pt-0">
        <div className="mx-auto max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border/60">
                <AccordionTrigger className="text-left text-lg md:text-xl py-6">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-[15px] md:text-base leading-relaxed pb-6">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Section>
    </>
  );
}
