import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getAppData } from '@/lib/data';
import { instructorSlug, parseInstructorId, buildEventJsonLd } from '@/lib/seo';
import { studioName } from '@/lib/studios';
import { T } from '@/lib/theme';
import InstagramEmbed from '@/components/InstagramEmbed';

export const revalidate = 86400;

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function igHandle(instagram) {
  if (!instagram) return null;
  const raw = instagram.trim();
  const handle = raw.startsWith('http') ? raw.replace(/\/$/, '').split('/').pop() : raw.replace(/^@/, '');
  return handle || null;
}

async function findInstructor(slug) {
  const id = parseInstructorId(slug);
  if (!id) return null;
  const { instrs } = await getAppData();
  return instrs[id] || null;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const instructor = await findInstructor(slug);
  if (!instructor) return {};

  const name  = instructor.display_name || instructor.name;
  const title = `${name} — Dance Class Schedule | sa'nsayaw`;
  const description = instructor.bio
    ? `${name} — ${instructor.bio}. See their upcoming dance classes in Metro Manila, updated daily.`
    : `See ${name}'s upcoming dance classes in Metro Manila, updated daily.`;
  const url = `https://www.sansayaw.org/instructors/${instructorSlug(instructor)}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'profile' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function InstructorPage({ params }) {
  const { slug } = await params;
  const id = parseInstructorId(slug);
  const { studios, instrs, classes } = await getAppData();
  const instructor = id ? instrs[id] : null;
  if (!instructor) notFound();

  const name = instructor.display_name || instructor.name;
  const handle = igHandle(instructor.instagram);
  const reels = instructor.reel_urls || [];

  // classes now includes past days (for the homepage/SEO); this page's
  // schedule section is upcoming-only. PHT is UTC+8.
  const todayIso = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  const myClasses = classes
    .filter(c => c.instructor_id === instructor.id && c.date >= todayIso)
    .sort((a, b) => (a.date === b.date
      ? (a.parsedTime?.hour * 60 + a.parsedTime?.minute || 0) - (b.parsedTime?.hour * 60 + b.parsedTime?.minute || 0)
      : a.date < b.date ? -1 : 1));

  const studioIds = [...new Set(myClasses.map(c => c.studioId))];
  const taughtAt = studioIds.map(sid => studios.find(s => s.id === sid)).filter(Boolean);
  const genres = [...new Set(myClasses.map(c => c.genre).filter(Boolean))].sort();

  const byDate = new Map();
  for (const c of myClasses) {
    if (!byDate.has(c.date)) byDate.set(c.date, []);
    byDate.get(c.date).push(c);
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        name,
        description: instructor.bio || undefined,
        image: instructor.photo_url || undefined,
        ...(instructor.instagram ? { sameAs: [instructor.instagram] } : {}),
      },
      ...buildEventJsonLd(myClasses, studios, { days: 14 }),
    ],
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: T.bodyFont, padding: '32px 20px 80px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link href="/" style={{ fontSize: 13, color: T.textDim, textDecoration: 'none' }}>← sa&apos;nsayaw</Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 18 }}>
          {instructor.photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={instructor.photo_url}
              alt={name}
              width={72}
              height={72}
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${T.border}`, flexShrink: 0 }}
            />
          )}
          <div>
            <h1 style={{ fontFamily: T.headingFont, fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
              {name}
            </h1>
            {instructor.bio && (
              <div style={{ fontSize: 14, color: T.textDim, marginTop: 4 }}>{instructor.bio}</div>
            )}
          </div>
        </div>

        {handle && (
          <a href={`https://www.instagram.com/${handle}`} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-block', marginTop: 12, fontSize: 13, color: T.accent, textDecoration: 'none' }}>
            @{handle}
          </a>
        )}

        {genres.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
            {genres.map(g => (
              <span key={g} style={{
                fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: T.pill,
                border: `1px solid ${T.border}`, color: T.textDim,
              }}>{g}</span>
            ))}
          </div>
        )}

        {taughtAt.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: T.textDim, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
              Teaches At
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {taughtAt.map(s => (
                <Link key={s.id} href={`/studios/${s.id}`} style={{
                  fontSize: 13, padding: '7px 12px', borderRadius: T.pill,
                  border: `1px solid ${T.border}`, color: T.text, textDecoration: 'none',
                }}>
                  {studioName(s)}
                </Link>
              ))}
            </div>
          </div>
        )}

        {reels.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: T.textDim, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
              Class Previews
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {reels.map(url => <InstagramEmbed key={url} url={url} />)}
            </div>
          </div>
        )}

        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: T.textDim, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
            Upcoming Classes
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
                  {dayClasses.map(c => {
                    const studio = studios.find(s => s.id === c.studioId);
                    return (
                      <div key={c.id} style={{
                        display: 'flex', alignItems: 'baseline', gap: 12, padding: '10px 14px',
                        borderRadius: T.radius, background: T.panel, border: `1px solid ${T.border}`,
                      }}>
                        <span style={{ fontSize: 12.5, color: T.textDim, minWidth: 76, flexShrink: 0 }}>
                          {c.time_range || '—'}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <span style={{ fontFamily: T.headingFont, fontWeight: 600, fontSize: 14.5 }}>{c.name}</span>
                          {studio && <span style={{ fontSize: 13, color: T.textDim }}> — {studioName(studio)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
