import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAppData } from '@/lib/data';
import { joinNames, buildEventJsonLd, instructorSlug } from '@/lib/seo';
import { studioColor, studioLoc, studioName } from '@/lib/studios';
import { T } from '@/lib/theme';

// Same 24h cache as the homepage — this page reads the same cached query,
// so listing it costs nothing extra.
export const revalidate = 86400;

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function findStudio(id) {
  const { studios } = await getAppData();
  return studios.find(s => s.id === id) || null;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const studio = await findStudio(id);
  if (!studio) return {};

  const label = studioName(studio);
  const city  = studioLoc(studio);
  const title = `${label} Schedule — Dance Classes${city ? ` in ${city}` : ''} | sa'nsayaw`;
  const description =
    `This week's dance class schedule at ${label}${studio.address ? `, ${studio.address}` : ''}. ` +
    `Updated daily — see times, instructors, and styles.`;
  const url = `https://www.sansayaw.org/studios/${studio.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'website' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function StudioPage({ params }) {
  const { id } = await params;
  const { studios, instrs, classes } = await getAppData();
  const studio = studios.find(s => s.id === id);
  if (!studio) notFound();

  // classes now includes past days (for the homepage/SEO); this page's
  // schedule section is upcoming-only. PHT is UTC+8.
  const todayIso = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  const studioClasses = classes
    .filter(c => c.studioId === studio.id && c.date >= todayIso)
    .sort((a, b) => (a.date === b.date
      ? (a.parsedTime?.hour * 60 + a.parsedTime?.minute || 0) - (b.parsedTime?.hour * 60 + b.parsedTime?.minute || 0)
      : a.date < b.date ? -1 : 1));

  const instructorIds = [...new Set(studioClasses.map(c => c.instructor_id).filter(Boolean))];
  const instructors = instructorIds.map(iid => instrs[iid]).filter(Boolean);
  const genres = [...new Set(studioClasses.map(c => c.genre).filter(Boolean))].sort();

  const byDate = new Map();
  for (const c of studioClasses) {
    if (!byDate.has(c.date)) byDate.set(c.date, []);
    byDate.get(c.date).push(c);
  }

  const label = studioName(studio);
  const city  = studioLoc(studio);
  const hue   = studioColor(studio.id);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'DanceGroup',
        name: label,
        url: studio.website || undefined,
        address: {
          '@type': 'PostalAddress',
          streetAddress: studio.address || undefined,
          addressLocality: city || 'Metro Manila',
          addressRegion: 'NCR',
          addressCountry: 'PH',
        },
        ...(studio.instagram ? { sameAs: [studio.instagram] } : {}),
      },
      ...buildEventJsonLd(studioClasses, studios, { days: 14 }),
    ],
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: T.bodyFont, padding: '32px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link href="/" style={{ fontSize: 13, color: T.textDim, textDecoration: 'none' }}>← sa&apos;nsayaw</Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: hue }} />
          <h1 style={{ fontFamily: T.headingFont, fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            {label}
          </h1>
        </div>

        {(city || studio.address) && (
          <div style={{ marginTop: 8, fontSize: 14, color: T.textDim }}>
            {studio.maps_url ? (
              <a href={studio.maps_url} target="_blank" rel="noopener noreferrer" style={{ color: T.textDim, textDecoration: 'underline', textUnderlineOffset: 2 }}>
                {studio.address || city}
              </a>
            ) : (studio.address || city)}
          </div>
        )}

        <div style={{ display: 'flex', gap: 14, marginTop: 14, fontSize: 13 }}>
          {studio.website && (
            <a href={studio.website} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: 'none' }}>
              Website
            </a>
          )}
          {studio.instagram && (
            <a href={studio.instagram} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: 'none' }}>
              Instagram
            </a>
          )}
        </div>

        {genres.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 18 }}>
            {genres.map(g => (
              <span key={g} style={{
                fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: T.pill,
                border: `1px solid ${T.border}`, color: T.textDim,
              }}>{g}</span>
            ))}
          </div>
        )}

        {instructors.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: T.textDim, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
              Instructors
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {instructors.map(i => (
                <Link key={i.id} href={`/instructors/${instructorSlug(i)}`} style={{
                  fontSize: 13, padding: '7px 12px', borderRadius: T.pill,
                  border: `1px solid ${T.border}`, color: T.text, textDecoration: 'none',
                }}>
                  {i.display_name || i.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: T.textDim, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
            Upcoming Schedule
          </h2>
          {byDate.size === 0 && (
            <div style={{ fontSize: 13.5, color: T.textDim }}>No upcoming classes found.</div>
          )}
          {[...byDate.entries()].map(([date, dayClasses]) => {
            const [y, mo, d] = date.split('-').map(Number);
            const dt = new Date(y, mo - 1, d);
            const dayLabel = `${DOW[dt.getDay()]}, ${dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            return (
              <div key={date} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: T.accent, marginBottom: 8 }}>{dayLabel}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dayClasses.map(c => (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'baseline', gap: 12, padding: '10px 14px',
                      borderRadius: T.radius, background: T.panel, border: `1px solid ${T.border}`,
                    }}>
                      <span style={{ fontSize: 12.5, color: T.textDim, minWidth: 76, flexShrink: 0 }}>
                        {c.time_range || '—'}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontFamily: T.headingFont, fontWeight: 600, fontSize: 14.5 }}>{c.name}</span>
                        {c.instructor && <span style={{ fontSize: 13, color: T.textDim }}> — {c.instructor}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
