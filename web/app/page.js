import { getAppData } from '@/lib/data';
import DanceApp from '@/components/DanceApp';

// ISR: allow cache to stay fresh up to 24 hours.
// Vercel/Next.js will revalidate on the next request after 86400 s.
export const revalidate = 86400;

// ── JSON-LD helpers ────────────────────────────────────────────

function timeRangeTo24h(timeRange) {
  const m = timeRange.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10), min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
}

function buildJsonLd(classes, studios) {
  const now      = new Date();
  const cutoff   = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // next 14 days

  const events = classes
    .filter(c => {
      const [y, mo, d] = c.date.split('-').map(Number);
      const classDate  = new Date(y, mo - 1, d);
      return classDate >= now && classDate <= cutoff;
    })
    .slice(0, 60)
    .map(c => {
      const studio     = studios.find(s => s.id === c.studioId);
      const time24     = c.time_range ? timeRangeTo24h(c.time_range) : null;
      const startDate  = c.date + (time24 ? `T${time24}+08:00` : '');

      return {
        '@type':               'Event',
        name:                  c.name,
        startDate,
        location: {
          '@type':   'Place',
          name:      studio?.name || c.studioId,
          address: {
            '@type':           'PostalAddress',
            addressLocality:   'Metro Manila',
            addressCountry:    'PH',
            streetAddress:     studio?.address || undefined,
          },
        },
        organizer: {
          '@type': 'Organization',
          name:    studio?.name || c.studioId,
          url:     studio?.website || undefined,
        },
        ...(c.instructor ? {
          performer: { '@type': 'Person', name: c.instructor },
        } : {}),
        description: [
          `${c.name} dance class`,
          c.instructor ? `with ${c.instructor}` : null,
          `at ${studio?.name || c.studioId} in Metro Manila.`,
          c.time_range ? `Time: ${c.time_range}.` : null,
          c.genre ? `Genre: ${c.genre}.` : null,
        ].filter(Boolean).join(' '),
        eventStatus:         'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      };
    });

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type':       'WebSite',
        name:          "sa'nsayaw",
        url:           'https://sansayaw.ph',
        description:   'Metro Manila dance class schedule aggregator. Find open classes at Zero Studio, The Playground Studios, and Nude Floor.',
      },
      ...events,
    ],
  };
}

// ── Page ───────────────────────────────────────────────────────

export default async function Home() {
  const data   = await getAppData();
  const jsonLd = buildJsonLd(data.classes, data.studios);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DanceApp
        studios={data.studios}
        instrs={data.instrs}
        classes={data.classes}
        lastUpdated={data.lastUpdated}
      />
    </>
  );
}
