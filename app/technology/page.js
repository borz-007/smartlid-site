import { Section, Eyebrow, H2 } from '@/components/site/section';
import { IconVoice, IconPhone, IconWearable, IconSensor, IconShield, IconMotor, IconForce, IconCpu } from '@/components/site/custom-icons';

export const metadata = {
  title: 'Technology',
  description: 'SmartLid intelligent control architecture.',
  alternates: { canonical: '/technology' },
};

const NODES = [
  { Icon: IconVoice, name: 'Voice' },
  { Icon: IconPhone, name: 'Smartphone' },
  { Icon: IconWearable, name: 'Wearable' },
  { Icon: IconSensor, name: 'Sensors' },
  { Icon: IconShield, name: 'Safety Monitoring' },
  { Icon: IconMotor, name: 'Motor Actuation' },
  { Icon: IconForce, name: 'Real-time Force Monitoring' },
];

export default function TechnologyPage() {
  return (
    <>
      <Section className="pt-40">
        <Eyebrow>Technology</Eyebrow>
        <H2 className="mt-6">One control module.<br />Everything talks to it.</H2>
      </Section>

      {/* Radial architecture diagram */}
      <Section className="pt-0">
        <div className="relative rounded-3xl border border-border/60 bg-card/40 aspect-[16/10] overflow-hidden">
          {/* Center */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
            <span className="pulse-ring absolute h-40 w-40 rounded-full border border-foreground/25" />
            <span className="pulse-ring absolute h-40 w-40 rounded-full border border-foreground/15" style={{ animationDelay: '1.5s' }} />
            <div className="relative z-10 h-36 w-36 rounded-2xl bg-foreground text-background flex flex-col items-center justify-center shadow-2xl">
              <IconCpu className="h-8 w-8" />
              <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.3em] opacity-80">Control</div>
            </div>
          </div>

          {/* Orbiting nodes */}
          {NODES.map((n, i) => {
            const total = NODES.length;
            const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
            const rx = 42, ry = 38;
            const left = 50 + rx * Math.cos(angle);
            const top  = 50 + ry * Math.sin(angle);
            return (
              <div key={n.name} style={{ left: `${left}%`, top: `${top}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                <div className="h-14 w-14 rounded-xl bg-background border border-border/60 flex items-center justify-center">
                  <n.Icon className="h-7 w-7" />
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground max-w-[100px] text-center">{n.name}</div>
              </div>
            );
          })}

          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {NODES.map((_, i) => {
              const angle = (i / NODES.length) * 2 * Math.PI - Math.PI / 2;
              const x = 50 + 42 * Math.cos(angle);
              const y = 50 + 38 * Math.sin(angle);
              return <line key={i} x1={x} y1={y} x2="50" y2="50" stroke="currentColor" strokeOpacity="0.15" strokeWidth="0.15" className="flow-line" />;
            })}
          </svg>
        </div>
      </Section>
    </>
  );
}
