import { T } from '../lib/theme';
import type { ClassRow, Studio } from '../types';
import { DOWFULL, MONTHS, sameDay } from '../utils/date';
import { ClassCard } from './ClassCard';
import { DayStrip } from './DayStrip';
import { Icon } from './Icon';
import { EmptyState, TopBar } from './Primitives';

interface CalendarTabProps {
  date: Date;
  setDate: (d: Date) => void;
  TODAY: Date;
  filtered: ClassRow[];
  studios: Studio[];
  dateCount: Record<string, number>;
  filterCount: number;
  onOpenFilter: () => void;
  onOpenPicker: () => void;
  onOpenClass: (c: ClassRow) => void;
}

export function CalendarTab({ date, setDate, TODAY, filtered, studios, dateCount, filterCount, onOpenFilter, onOpenPicker, onOpenClass }: CalendarTabProps) {
  const isToday = sameDay(date, TODAY);
  const dayLabel = isToday ? 'Today' : DOWFULL[date.getDay()];
  const dateLine = MONTHS[date.getMonth()] + ' ' + date.getDate();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar onFilter={onOpenFilter} filterCount={filterCount} studioCount={studios.length} />

      <button onClick={onOpenPicker} style={{
        background: 'transparent', border: 0, color: 'inherit',
        padding: '12px 18px 16px', textAlign: 'left', cursor: 'pointer',
      }}>
        <div style={{ fontSize: 12, color: T.textDim, fontFamily: T.bodyFont, letterSpacing: '.01em', marginBottom: 4 }}>
          {dayLabel} · {filtered.length} class{filtered.length === 1 ? '' : 'es'}
          {filterCount > 0 && <span style={{ color: T.accent }}> · {studios.length - filterCount} of {studios.length} studios</span>}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: T.headingFont, fontSize: 30, fontWeight: 600,
          letterSpacing: '-0.02em', lineHeight: 1.05,
        }}>
          <span>{dateLine}</span>
          <span style={{ color: T.accent, display: 'inline-flex' }}><Icon.chevD s={16} /></span>
        </div>
      </button>

      <DayStrip date={date} setDate={setDate} TODAY={TODAY} dateCount={dateCount} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 110px' }}>
        {filtered.length === 0 ? <EmptyState /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(c => (
              <ClassCard key={c.id} c={c} studios={studios} onClick={() => onOpenClass(c)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
