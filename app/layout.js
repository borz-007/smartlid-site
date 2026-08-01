import './globals.css';
import { Inter, Roboto_Slab, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import Navbar from '@/components/site/navbar';
import Footer from '@/components/site/footer';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const serif = Roboto_Slab({ subsets: ['latin'], weight: ['400','500','700','900'], variable: '--font-serif', display: 'swap' });
const mono  = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://slid-tech.com';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'SmartLid — Automated, safety-monitored motion for computing devices', template: '%s · SmartLid' },
  description: 'A patent-pending closed-loop control architecture for automated, safety-monitored physical movement of computing devices — beginning with the laptop lid.',
  keywords: ['SmartLid','intelligent lid','automated laptop','motion control','accessibility','OEM','patent pending','slid-tech','Usman Esamerzaev'],
  authors: [{ name: 'Usman Esamerzaev' }],
  creator: 'SmartLid',
  publisher: 'SmartLid',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: 'SmartLid',
    title: 'SmartLid — Automated, safety-monitored motion for computing devices',
    description: 'A patent-pending closed-loop control architecture for automated, safety-monitored physical movement of computing devices.',
    locale: 'en_US',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'SmartLid — Automated motion for computing devices' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SmartLid',
    description: 'Automated, safety-monitored motion for computing devices — beginning with the laptop lid.',
    images: ['/og.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' },
    ],
    apple: '/favicon.svg',
  },
  category: 'technology',
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF9F6' },
    { media: '(prefers-color-scheme: dark)',  color: '#1B2432' },
  ],
  width: 'device-width',
  initialScale: 1,
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'SmartLid',
  url: SITE_URL,
  logo: `${SITE_URL}/favicon.svg`,
  email: 'ceo@slid-tech.com',
  founder: { '@type': 'Person', name: 'Usman Esamerzaev' },
  description: 'A patent-pending closed-loop control architecture for automated, safety-monitored physical movement of computing devices.',
  sameAs: [],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${serif.variable} ${mono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      </head>
      <body className="font-sans bg-background text-foreground antialiased">
        <Providers>
          <Navbar />
          <main className="min-h-[calc(100vh-64px)]">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
