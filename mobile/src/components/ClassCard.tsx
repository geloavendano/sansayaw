import { T } from '../lib/theme';
import { studioColor, studioName } from '../lib/studios';
import type { ClassRow, Studio } from '../types';
import { pad } from '../utils/date';
import { Pill } from './Primitives';

export function ClassCard({ c, studios, onClick }: { c: ClassRow; studios: Studio[]; onClick?: () => void }) {
  const studio = studios.find(s => s.id === c.studioId);
  const sHue = studioColor(c.studioId);
  const pt = c.parsedTime;
  const timeStr = pt ? (pt.hour % 12 === 0 ? 12 : pt.hour % 12) + ':' + pad(pt.minute) : '—';
  const apStr = pt ? (pt.hour < 12 ? 'am' : 'pm') : '';

  return (
    <article onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} style={{
      background: T.panel, border: '1px solid ' + T.border,
      borderRadius: T.radius, padding: '14px 16px',
      backdropFilter: 'blur(6px)',
      display: 'grid', gridTemplateColumns: '56px 1fr', gap: 14,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'border-color .15s',
    }}>
      <div style={{ borderRight: '1px solid ' + T.border, paddingRight: 12 }}>
        <div style={{ fontFamily: T.headingFont, fontSize: 18, fontWeight: 600, color: T.accent, lineHeight: 1, letterSpacing: '-0.01em' }}>
          {timeStr}
        </div>
        <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>{apStr}</div>
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: T.headingFont, fontSize: 15.5, fontWeight: 600, lineHeight: 1.25, letterSpacing: '-0.005em' }}>
          {c.name}
        </div>
        <div style={{ marginTop: 6, fontSize: 12.5, color: T.textDim }}>{c.instructor}</div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: sHue, flex: '0 0 auto' }} />
            <span style={{ fontSize: 12, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {studio ? studioName(studio) : c.studioId}
            </span>
          </div>
          {c.genre && <Pill>{c.genre}</Pill>}
        </div>
      </div>
    </article>
  );
}
