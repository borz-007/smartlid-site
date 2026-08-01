import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container min-h-[70vh] flex flex-col items-center justify-center text-center">
      <div className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">404</div>
      <h1 className="mt-4 text-5xl md:text-7xl font-semibold tracking-tight">Page not found.</h1>
      <p className="mt-4 text-muted-foreground">The page you're looking for does not exist.</p>
      <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-3 text-sm font-medium hover:opacity-90">
        Back to home
      </Link>
    </div>
  );
}
