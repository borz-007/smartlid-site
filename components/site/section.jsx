export function Section({ id, className = '', children }) {
  return (
    <section id={id} className={`relative py-28 md:py-40 ${className}`}>
      <div className="container">{children}</div>
    </section>
  );
}

export function Eyebrow({ children }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
      {children}
    </div>
  );
}

export function H2({ children, className = '' }) {
  return (
    <h2 className={`display text-5xl md:text-7xl lg:text-8xl text-balance ${className}`}>{children}</h2>
  );
}
