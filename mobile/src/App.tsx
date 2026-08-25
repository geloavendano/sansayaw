import { SplashScreen } from '@capacitor/splash-screen';
import { useEffect, useMemo, useState } from 'react';
import { BgBlobs } from './components/BgBlobs';
import { BottomNav } from './components/BottomNav';
import { CalendarTab } from './components/CalendarTab';
import { ClassDetailSheet } from './components/ClassDetailSheet';
import { ContactTab } from './components/ContactTab';
import { DatePicker } from './components/DatePicker';
import { FilterSheet } from './components/FilterSheet';
import { SearchTab } from './components/SearchTab';
import { TAB_ORDER, type Tab } from './components/App.types';
import { useAppData } from './hooks/useAppData';
import { track } from './lib/analytics';
import { prefetchImages } from './lib/imageCache';
import { T } from './lib/theme';
import { loadFilter, saveFilter } from './lib/prefs';
import type { ClassRow, InstructorMap, Studio } from './types';
import { addDays, isoOf, todayLocal } from './utils/date';

export default function App() {
  const { data, loading, error } = useAppData();

  // capacitor.config.ts sets launchAutoHide: false so the splash covers the
  // initial data fetch instead of flashing "Loading schedule…" on a fast
  // connection — hide it once that first fetch settles (success or error).
  useEffect(() => {
    if (!loading) SplashScreen.hide();
  }, [loading]);

  if (loading || !data) {
    return <LoadingScreen />;
  }
  if (error) {
    return <ErrorScreen message={error} />;
  }
  return <DanceApp studios={data.studios} instrs={data.instrs} classes={data.classes} lastUpdated={data.lastUpdated} />;
}

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100svh', background: T.bg, color: T.textDim,
      fontFamily: T.bodyFont, fontSize: 13,
    }}>
      Loading schedule…
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100svh', background: T.bg, color: T.textDim,
      fontFamily: T.bodyFont, fontSize: 13, padding: 24, textAlign: 'center',
    }}>
      <div style={{ color: T.text, fontWeight: 600 }}>Couldn&apos;t load the schedule</div>
      <div>{message}</div>
    </div>
  );
}

interface DanceAppProps {
  studios: Studio[];
  instrs: InstructorMap;
  classes: ClassRow[];
  lastUpdated: string | null;
}

