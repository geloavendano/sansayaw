import { useRef, type CSSProperties, type TouchEvent } from 'react';
import { T } from '../lib/theme';
import { DOW, isoOf, MONTHS, sameDay } from '../utils/date';
import { hexA } from '../utils/style';
import { Icon } from './Icon';
import { Sheet } from './Sheet';

function ibStyle(): CSSProperties {
  return {
    background: T.panel, border: '1px solid ' + T.border, color: T.text,
    width: 32, height: 32, borderRadius: T.pill,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

interface DatePickerProps {
  TODAY: Date;
  month: Date;
  setMonth: (d: Date) => void;
  selected: Date;
  dateCount: Record<string, number>;
  onPick: (d: Date) => void;
  onClose: () => void;
}

export function DatePicker({ TODAY, month, setMonth, selected, dateCount, onPick, onClose }: DatePickerProps) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = first.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <Sheet onClose={onClose} title={MONTHS[month.getMonth()] + ' ' + month.getFullYear()}>
      <div style={{ padding: '0 22px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={ibStyle()}>
          <Icon.chevL />
        </button>
        <button onClick={() => setMonth(new Date(TODAY))} style={{
          background: T.panel, border: '1px solid ' + T.border, color: T.text,
          padding: '6px 14px', borderRadius: T.pill,
          fontFamily: T.bodyFont, fontSize: 12, fontWeight: 500, cursor: 'pointer',
        }}>Today</button>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={ibStyle()}>
          <Icon.chevR />
        </button>
      </div>
      <div
        style={{ padding: '0 16px 18px' }}
        onTouchStart={(e: TouchEvent) => {
          swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e: TouchEvent) => {
          if (!swipeRef.current) return;
          const dx = e.changedTouches[0].clientX - swipeRef.current.x;
          const dy = e.changedTouches[0].clientY - swipeRef.current.y;
          swipeRef.current = null;
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
            if (dx < 0) setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
            else setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
          }
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6, textAlign: 'center' }}>
          {DOW.map(d => <div key={d} style={{ fontSize: 10.5, color: T.textMute, padding: '6px 0', fontWeight: 500 }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const cd = new Date(month.getFullYear(), month.getMonth(), d);
            const sel = sameDay(cd, selected);
            const isT = sameDay(cd, TODAY);
            const cnt = dateCount[isoOf(cd)] || 0;
            return (
              <button key={i} onClick={() => onPick(cd)} style={{
                aspectRatio: '1/1', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: sel ? T.accent : isT ? T.accentSoft : 'transparent',
                color: sel ? T.accentOn : isT ? T.accent : T.text,
                border: sel ? '1px solid ' + T.accent : isT ? '1px solid ' + hexA(T.accent, 0.4) : '1px solid transparent',
                borderRadius: T.pill, cursor: 'pointer', padding: 0,
                boxShadow: sel ? T.accentGlow : 'none',
              }}>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{d}</span>
                <div style={{ height: 4, marginTop: 2, display: 'flex', gap: 2 }}>
                  {cnt > 0 && Array.from({ length: Math.min(cnt, 3) }).map((_, j) => (
                    <span key={j} style={{ width: 3, height: 3, borderRadius: 999, background: sel ? T.accentOn : T.accent, opacity: .85 }} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
