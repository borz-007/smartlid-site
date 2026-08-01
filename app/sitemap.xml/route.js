export const dynamic = 'force-static';

const SITE = 'https://slid-tech.com';
const PAGES = ['', '/technology', '/patent', '/accessibility', '/investors', '/press', '/media-kit', '/faq', '/contact'];

export function GET() {
  const now = new Date().toISOString();
  const urls = PAGES.map((p) => `  <url>\n    <loc>${SITE}${p}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${p === '' ? '1.0' : '0.7'}</priority>\n  </url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