function DanceApp({ studios, instrs, classes, lastUpdated }: DanceAppProps) {
  const TODAY = useMemo(todayLocal, []);

  // Warm the on-device image cache right away for studio photos (small,
  // fixed set) and instructors teaching in the next week (the ones a user
  // is actually likely to tap into soon) — so by the time someone opens a
  // class detail sheet, the photo is usually already local instead of
  // waiting on the network. See lib/imageCache.ts.
  useEffect(() => {
    const studioUrls = studios.map(s => s.photo_url);
    const todayIso = isoOf(TODAY);
    const soonIso = isoOf(addDays(TODAY, 7));
    const nearInstructorIds = new Set(
      classes
        .filter(c => c.date >= todayIso && c.date <= soonIso && c.instructor_id != null)
        .map(c => c.instructor_id as number)
    );
    const instructorUrls = [...nearInstructorIds].map(id => instrs[id]?.photo_url);
    prefetchImages([...studioUrls, ...instructorUrls]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studios, classes, instrs]);

  const [tab, setTab] = useState<Tab>('calendar');
  const [slideDir, setSlideDir] = useState(1); // 1 = enter from right, -1 = enter from left

  const changeTab = (newTab: Tab) => {
    const oldIdx = TAB_ORDER.indexOf(tab);
    const newIdx = TAB_ORDER.indexOf(newTab);
    setSlideDir(newIdx >= oldIdx ? 1 : -1);
    setTab(newTab);
    track('tab_viewed', { tab: newTab });
  };

  const [date, setDate] = useState(TODAY);
  const allStudioIds = useMemo(() => new Set(studios.map(s => s.id)), [studios]);
  const [enabledStudios, setEnabledStudios] = useState<Set<string>>(() => new Set(studios.map(s => s.id)));

  useEffect(() => {
    loadFilter().then(saved => {
      if (saved && saved.length > 0) {
        setEnabledStudios(new Set(saved.filter(id => allStudioIds.has(id))));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    saveFilter([...enabledStudios]);
  }, [enabledStudios]);

  const [showFilter, setShowFilter] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date(TODAY));
  const [query, setQuery] = useState('');
  const [selClass, setSelClass] = useState<ClassRow | null>(null);

  const openClass = (c: ClassRow) => {
    track('class_viewed', { class_id: c.id, class_name: c.name, studio_id: c.studioId, instructor: c.instructor, from_tab: tab });
    setSelClass(c);
  };

  const dateCount = useMemo(() => {
    const c: Record<string, number> = {};
    classes.forEach(cl => { c[cl.date] = (c[cl.date] || 0) + 1; });
    return c;
  }, [classes]);

  const iso = isoOf(date);
  const classesForDate = useMemo(() =>
    classes.filter(c => c.date === iso).sort((a, b) => {
      const ta = a.parsedTime, tb = b.parsedTime;
      if (!ta || !tb) return 0;
      return (ta.hour * 60 + ta.minute) - (tb.hour * 60 + tb.minute);
    }),
    [classes, iso]
  );
  const filtered = useMemo(
    () => classesForDate.filter(c => enabledStudios.has(c.studioId)),
    [classesForDate, enabledStudios]
  );
  const filterCount = studios.length - enabledStudios.size;

  return (
    <div style={{
      display: 'flex', width: '100%', height: '100svh',
      background: T.bg, color: T.text, fontFamily: T.bodyFont,
      position: 'relative',
    }}>
      <BgBlobs />

      <div style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', minWidth: 0,
        zIndex: 1,
      }}>
        <div key={tab} style={{
          flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: `${slideDir > 0 ? 'slideInRight' : 'slideInLeft'} .22s cubic-bezier(.25,.46,.45,.94)`,
        }}>
          {tab === 'calendar' && (
            <CalendarTab
              date={date} setDate={setDate} TODAY={TODAY}
              filtered={filtered} studios={studios} dateCount={dateCount} filterCount={filterCount}
              onOpenFilter={() => setShowFilter(true)}
              onOpenPicker={() => { setPickerMonth(new Date(date)); setShowPicker(true); }}
              onOpenClass={openClass}
            />
          )}
          {tab === 'search' && (
            <SearchTab
              query={query} setQuery={setQuery}
              classes={classes} studios={studios}
              onOpenClass={openClass}
            />
          )}
          {tab === 'contact' && (
            <ContactTab lastUpdated={lastUpdated} studios={studios} />
          )}
        </div>

        <BottomNav tab={tab} changeTab={changeTab} />

        {showFilter && (
          <FilterSheet
            studios={studios}
            enabledStudios={enabledStudios}
            setEnabledStudios={setEnabledStudios}
            onClose={() => setShowFilter(false)}
          />
        )}
        {showPicker && (
          <DatePicker
            TODAY={TODAY} month={pickerMonth} setMonth={setPickerMonth}
            selected={date} dateCount={dateCount}
            onPick={d => { setDate(d); setShowPicker(false); }}
            onClose={() => setShowPicker(false)}
          />
        )}
        {selClass && (
          <ClassDetailSheet
            c={selClass}
            studio={studios.find(s => s.id === selClass.studioId)}
            instrInfo={instrs[selClass.instructor_id ?? ''] || instrs[selClass.instructor ?? '']}
            TODAY={TODAY}
            onClose={() => setSelClass(null)}
          />
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(36px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-36px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes blobDrift1 {
          0%,100% { transform: translate(0%,    0%)   scale(1);    }
          25%     { transform: translate(14%,   20%)  scale(1.14); }
          50%     { transform: translate(-10%,  12%)  scale(0.92); }
          75%     { transform: translate(20%,   -10%) scale(1.08); }
        }
        @keyframes blobDrift2 {
          0%,100% { transform: translate(0%,    0%)   scale(1);    }
          33%     { transform: translate(-16%,  -12%) scale(1.14); }
          66%     { transform: translate(10%,   22%)  scale(0.90); }
        }
        @keyframes blobDrift3 {
          0%,100% { transform: translate(0%,    0%)   scale(1);    }
          40%     { transform: translate(-20%,  16%)  scale(1.18); }
          70%     { transform: translate(18%,   -18%) scale(0.88); }
        }
        @keyframes blobDrift4 {
          0%,100% { transform: translate(0%,    0%)   scale(1);    }
          30%     { transform: translate(-14%,  -16%) scale(1.10); }
          60%     { transform: translate(16%,   12%)  scale(0.93); }
        }
      `}</style>
    </div>
  );
}
