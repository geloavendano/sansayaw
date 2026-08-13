import { useRef, useState, type TouchEvent } from 'react';
import { T } from '../lib/theme';
import { shareICS } from '../lib/ics';
import { openExternal } from '../lib/links';
import { studioColor, studioLoc, studioName } from '../lib/studios';
import type { ClassRow, Instructor, Studio } from '../types';
import { buildCalendarData } from '../utils/calendar';
import { DOWFULL, formatLastUpdated, MONTHS, sameDay } from '../utils/date';
import { initials, placeholderGrad } from '../utils/style';
import { Icon } from './Icon';
import { InstructorAvatar } from './InstructorAvatar';
import { Pill, SectionDivider } from './Primitives';
import { StudioPhoto } from './StudioPhoto';

interface ClassDetailSheetProps {
  c: ClassRow;
  studio: Studio | undefined;
  instrInfo: Instructor | undefined;
  TODAY: Date;
  onClose: () => void;
}

export function ClassDetailSheet({ c, studio, instrInfo, TODAY, onClose }: ClassDetailSheetProps) {
  const info = instrInfo || ({} as Instructor);
  const [dragY, setDragY] = useState(0);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchMove = (e: TouchEvent) => {
    if (!startRef.current) return;
    const scroll = scrollRef.current;
    if (scroll && scroll.scrollTop > 0) return;
    const dx = e.touches[0].clientX - startRef.current.x;
    const dy = e.touches[0].clientY - startRef.current.y;
    if (dy > 0 && dy > Math.abs(dx)) setDragY(dy);
  };
  const handleTouchEnd = () => {
    if (dragY > 80) { onClose(); } else { setDragY(0); }
    startRef.current = null;
  };

  const [y, mo, da] = c.date.split('-').map(Number);
  const d = new Date(y, mo - 1, da);
  const isToday = sameDay(d, TODAY);
  const dateLabel = (isToday ? 'Today · ' : DOWFULL[d.getDay()] + ', ') + MONTHS[d.getMonth()] + ' ' + d.getDate();
  const sHue = studioColor(c.studioId);
  const sNm = studio ? studioName(studio) : c.studioId;
  const sLc = studio ? studioLoc(studio) : '';

  const instaHandle = (() => {
    const raw = (info.instagram || '').trim();
    if (!raw) return null;
    const handle = raw.startsWith('http')
      ? raw.replace(/\/$/, '').split('/').pop()
      : raw.replace(/^@/, '');
    return handle || null;
  })();

  const mapsHref = (() => {
    if (studio?.maps_url) return studio.maps_url;
    if (!sLc) return null;
    const mapsQ = encodeURIComponent(studio?.address ? `${sNm} ${studio.address}` : `${sNm} ${sLc}`);
    return `https://maps.google.com/?q=${mapsQ}`;
  })();

  const cal = buildCalendarData(c, studio);
  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '13px 14px', width: '100%', textAlign: 'left' as const,
    background: T.panel, border: '1px solid ' + T.border, borderRadius: T.radius, color: T.text,
    fontFamily: T.bodyFont, cursor: 'pointer',
  };
  const iconBox = {
    width: 32, height: 32, borderRadius: 8,
    background: T.accentSoft, color: T.accent,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
  };
  const label1 = { fontSize: 13, fontWeight: 500 };
  const label2 = { fontSize: 11.5, color: T.textDim, marginTop: 1, fontFamily: T.monoFont };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }} />
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragY === 0 ? 'transform .3s cubic-bezier(.2,.7,.3,1)' : 'none',
          willChange: 'transform',
        }}
      >
        <div style={{
          position: 'relative', background: T.bgSoft,
          borderTop: '1px solid ' + T.borderStrong,
          borderTopLeftRadius: 22, borderTopRightRadius: 22,
          maxHeight: '94vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
          animation: 'snsIn .26s cubic-bezier(.2,.7,.3,1)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flex: '0 0 auto' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: T.borderStrong }} />
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            position: 'absolute', top: 14, right: 14, zIndex: 2,
            background: 'transparent', border: 0,
            color: T.textDim, cursor: 'pointer', padding: 4,
            display: 'flex', alignItems: 'center',
          }}>
            <Icon.x s={18} />
          </button>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 18px calc(26px + env(safe-area-inset-bottom))' }}>
            <StudioPhoto studio={studio} />

            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: T.accent, fontWeight: 500, flexWrap: 'wrap' }}>
              <Icon.calSm s={13} /><span>{dateLabel}</span>
              {c.time_range && <>
                <span style={{ color: T.textMute }}>·</span>
                <Icon.clock s={13} /><span>{c.time_range}</span>
              </>}
            </div>

            <h2 style={{ margin: '8px 0 0', fontFamily: T.headingFont, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.15, color: T.text }}>
              {c.name}
            </h2>

            {(c.genre || c.venue) && (
              <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {c.genre && <Pill>{c.genre}</Pill>}
                {c.venue && <Pill subtle>{c.venue}</Pill>}
              </div>
            )}

            <SectionDivider label="Instructor" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <InstructorAvatar name={c.instructor} info={info} size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.headingFont, fontSize: 16, fontWeight: 600 }}>{c.instructor}</div>
                {info.bio && <div style={{ fontSize: 12.5, color: T.textDim, marginTop: 2 }}>{info.bio}</div>}
                {instaHandle && (
                  <button onClick={() => openExternal(`https://www.instagram.com/${instaHandle}`)} style={{
                    fontFamily: T.monoFont, fontSize: 11.5, color: T.accent, marginTop: 4,
                    display: 'block', background: 'transparent', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left',
                  }}>
                    @{instaHandle}
                  </button>
                )}
              </div>
            </div>

            <SectionDivider label="Studio" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{
                width: 56, height: 56, borderRadius: T.radius,
                background: placeholderGrad(studio?.id || ''),
                border: '1px solid ' + T.borderStrong, flex: '0 0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: T.headingFont, fontWeight: 700, fontSize: 16, color: sHue,
              }}>{initials(sNm)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.headingFont, fontSize: 16, fontWeight: 600 }}>{sNm}</div>
                {sLc && mapsHref && (
                  <button onClick={() => openExternal(mapsHref)} style={{
                    fontSize: 12.5, color: T.textDim, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5,
                    background: 'transparent', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left',
                  }}>
                    <Icon.pin s={12} /><span style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>{sLc}</span>
                  </button>
                )}
                {studio?.address && (
                  <div style={{ fontSize: 11.5, color: T.textMute, marginTop: 2, lineHeight: 1.5 }}>{studio.address}</div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {studio?.website && (
                <button onClick={() => openExternal(studio.website)} style={rowStyle}>
                  <span style={iconBox}><Icon.globe s={16} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={label1}>Visit website</div>
                    <div style={{ ...label2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {studio.website.replace(/^https?:\/\//, '')}
                    </div>
                  </div>
                  <span style={{ color: T.textMute, flex: '0 0 auto' }}><Icon.ext s={14} /></span>
                </button>
              )}
              {studio?.instagram && (
                <button onClick={() => openExternal(studio.instagram)} style={rowStyle}>
                  <span style={iconBox}><span style={{ fontFamily: T.headingFont, fontSize: 16, fontWeight: 600 }}>@</span></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={label1}>Instagram</div>
                    <div style={{ ...label2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {studio.instagram.replace('https://www.instagram.com/', '@').replace(/\/$/, '')}
                    </div>
                  </div>
                  <span style={{ color: T.textMute, flex: '0 0 auto' }}><Icon.ext s={14} /></span>
                </button>
              )}
            </div>

            <SectionDivider label="Add to calendar" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => openExternal(cal.gcalUrl)} style={rowStyle}>
                <span style={iconBox}><Icon.cal s={16} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={label1}>Google Calendar</div>
                  <div style={label2}>Opens in Safari</div>
                </div>
                <span style={{ color: T.textMute, flex: '0 0 auto' }}><Icon.ext s={14} /></span>
              </button>
              <button onClick={() => shareICS(cal.ics, cal.filename)} style={rowStyle}>
                <span style={iconBox}><Icon.download s={16} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={label1}>Add to Calendar app</div>
                  <div style={label2}>Apple Calendar · Outlook · more</div>
                </div>
              </button>
            </div>

            {c.last_updated && (
              <div style={{ marginTop: 20, fontSize: 11, color: T.textMute, textAlign: 'center' }}>
                Schedule last updated {formatLastUpdated(c.last_updated)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
