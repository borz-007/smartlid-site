'use client';

import { Mic, Smartphone, Watch, Radar, Cpu, ShieldCheck, Cog, Activity } from 'lucide-react';

const inputs = [
  { icon: Mic, label: 'Voice' },
  { icon: Smartphone, label: 'Smartphone' },
  { icon: Watch, label: 'Wearable' },
  { icon: Radar, label: 'Sensors' },
];
const outputs = [
  { icon: ShieldCheck, label: 'Safety Monitoring' },
  { icon: Cog, label: 'Motor Actuation' },
  { icon: Activity, label: 'Real-time Force Monitoring' },
];

export default function ArchitectureDiagram() {
  return (
    <div className="relative rounded-3xl border border-border/60 bg-card/40 p-6 md:p-12 overflow-hidden">
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-10 md:gap-16">
        {/* Inputs */}
        <div className="grid grid-cols-2 gap-4">
          {inputs.map((n, i) => (
            <Node key={n.label} delay={i + 1} {...n} />
          ))}
        </div>

        {/* Control Module */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="pulse-ring absolute h-24 w-24 rounded-full border border-foreground/30" />
            <span className="pulse-ring absolute h-24 w-24 rounded-full border border-foreground/20" style={{ animationDelay: '1.2s' }} />
          </div>
          <div className="reveal reveal-delay-2 relative z-10 h-28 w-28 md:h-32 md:w-32 rounded-2xl bg-foreground text-background flex flex-col items-center justify-center shadow-2xl">
            <Cpu className="h-6 w-6" />
            <div className="mt-1 text-[10px] font-mono uppercase tracking-widest opacity-80">Control</div>
            <div className="text-[10px] font-mono uppercase tracking-widest opacity-80">Module</div>
          </div>
        </div>

        {/* Outputs */}
        <div className="grid grid-cols-1 gap-4">
          {outputs.map((n, i) => (
            <Node key={n.label} delay={i + 3} {...n} />
          ))}
        </div>
      </div>

      {/* Flow lines (decorative) */}
      <svg className="pointer-events-none absolute inset-0 hidden md:block text-foreground" preserveAspectRatio="none" viewBox="0 0 1000 400" aria-hidden>
        <g stroke="currentColor" strokeOpacity="0.25" fill="none" strokeWidth="1">
          <path className="flow-line" d="M 220 90  C 380 90, 400 200, 490 200" />
          <path className="flow-line" d="M 220 170 C 380 170, 400 200, 490 200" />
          <path className="flow-line" d="M 220 230 C 380 230, 400 200, 490 200" />
          <path className="flow-line" d="M 220 310 C 380 310, 400 200, 490 200" />
          <path className="flow-line" d="M 540 200 C 620 200, 640 120, 780 120" />
          <path className="flow-line" d="M 540 200 C 620 200, 640 200, 780 200" />
          <path className="flow-line" d="M 540 200 C 620 200, 640 280, 780 280" />
        </g>
      </svg>
    </div>
  );
}

function Node({ icon: Icon, label, delay = 1 }) {
  return (
    <div className={`reveal reveal-delay-${Math.min(delay, 5)} relative z-10 flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 backdrop-blur px-4 py-3`}>
      <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-[13px] font-medium">{label}</div>
    </div>
  );
}
