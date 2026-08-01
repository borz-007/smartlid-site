'use client';

import { useRef, useState } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';

export default function HeroVideo({ src = '/hero-demo.mp4', poster = '/og.png' }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  const toggle = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };
  const toggleMute = () => {
    const v = videoRef.current; if (!v) return;
    v.muted = !v.muted; setMuted(v.muted);
  };

  return (
    <figure className="relative mx-auto aspect-video max-w-6xl rounded-3xl overflow-hidden border border-border/60 bg-card group">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {/* Overlay controls */}
      <div className="absolute inset-0 flex items-end justify-between p-4 md:p-6 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2">
          <button onClick={toggle} aria-label={playing ? 'Pause demo' : 'Play demo'} className="h-10 w-10 rounded-full bg-background/70 backdrop-blur border border-border/60 flex items-center justify-center hover:bg-background transition">
            {playing ? <span className="h-3 w-3 grid grid-cols-2 gap-[3px]"><span className="bg-foreground rounded-[1px]"/><span className="bg-foreground rounded-[1px]"/></span> : <Play className="h-4 w-4 translate-x-[1px]" />}
          </button>
          <button onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="h-10 w-10 rounded-full bg-background/70 backdrop-blur border border-border/60 flex items-center justify-center hover:bg-background transition">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
        <div className="pointer-events-auto font-mono text-[10px] uppercase tracking-[0.3em] text-white/80 bg-black/40 backdrop-blur px-3 py-1 rounded-full">SmartLid · Demo</div>
      </div>
      <div className="absolute inset-0 ring-1 ring-inset ring-white/5 rounded-3xl pointer-events-none" />
    </figure>
  );
}
