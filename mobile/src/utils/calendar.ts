import type { ClassRow, Studio } from '../types';

interface TimeRange {
  start: { h: number; min: number };
  end: { h: number; min: number };
}

export function parseTimeRange(timeRange: string | null | undefined): TimeRange | null {
  if (!timeRange) return null;
  const parts = timeRange.split(/\s*[–\-]\s*/);
  if (parts.length < 2) return null;
  function parse12h(t: string) {
    const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!m) return null;
    let h = parseInt(m[1]), min = parseInt(m[2]);
    const ap = m[3].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return { h, min };
  }
  const start = parse12h(parts[0]);
  const end = parse12h(parts[1]);
  return (start && end) ? { start, end } : null;
}

export interface CalendarData {
  gcalUrl: string;
  ics: string;
  filename: string;
}

export function buildCalendarData(c: ClassRow, studio: Studio | undefined): CalendarData {
  const times = parseTimeRange(c.time_range);
  const [y, mo, d] = c.date.split('-').map(Number);
  const sNm = studio?.branch ? `${studio.name} ${studio.branch}` : (studio?.name || '');
  const title = c.instructor ? `${c.name} w/ ${c.instructor}` : c.name;
  const loc = [sNm, studio?.address].filter(Boolean).join(', ');
  const desc = [
    c.instructor ? `Instructor: ${c.instructor}` : null,
    c.genre ? `Style: ${c.genre}` : null,
    c.venue ? `Venue: ${c.venue}` : null,
    studio?.website ? `More info: ${studio.website}` : null,
  ].filter(Boolean).join('\n');

  // PHT → UTC (Manila is UTC+8)
  function toUTC(y: number, mo: number, d: number, h: number, min: number) {
    return new Date(Date.UTC(y, mo - 1, d, h - 8, min))
      .toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
  function toICSLocal(y: number, mo: number, d: number, h: number, min: number) {
    return `${y}${String(mo).padStart(2, '0')}${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}${String(min).padStart(2, '0')}00`;
  }

  const dtFmt = times ? 'TZID=Asia/Manila:' : 'VALUE=DATE:';
  const dtS = times ? toICSLocal(y, mo, d, times.start.h, times.start.min) : c.date.replace(/-/g, '');
  const dtE = times ? toICSLocal(y, mo, d, times.end.h, times.end.min) : c.date.replace(/-/g, '');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//sansayaw//sansayaw.org//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART;${dtFmt}${dtS}`,
    `DTEND;${dtFmt}${dtE}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${desc.replace(/\n/g, '\\n')}`,
    `LOCATION:${loc}`,
    'STATUS:CONFIRMED',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');

  const gcalStart = times ? toUTC(y, mo, d, times.start.h, times.start.min) : c.date.replace(/-/g, '');
  const gcalEnd = times ? toUTC(y, mo, d, times.end.h, times.end.min) : c.date.replace(/-/g, '');
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${gcalStart}/${gcalEnd}` +
    `&details=${encodeURIComponent(desc)}` +
    `&location=${encodeURIComponent(loc)}`;

  const filename = title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.ics';
  return { gcalUrl, ics, filename };
}
