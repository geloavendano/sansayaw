import { Geist, Geist_Mono } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { getAppData } from '@/lib/data';
import { joinNames } from '@/lib/seo';
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

const TITLE = "sa'nsayaw · Manila Dance Classes, Studios & Schedules";

// Metadata is generated (not static) so the studio list in the description
// and keywords stays accurate as studios are added — it reads the same
// cached data.js query the homepage uses, so this costs nothing extra.
export async function generateMetadata() {
  const { studios } = await getAppData();
  const names = [...new Set(studios.map(s => s.name))].sort();
  const studioList = joinNames(names) || 'Metro Manila dance studios';

  const description =
    `Find open dance classes in Metro Manila. ${studioList} — hip hop, ` +
    `K-pop, heels, dancehall, and more. Updated daily.`;

  const keywords = [
    'dance classes Manila', 'Manila dance studios', 'Metro Manila dance class schedule',
    'hip hop dance Manila', 'K-pop dance class Manila', 'heels class Manila',
    'open choreography Manila', 'dancehall Manila', 'dance class today Philippines',
    ...names.map(n => `${n} schedule`),
    ...names.map(n => `${n} classes`),
  ].join(', ');

  return {
    title: TITLE,
    description,
    keywords,
    metadataBase: new URL('https://www.sansayaw.org'),
    openGraph: {
      type: 'website',
      siteName: "sa'nsayaw",
      title: TITLE,
      description,
      url: 'https://www.sansayaw.org',
    },
    twitter: {
      card: 'summary_large_image',
      title: TITLE,
      description,
    },
    alternates: {
      canonical: 'https://www.sansayaw.org',
    },
  };
}

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
