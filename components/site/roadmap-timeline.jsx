'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

const STAGES = [
  { id: '01', tag: 'Now',   title: 'Prototype validated',   detail: 'Working prototype. Safety tested. IP filed.', progress: 100 },
  { id: '02', tag: 'Next',  title: 'Reference design',      detail: 'Productized module. Integration kit for OEM evaluation.', progress: 55 },
  { id: '03', tag: 'Then',  title: 'OEM pilots',            detail: 'Co-development with launch partners in premium laptops.', progress: 15 },
  { id: '04', tag: 'Scale', title: 'Mass integration',      detail: 'SmartLid across categories: laptops, monitors, kiosks.', progress: 0 },
];

export default function RoadmapTimeline() {
  const [active, setActive] = useState(0);
  const s = STAGES[active];
  return (
    <div className="rounded-3xl border border-border/60 bg-card/60 p-6 md:p-12">
      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-0 right-0 top-6 h-px bg-border" />
        <motion.div className="absolute left-0 top-6 h-px bg-foreground" initial={{ width: 0 }} animate={{ width: `${(active / (STAGES.length - 1)) * 100}%` }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
        <div className="relative grid grid-cols-4">
          {STAGES.map((st, i) => (
            <button key={st.id} onClick={() => setActive(i)} className="flex flex-col items-start gap-3 text-left group">
              <span className={`h-3 w-3 rounded-full ring-4 ring-background transition-colors ${i <= active ? 'bg-foreground' : 'bg-border'}`} />
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{st.tag}</div>
                <div className={`mt-1 text-[13px] md:text-sm ${i === active ? 'text-foreground' : 'text-muted-foreground'} group-hover:text-foreground transition-colors`}>{st.title}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-14 grid gap-10 md:grid-cols-[1fr_auto] items-end">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Stage {s.id} · {s.tag}</div>
          <h3 className="display-sm mt-4 text-4xl md:text-6xl text-balance">{s.title}</h3>
          <p className="mt-5 max-w-xl text-muted-foreground text-lg">{s.detail}</p>
        </div>
        <div className="min-w-[220px]">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Progress</div>
          <div className="mt-3 h-1 w-full rounded-full bg-border overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${s.progress}%` }} transition={{ duration: 0.8 }} className="h-full bg-foreground" />
          </div>
          <div className="mt-2 font-mono text-[11px] text-muted-foreground">{s.progress}%</div>
        </div>
      </motion.div>
    </div>
  );
}
