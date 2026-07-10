// "A, B, and C" — Oxford comma, correct for 0/1/2/3+ items.
export function joinNames(names) {
  if (!names || names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function kebab(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Instructor URLs are "<name-slug>-<id>" — readable for search results and
// sharing, but the trailing numeric id (the real primary key) is what's
// actually used to look the record up, so renaming an instructor never
// breaks a link already shared out.
export function instructorSlug(instructor) {
  const name = instructor.display_name || instructor.name || '';
  return `${kebab(name)}-${instructor.id}`;
}

export function parseInstructorId(slug) {
  const m = /-(\d+)$/.exec(slug || '');
  return m ? Number(m[1]) : null;
}

function timeRangeTo24h(timeRange) {
  const m = (timeRange || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1], 10), min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
}

// Schema.org Event entries for JSON-LD, shared by the homepage, studio
// pages, and instructor pages. `classes` should already be scoped to
// whatever the caller wants (a studio, an instructor, everything).
export function buildEventJsonLd(classes, studios, { days = 14, limit = 200 } = {}) {
  const now    = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  return classes
    .filter(c => {
      const [y, mo, d] = c.date.split('-').map(Number);
      const classDate  = new Date(y, mo - 1, d);
      return classDate >= now && classDate <= cutoff;
    })
    .slice(0, limit)
    .map(c => {
      const studio      = studios.find(s => s.id === c.studioId);
      const time24      = c.time_range ? timeRangeTo24h(c.time_range) : null;
      const startDate   = c.date + (time24 ? `T${time24}+08:00` : '');
      const studioLabel = studio?.branch ? `${studio.name} ${studio.branch}` : studio?.name || c.studioId;

      return {
        '@type':               'Event',
        name:                  c.name,
        startDate,
        location: {
          '@type':   'Place',
          name:      studioLabel,
          address: {
            '@type':           'PostalAddress',
            addressLocality:   'Metro Manila',
            addressRegion:     'NCR',
            addressCountry:    'PH',
            streetAddress:     studio?.address || undefined,
          },
        },
        organizer: {
          '@type': 'Organization',
          name:    studioLabel,
          url:     studio?.website || undefined,
        },
        ...(c.instructor ? {
          performer: { '@type': 'Person', name: c.instructor },
        } : {}),
        description: [
          `${c.name} dance class`,
          c.instructor ? `with ${c.instructor}` : null,
          `at ${studioLabel} in Metro Manila, Philippines.`,
          c.time_range ? `Time: ${c.time_range} PHT.` : null,
          c.genre ? `Style: ${c.genre}.` : null,
        ].filter(Boolean).join(' '),
        eventStatus:         'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      };
    });
}
