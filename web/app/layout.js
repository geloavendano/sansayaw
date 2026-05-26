import { Geist, Geist_Mono } from 'next/font/google';
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
  title: "sa'nsayaw · MNL dance classes",
  description:
    'Metro Manila dance class schedule aggregator. Find open classes at Zero Studio, The Playground Studios, and Nude Floor. Updated daily.',
  metadataBase: new URL('https://sansayaw.org'),
  openGraph: {
    type: 'website',
    siteName: "sa'nsayaw",
    title: "sa'nsayaw · MNL dance classes",
    description:
      'One place to find every open dance class in Metro Manila. Schedules from Zero Studio, The Playground, and Nude Floor — updated daily.',
    url: 'https://sansayaw.org',
  },
  twitter: {
    card: 'summary',
    title: "sa'nsayaw · MNL dance classes",
    description: 'One place to find every open dance class in Metro Manila. Updated daily.',
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
    </html>
  );
}
