'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n/use-i18n';
import Laptop3D from '@/components/site/laptop-3d';
import HeroVideo from '@/components/site/hero-video';
import { IconVoice, IconPhone, IconWearable, IconSensor, IconShield, IconForce, IconMotor } from '@/components/site/custom-icons';
import { ArrowRight, ArrowUpRight } from 'lucide-react';

function App() {
  const { t } = useI18n();
  return (
    <>
      {/* HERO — editorial serif wordmark */}
      <section className="relative min-h-[100svh] flex items-center overflow-hidden pt-20">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-10%] h-[700px] w-[1100px] -translate-x-1/2 rounded-full bg-brand/[0.08] blur-3xl" />
          <div className="absolute inset-0 grain" />
        </div>

        <div className="container">
          <div className="grid md:grid-cols-12 gap-10 items-end">
            <div className="md:col-span-8">
              <div className="reveal inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 backdrop-blur px-3 py-1 text-[10px] md:text-[11px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                {t('hero.badge')}
              </div>

              <h1 className="reveal reveal-delay-1 wordmark mt-8 text-[22vw] md:text-[13vw] lg:text-[11rem] leading-[0.85] text-balance flex items-baseline gap-2">
                <span>SmartLid</span>
                <span className="inline-block h-3 w-3 md:h-5 md:w-5 rounded-full bg-brand translate-y-[-0.8em] md:translate-y-[-1.2em]" />
              </h1>

              <p className="reveal reveal-delay-2 mt-8 md:mt-12 max-w-xl text-xl md:text-3xl text-muted-foreground text-balance">
                Automated, safety-monitored physical movement for computing devices — beginning with the laptop lid.
              </p>

              <div className="reveal reveal-delay-3 mt-12 flex flex-wrap items-center gap-3">
                <a href="#demo" className="group inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3.5 text-[14px] font-medium hover:opacity-90 transition">
                  {t('hero.watch')} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
                <a href="/pitch-deck.pdf" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 backdrop-blur px-6 py-3.5 text-[14px] font-medium hover:bg-secondary transition">
                  {t('hero.deck')} <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>

              <div className="reveal reveal-delay-4 mt-14 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Usman Esamerzaev · Founder &amp; Inventor · ceo@slid-tech.com
              </div>
            </div>

            <div className="hidden md:block md:col-span-4">
              <div className="reveal reveal-delay-3 rounded-3xl border border-border/60 bg-card/60 p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Filed</div>
                <div className="mt-4 space-y-4">
                  <PatentRow region="Belgium" refNo="BE2026/0042" />
                  <PatentRow region="US Provisional" refNo="64/129,698" />
                </div>
                <div className="mt-6 text-[11px] font-mono text-muted-foreground">Priority · 13 March 2026</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HERO DEMO VIDEO */}
      <section id="demo" className="py-16 md:py-24">
        <div className="container">
          <div className="mb-10 flex items-end justify-between gap-6 flex-wrap">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.3em] brand">01 · Demo</div>
              <h2 className="display mt-4 text-4xl md:text-6xl text-balance">Watch it move.</h2>
            </div>
            <a href="/pitch-deck.pdf" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              Read the deck <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
          <HeroVideo />
        </div>
      </section>

      {/* CHAPTER 01 — THE PROBLEM */}
      <Chapter num="02" tag="The Problem" title="Opening a laptop is invisible — until you can't do it." body="For 1.3B people with significant disabilities, that gesture is a barrier. For everyone else, it's daily friction." stat="1.3B" statLabel="beachhead validation market (WHO, 2023)" />

      {/* CHAPTER 02 — THE INSIGHT */}
      <section className="py-24 md:py-40">
        <div className="container max-w-5xl">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] brand">03 · The Insight</div>
          <h2 className="display mt-6 text-5xl md:text-8xl text-balance">Software got smart about intent.<br/><span className="text-muted-foreground">Devices still can't act on it.</span></h2>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              { k:'Voice',      d:'Voice assistants know what you want.' },
              { k:'Sensors',    d:'Presence sensors know you’re there.' },
              { k:'Wearables',  d:'Wearables know when you approach.' },
            ].map((f) => (
              <div key={f.k} className="rounded-2xl border border-border/60 bg-card p-8">
                <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{f.k}</div>
                <p className="mt-4 text-lg">{f.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-14 max-w-3xl text-xl md:text-2xl text-muted-foreground text-balance">
            The missing piece isn't a stronger motor. It's a control layer that verifies intent, then moves the device under continuous force monitoring — with a mechanical fail-safe.
          </p>
        </div>
      </section>

      {/* Scroll-driven laptop */}
      <Laptop3D label="04 · The Product" />

      {/* CHAPTER 03 — Multi-modal control */}
      <section className="py-24 md:py-40">
        <div className="container">
          <div className="max-w-3xl">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] brand">05 · Architecture</div>
            <h2 className="display mt-6 text-5xl md:text-8xl text-balance">Speak. Tap. Move.</h2>
            <p className="mt-8 text-xl md:text-2xl text-muted-foreground text-balance">Voice, smartphone, wearable, sensors. One control module.</p>
          </div>
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-3xl overflow-hidden border border-border/60">
            {[
              { Icon: IconVoice, name: 'Voice' },
              { Icon: IconPhone, name: 'Smartphone' },
              { Icon: IconWearable, name: 'Wearable' },
              { Icon: IconSensor, name: 'Sensors' },
            ].map(({ Icon, name }) => (
              <div key={name} className="bg-card p-8 md:p-12 aspect-square flex flex-col items-start justify-between">
                <Icon className="h-10 w-10 md:h-14 md:w-14 brand" />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Input</div>
                  <div className="mt-2 text-lg md:text-2xl font-medium tracking-tight">{name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety strip */}
      <section className="relative py-24 md:py-40 overflow-hidden bg-secondary/50">
        <div className="container">
          <div className="max-w-3xl">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] brand">06 · Safety</div>
            <h2 className="display mt-6 text-5xl md:text-8xl text-balance">Force-aware. Always.</h2>
            <p className="mt-8 text-xl md:text-2xl text-muted-foreground text-balance">Continuous real-time monitoring on every millimeter of motion. Mechanical fail-safe if power or control is lost.</p>
            <div className="mt-14 grid grid-cols-3 gap-6">
              {[{Icon:IconShield,l:'Multi-layer'},{Icon:IconForce,l:'Force-aware'},{Icon:IconMotor,l:'Closed-loop'}].map(({Icon,l}) => (
                <div key={l} className="rounded-2xl border border-border/60 bg-card p-6">
                  <Icon className="h-8 w-8 brand" />
                  <div className="mt-6 text-[13px] font-medium">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="relative py-32 md:py-56 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[70vh] w-[70vh] rounded-full bg-brand/[0.08] blur-3xl" />
        </div>
        <div className="container text-center">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] brand">07 · For OEMs</div>
          <h2 className="display mt-6 text-5xl md:text-8xl lg:text-9xl text-balance">License the movement<br/>of computing.</h2>
          <p className="mx-auto mt-8 max-w-xl text-xl md:text-2xl text-muted-foreground text-balance">Available now for design partners.</p>
          <div className="mt-14 flex items-center justify-center gap-3">
            <a href="/pitch-deck.pdf" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-3.5 text-[14px] font-medium hover:opacity-90">
              Download investor deck <ArrowUpRight className="h-4 w-4" />
            </a>
            <Link href="/contact" className="inline-flex items-center gap-2 rounded-full border border-border/60 px-6 py-3.5 text-[14px] font-medium hover:bg-secondary">
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Chapter({ num, tag, title, body, stat, statLabel }) {
  return (
    <section className="py-24 md:py-40 border-t border-border/60">
      <div className="container">
        <div className="grid gap-14 md:grid-cols-12 items-start">
          <div className="md:col-span-8">
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] brand">{num} · {tag}</div>
            <h2 className="display mt-6 text-5xl md:text-8xl text-balance">{title}</h2>
            <p className="mt-8 max-w-2xl text-xl md:text-2xl text-muted-foreground text-balance">{body}</p>
          </div>
          {stat && (
            <div className="md:col-span-4">
              <div className="rounded-3xl border border-border/60 bg-card p-8 text-center">
                <div className="display text-6xl md:text-8xl">{stat}</div>
                <div className="mt-4 text-sm text-muted-foreground max-w-[220px] mx-auto">{statLabel}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PatentRow({ region, refNo }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-3 last:border-0">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{region}</div>
      <div className="font-mono text-sm">{refNo}</div>
    </div>
  );
}

export default App;
