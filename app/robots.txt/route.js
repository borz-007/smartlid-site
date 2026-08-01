export const dynamic = 'force-static';

export function GET() {
  const body = `User-agent: *\nAllow: /\n\nSitemap: https://slid-tech.com/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
