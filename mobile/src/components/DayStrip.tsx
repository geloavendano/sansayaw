import { useEffect, useRef } from 'react';
import { T } from '../lib/theme';
import { addDays, DOW, isoOf, sameDay } from '../utils/date';
import { hexA } from '../utils/style';

interface DayStripProps {
  date: Date;
  setDate: (d: Date) => void;
  TODAY: Date;
  dateCount: Record<string, number>;
}

export function DayStrip({ date, setDate, TODAY, dateCount }: DayStripProps) {
  const start = addDays(TODAY, -3);
  const days = Array.from({ length: 21 }, (_, i) => addDays(start, i));
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sel = el.querySelector("[data-sel='1']");
    if (sel) {
      const r = sel.getBoundingClientRect(), er = el.getBoundingClientRect();
      el.scrollLeft += r.left - er.left - er.width / 2 + r.width / 2;
    }
  }, [date]);

  return (
    <div ref={ref} style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 14px', scrollbarWidth: 'none' }}>
      {days.map((d, i) => {
        const sel = sameDay(d, date);
        const isT = sameDay(d, TODAY);
        const cnt = dateCount[isoOf(d)] || 0;

        const bg = sel ? T.accent : isT ? T.accentSoft : T.panel;
        const border = sel ? T.accent : isT ? hexA(T.accent, 0.45) : T.border;
        const numClr = sel ? T.accentOn : isT ? T.accent : T.text;
        const dowClr = sel ? T.accentOn : isT ? T.accent : T.textDim;
        const dotClr = sel ? T.accentOn : T.accent;

        return (
          <button key={i} data-sel={sel ? '1' : '0'} onClick={() => setDate(d)} style={{
            flex: '0 0 auto', width: 46, padding: '8px 0 7px',
            background: bg, color: numClr,
            border: '1px solid ' + border,
            borderRadius: T.radius, cursor: 'pointer', textAlign: 'center',
            fontFamily: T.bodyFont,
            boxShadow: sel ? T.accentGlow : isT ? '0 0 12px ' + hexA(T.accent, 0.18) : 'none',
            transition: 'all .15s',
          }}>
            <div style={{ fontSize: 10, color: dowClr, fontWeight: 500, opacity: sel ? 1 : isT ? 1 : .55 }}>
              {isT && !sel ? 'today' : DOW[d.getDay()]}
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, marginTop: 1, letterSpacing: '-0.01em', color: numClr }}>
              {d.getDate()}
            </div>
            <div style={{ marginTop: 4, height: 4, display: 'flex', justifyContent: 'center' }}>
              {cnt > 0 && <span style={{ width: 4, height: 4, borderRadius: 999, background: dotClr, opacity: sel ? .9 : .85 }} />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
