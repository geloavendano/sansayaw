import { useEffect, useMemo, useState } from 'react';
import { track } from '../lib/analytics';
import { T } from '../lib/theme';
import { studioColor, studioLoc, studioName } from '../lib/studios';
import type { ClassRow, Studio } from '../types';
import { DOW, isoOf, pad, todayLocal } from '../utils/date';
import { Icon } from './Icon';
import { SectionLabel, TopBar } from './Primitives';

const SUGGESTIONS = ['Hip-Hop', 'K-Pop', 'Heels', 'Zero Studio', 'Playground', 'Nude Floor'];

interface SearchTabProps {
  query: string;
  setQuery: (q: string) => void;
  classes: ClassRow[];
  studios: Studio[];
  onOpenClass: (c: ClassRow) => void;
}

export function SearchTab({ query, setQuery, classes, studios, onOpenClass }: SearchTabProps) {
  const q = query.trim().toLowerCase();
  const [includePast, setIncludePast] = useState(false);
  const todayIso = isoOf(todayLocal());

  const results = useMemo(() => {
    if (!q) return [];
    return classes.filter(c => {
      if (!includePast && c.date < todayIso) return false;
      const s = studios.find(x => x.id === c.studioId);
      return c.name.toLowerCase().includes(q)
        || (c.instructor || '').toLowerCase().includes(q)
        || (s && s.name.toLowerCase().includes(q))
        || (c.genre || '').toLowerCase().includes(q);
    }).sort((a, b) => {
      if (a.date !== b.date) {
        if (includePast) {
          const da = Math.abs(new Date(a.date).getTime() - new Date(todayIso).getTime());
          const db = Math.abs(new Date(b.date).getTime() - new Date(todayIso).getTime());
          if (da !== db) return da - db;
        }
        return a.date < b.date ? -1 : 1;
      }
      const at = a.parsedTime ? a.parsedTime.hour * 60 + a.parsedTime.minute : 0;
      const bt = b.parsedTime ? b.parsedTime.hour * 60 + b.parsedTime.minute : 0;
      return at - bt;
    }).slice(0, 30);
  }, [q, classes, studios, includePast, todayIso]);

  // Track the search term 700ms after typing pauses — not on every
  // keystroke — so "banana" doesn't produce 6 separate events for "b",
  // "ba", "ban"... results.length is captured too so zero-result queries
  // are easy to spot in analysis.
  useEffect(() => {
    if (!q) return;
    const t = setTimeout(() => {
      track('search', { query: q, result_count: results.length, include_past: includePast });
    }, 700);
    return () => clearTimeout(t);
  }, [q, includePast, results.length]);

  const studioCounts = useMemo(() => {
    const ct: Record<string, number> = {};
    classes.forEach(c => { if (c.date >= todayIso) ct[c.studioId] = (ct[c.studioId] || 0) + 1; });
    return ct;
  }, [classes, todayIso]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar />
      <div style={{ padding: '8px 18px 14px' }}>
        <div style={{ fontFamily: T.headingFont, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 12 }}>
          Search
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: T.panel, border: '1px solid ' + T.border,
          borderRadius: T.pill, padding: '11px 14px',
        }}>
          <span style={{ color: T.accent, display: 'inline-flex' }}><Icon.search s={16} /></span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Class, instructor, or studio"
            style={{
              flex: 1, background: 'transparent', border: 0, outline: 0,
              color: T.text, fontFamily: T.bodyFont,
              fontSize: 16,
              caretColor: T.accent,
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'transparent', border: 0, color: T.textDim, cursor: 'pointer', padding: 0, display: 'flex' }}>
              <Icon.x s={16} />
            </button>
          )}
        </div>
        {q && (
          <button onClick={() => setIncludePast(p => !p)} style={{
            marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 7,
            background: includePast ? T.accentSoft : 'transparent',
            border: '1px solid ' + (includePast ? T.accent : T.borderStrong),
            color: includePast ? T.accent : T.textDim,
            borderRadius: T.pill, padding: '6px 12px',
            fontFamily: T.bodyFont, fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}>
            <span style={{
              width: 14, height: 14, borderRadius: 4, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center',
              border: '1.5px solid ' + (includePast ? T.accent : T.borderStrong),
              background: includePast ? T.accent : 'transparent', color: T.accentOn,
            }}>{includePast && <Icon.check s={10} />}</span>
            Include past classes
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 110px' }}>
        {!q ? (
          <>
            <SectionLabel>Try searching for</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => setQuery(s)} style={{
                  background: T.panel, border: '1px solid ' + T.border, color: T.text,
                  borderRadius: T.pill, padding: '8px 13px',
                  fontFamily: T.bodyFont, fontSize: 12.5, cursor: 'pointer',
                }}>{s}</button>
              ))}
            </div>
            <SectionLabel>Browse by studio</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {studios.map(s => (
                <button key={s.id} onClick={() => setQuery(s.name)} style={{
                  background: T.panel, border: '1px solid ' + T.border,
                  padding: '14px 16px', display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', color: T.text, cursor: 'pointer',
                  borderRadius: T.radius, textAlign: 'left', fontFamily: T.bodyFont,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: studioColor(s.id) }} />
                    <div>
                      <div style={{ fontFamily: T.headingFont, fontSize: 15, fontWeight: 600 }}>{studioName(s)}</div>
                      <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>{studioLoc(s)}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: T.textDim }}>{studioCounts[s.id] || 0} classes</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <SectionLabel>{results.length} result{results.length === 1 ? '' : 's'}</SectionLabel>
            {results.length === 0 && (
              <div style={{ padding: '40px 0', color: T.textDim, textAlign: 'center', fontSize: 13 }}>
                Nothing matches &ldquo;{query}&rdquo; yet.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {results.map(r => {
                const s = studios.find(x => x.id === r.studioId);
                const sHue = studioColor(r.studioId);
                const [y, mo, da] = r.date.split('-').map(Number);
                const d = new Date(y, mo - 1, da);
                const pt = r.parsedTime;
                const td = pt ? (pt.hour % 12 === 0 ? 12 : pt.hour % 12) + ':' + pad(pt.minute) + (pt.hour < 12 ? 'am' : 'pm') : r.time_range || '';
                return (
                  <button key={r.id} onClick={() => onOpenClass(r)} style={{
                    background: T.panel, border: '1px solid ' + T.border,
                    borderRadius: T.radius, padding: '12px 14px',
                    textAlign: 'left', cursor: 'pointer', color: T.text, fontFamily: T.bodyFont,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <div style={{ fontFamily: T.headingFont, fontSize: 14.5, fontWeight: 600, lineHeight: 1.25, flex: 1, minWidth: 0 }}>
                        {r.name}
                      </div>
                      <div style={{ fontSize: 12, color: T.accent, fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {DOW[d.getDay()]} {d.getDate()} · {td}
                      </div>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12.5, color: T.textDim, display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: sHue, flex: '0 0 auto' }} />
                      <span>{r.instructor} · <span style={{ color: T.text }}>{s ? studioName(s) : r.studioId}</span></span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
