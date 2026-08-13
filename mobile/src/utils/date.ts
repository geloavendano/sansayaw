export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const DOWFULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export function pad(n: number): string { return n < 10 ? '0' + n : '' + n; }
export function isoOf(d: Date): string { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
export function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
export function sameDay(a: Date, b: Date): boolean { return isoOf(a) === isoOf(b); }
export function todayLocal(): Date { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }

export function formatLastUpdated(ts: string | null | undefined): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  const dateStr = MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h < 12 ? 'AM' : 'PM';
  return dateStr + ' · ' + (h % 12 || 12) + ':' + pad(m) + ' ' + ampm;
}
