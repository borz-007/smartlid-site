'use client';

import { useScroll, useTransform, motion, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';

/**
 * Scroll-driven laptop opening animation.
 * The screen rotates from 100deg (closed) to 0deg (fully open) as the user scrolls through the section.
 */
export default function Laptop3D({ label }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const rot = useTransform(scrollYProgress, [0.15, 0.75], reduced ? [15, 15] : [100, 5]);
  const opa = useTransform(scrollYProgress, [0.05, 0.35, 0.85, 0.95], [0, 1, 1, 0.6]);
  const y   = useTransform(scrollYProgress, [0.15, 0.75], [80, 0]);

  return (
    <section ref={ref} className="relative h-[220vh] bg-background">
      <div className="sticky top-0 h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background to-transparent" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[80vh] w-[80vh] rounded-full bg-foreground/[0.04] blur-3xl" />
        </div>

        <div className="container text-center">
          <motion.div style={{ opacity: opa, y }} className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            {label}
          </motion.div>

          {/* Laptop */}
          <div className="mt-16 [perspective:1600px] mx-auto max-w-4xl">
            <div className="relative w-full aspect-[16/10]">
              {/* Screen (top part) */}
              <motion.div
                style={{ rotateX: rot, transformOrigin: 'center bottom', transformStyle: 'preserve-3d' }}
                className="absolute inset-x-[4%] top-0 h-[92%] rounded-t-2xl bg-neutral-900 border border-white/10 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.8)] overflow-hidden"
              >
                <div className="absolute inset-2 rounded-xl bg-gradient-to-br from-neutral-800 via-neutral-900 to-black">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white/70 font-mono text-[10px] uppercase tracking-[0.35em]">SmartLid</div>
                  </div>
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 h-1 w-14 rounded-full bg-white/10" />
                </div>
                <div className="absolute inset-0 rounded-t-2xl ring-1 ring-white/5" />
              </motion.div>

              {/* Base (bottom part) */}
              <div className="absolute inset-x-0 bottom-0 h-[10%]">
                <div className="h-full rounded-b-3xl bg-gradient-to-b from-neutral-800 to-neutral-950 border-x border-b border-white/10" />
                <div className="mx-auto mt-1 h-1 w-1/3 rounded-full bg-black/60 blur-[2px]" />
              </div>

              {/* Ground shadow */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 h-6 w-3/4 rounded-full bg-black/60 blur-2xl" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
