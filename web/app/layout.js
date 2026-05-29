import { Geist, Geist_Mono } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

export const metadata = {
  title: "sa'nsayaw · Manila Dance Classes, Studios & Schedules",
  description:
    'Find open dance classes in Metro Manila. Zero Studio, The Playground Studios, Nude Floor & 808 Studio — hip hop, K-pop, heels, dancehall. Updated daily.',
  keywords:
    'dance classes Manila, Manila dance studios, Metro Manila dance class schedule, Zero Studio schedule, Playground Studios classes, Nude Floor Manila, 808 Studio BGC, 808 Studio Podium, hip hop dance Manila, K-pop dance class Manila, heels class Manila, open choreography Manila, dancehall Manila, dance class today Philippines',
  metadataBase: new URL('https://sansayaw.org'),
  openGraph: {
    type: 'website',
    siteName: "sa'nsayaw",
    title: "sa'nsayaw · Manila Dance Classes, Studios & Schedules",
    description:
      'One place to find every open dance class in Metro Manila. Schedules from Zero Studio, The Playground Studios, Nude Floor & 808 Studio — updated daily.',
    url: 'https://sansayaw.org',
  },
  twitter: {
    card: 'summary',
    title: "sa'nsayaw · Manila Dance Classes, Studios & Schedules",
    description:
      'Find open dance classes in Metro Manila. Zero Studio, Playground Studios, Nude Floor & 808 Studio — hip hop, K-pop, heels, dancehall. Updated daily.',
  },
  alternates: {
    canonical: 'https://sansayaw.org',
  },
};

export const viewport = {
  themeColor: '#0a1820',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>{children}</body>
      <GoogleAnalytics gaId="G-1SK7Z2G248" />
    </html>
  );
}
