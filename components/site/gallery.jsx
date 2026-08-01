'use client';

import { useRef } from 'react';
import { useScroll, useTransform, motion } from 'framer-motion';

const IMAGES = [
  { src: 'https://images.pexels.com/photos/25849102/pexels-photo-25849102.png', label: 'Prototype · Studio' },
  { src: 'https://images.pexels.com/photos/393043/pexels-photo-393043.jpeg',    label: 'Prototype · Profile' },
  { src: 'https://images.pexels.com/photos/986774/pexels-photo-986774.jpeg',    label: 'Prototype · Backlit' },
  { src: 'https://images.unsplash.com/photo-1759588071845-3864bd8cc9d3',        label: 'Companion · App' },
  { src: 'https://images.pexels.com/photos/18850134/pexels-photo-18850134.jpeg', label: 'Prototype · Detail' },
];

export default function Gallery() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const x = useTransform(scrollYProgress, [0, 1], ['5%', '-55%']);

  return (
    <section ref={ref} className="relative py-32 overflow-hidden">
      <div className="container mb-16">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Prototype gallery</div>
        <h2 className="display mt-6 text-5xl md:text-7xl text-balance">Every angle. Considered.</h2>
      </div>
      <motion.div style={{ x }} className="flex gap-6 w-[220%] will-change-transform">
        {IMAGES.map((im, i) => (
          <figure key={i} className="relative w-[46vw] shrink-0 aspect-[4/5] rounded-3xl overflow-hidden border border-border/60">
            <img src={im.src} alt={im.label} className="h-full w-full object-cover" loading="lazy" />
            <figcaption className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white/90">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em]">{im.label}</span>
              <span className="font-mono text-[10px] opacity-60">0{i+1}</span>
            </figcaption>
            <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-3xl" />
          </figure>
        ))}
      </motion.div>
    </section>
  );
}
