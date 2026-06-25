'use client';

import { useState, useMemo, useEffect, useRef } from 'react';

const INSTAPAY_QR_URL = '/instapay-qr.jpg';

// ── THEME (Neon City) ────────────────────────────────────────
const T = {
  bg:           '#0a1820',
  bgSoft:       '#0e2030',
  panel:        'rgba(255,255,255,0.035)',
  panelSolid:   '#112430',
  border:       'rgba(190,235,245,0.08)',
  borderStrong: 'rgba(190,235,245,0.18)',
  text:         '#eaf6f7',
  textDim:      'rgba(234,246,247,0.62)',
  textMute:     'rgba(234,246,247,0.38)',
  accent:       '#3ee0d8',
  accentOn:     '#062028',
  accentSoft:   'rgba(62,224,216,0.12)',
  accentGlow:   '0 0 24px rgba(62,224,216,0.35)',
  secondary:    '#ff6da3',
  tertiary:     '#f5b15c',
  headingFont:  "var(--font-geist-sans), 'Helvetica Neue', sans-serif",
  bodyFont:     "var(--font-geist-sans), 'Helvetica Neue', sans-serif",
  monoFont:     "var(--font-geist-mono), ui-monospace, monospace",
  radius:       10,
  pill:         999,
};

// ── TAB ORDER (used for swipe direction) ─────────────────────
const TAB_ORDER = ['calendar', 'search', 'contact'];

// ── DATE HELPERS ─────────────────────────────────────────────
const MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW     = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DOWFULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function pad(n) { return n < 10 ? '0' + n : '' + n; }
function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function sameDay(a, b) { return isoOf(a) === isoOf(b); }
function todayLocal() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); }

function formatLastUpdated(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  const dateStr = MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h < 12 ? 'AM' : 'PM';
  return dateStr + ' · ' + (h%12||12) + ':' + pad(m) + ' ' + ampm;
}

// ── STUDIO HELPERS ───────────────────────────────────────────
function studioColor(id) {
  if (!id) return T.textDim;
  if (id.startsWith('zero'))  return T.accent;
  if (id === 'playground')    return T.secondary;
  if (id === 'nudefloor')     return T.tertiary;
  if (id.startsWith('808'))   return '#b39dff'; // 808 Studio — lavender
  return T.textDim;
}
function studioLoc(s) {
  if (!s) return '';
  if (s.branch) return s.branch;
  const map = { playground: 'San Juan, Metro Manila', nudefloor: 'Manila' };
  return map[s.id] || '';
}
function studioName(s) {
  if (!s) return '';
  return s.branch ? `${s.name} · ${s.branch}` : s.name;
}

// ── UTILS ────────────────────────────────────────────────────
function hexA(hex, a) {
  const m = hex.replace('#','');
  return `rgba(${parseInt(m.slice(0,2),16)},${parseInt(m.slice(2,4),16)},${parseInt(m.slice(4,6),16)},${a})`;
}
function initials(name) {
  return (name||'').split(/[\s·\-]+/).map(w=>w[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
}
function placeholderGrad(seed, kind='studio') {
  const h = [...(seed||'')].reduce((a,c)=>a+c.charCodeAt(0),0);
  const tilt = (h%60)-30;
  const cols = kind==='studio'
    ? [hexA(T.accent,0.18), hexA(T.secondary,0.18), hexA(T.tertiary,0.12)]
    : [hexA(T.accent,0.32), hexA(T.secondary,0.22)];
  return `linear-gradient(${135+tilt}deg, ${cols.join(', ')}), ${T.panelSolid}`;
}

// ── HOOKS ────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(null);
  useEffect(() => {
    setW(window.innerWidth);
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

// Tracks how far the keyboard has pushed up from the bottom
// so the floating nav can stay visible above it.
function useKeyboardOffset() {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.offsetTop - vv.height);
      setOffset(kb);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return offset;
}

// ── ICONS ────────────────────────────────────────────────────
const Icon = {
  cal:      p => <svg viewBox="0 0 24 24" width={p.s||20} height={p.s||20} fill="none" stroke="currentColor" strokeWidth={p.w||1.6} strokeLinecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3.5v3.5M16 3.5v3.5"/></svg>,
  download: p => <svg viewBox="0 0 24 24" width={p.s||16} height={p.s||16} fill="none" stroke="currentColor" strokeWidth={p.w||1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v13M7 12l5 5 5-5M4 19h16"/></svg>,
  search: p => <svg viewBox="0 0 24 24" width={p.s||20} height={p.s||20} fill="none" stroke="currentColor" strokeWidth={p.w||1.6} strokeLinecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m19.5 19.5-3.8-3.8"/></svg>,
  info:   p => <svg viewBox="0 0 24 24" width={p.s||20} height={p.s||20} fill="none" stroke="currentColor" strokeWidth={p.w||1.6} strokeLinecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/></svg>,
  filter: p => <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill="none" stroke="currentColor" strokeWidth={p.w||1.6} strokeLinecap="round"><path d="M5 7h14M8 12h8M11 17h2"/></svg>,
  chevL:  p => <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill="none" stroke="currentColor" strokeWidth={p.w||1.8} strokeLinecap="round"><path d="m14.5 6-6 6 6 6"/></svg>,
  chevR:  p => <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill="none" stroke="currentColor" strokeWidth={p.w||1.8} strokeLinecap="round"><path d="m9.5 6 6 6-6 6"/></svg>,
  chevD:  p => <svg viewBox="0 0 24 24" width={p.s||14} height={p.s||14} fill="none" stroke="currentColor" strokeWidth={p.w||1.8} strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>,
  x:      p => <svg viewBox="0 0 24 24" width={p.s||18} height={p.s||18} fill="none" stroke="currentColor" strokeWidth={p.w||1.6} strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>,
  check:  p => <svg viewBox="0 0 24 24" width={p.s||14} height={p.s||14} fill="none" stroke="currentColor" strokeWidth={p.w||2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-11"/></svg>,
  mail:   p => <svg viewBox="0 0 24 24" width={p.s||16} height={p.s||16} fill="none" stroke="currentColor" strokeWidth={p.w||1.6} strokeLinecap="round"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4 8 8 6 8-6"/></svg>,
  send:   p => <svg viewBox="0 0 24 24" width={p.s||16} height={p.s||16} fill="none" stroke="currentColor" strokeWidth={p.w||1.6} strokeLinecap="round" strokeLinejoin="round"><path d="m4 12 16-7-6 17-3-7-7-3z"/></svg>,
  globe:  p => <svg viewBox="0 0 24 24" width={p.s||16} height={p.s||16} fill="none" stroke="currentColor" strokeWidth={p.w||1.6} strokeLinecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 3 2.5 14 0 17M12 3.5c-2.5 3-2.5 14 0 17"/></svg>,
  ext:    p => <svg viewBox="0 0 24 24" width={p.s||14} height={p.s||14} fill="none" stroke="currentColor" strokeWidth={p.w||1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M14 5h5v5M19 5l-9 9M11 6H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-4"/></svg>,
  pin:    p => <svg viewBox="0 0 24 24" width={p.s||14} height={p.s||14} fill="none" stroke="currentColor" strokeWidth={p.w||1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>,
  clock:  p => <svg viewBox="0 0 24 24" width={p.s||14} height={p.s||14} fill="none" stroke="currentColor" strokeWidth={p.w||1.7} strokeLinecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>,
  calSm:  p => <svg viewBox="0 0 24 24" width={p.s||14} height={p.s||14} fill="none" stroke="currentColor" strokeWidth={p.w||1.7} strokeLinecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3.5v3.5M16 3.5v3.5"/></svg>,
};

// ─────────────────────────────────────────────────────────────
// ANIMATED BACKGROUND BLOBS
// ─────────────────────────────────────────────────────────────
function BgBlobs() {
  return (
    <div aria-hidden="true" style={{
      position: 'fixed', inset: 0, zIndex: 0,
      overflow: 'hidden', pointerEvents: 'none',
    }}>
      {/* Accent cyan — top right */}
      <div style={{
        position: 'absolute', borderRadius: '50%',
        width: 600, height: 600,
        top: '-15%', right: '-10%',
        background: hexA(T.accent, 0.15),
        filter: 'blur(80px)',
        animation: 'blobDrift1 13s ease-in-out infinite',
      }}/>
      {/* Pink — bottom left */}
      <div style={{
        position: 'absolute', borderRadius: '50%',
        width: 500, height: 500,
        bottom: '-10%', left: '-12%',
        background: hexA(T.secondary, 0.13),
        filter: 'blur(70px)',
        animation: 'blobDrift2 17s ease-in-out infinite',
      }}/>
      {/* Amber — center */}
      <div style={{
        position: 'absolute', borderRadius: '50%',
        width: 320, height: 320,
        top: '40%', left: '35%',
        background: hexA(T.tertiary, 0.10),
        filter: 'blur(60px)',
        animation: 'blobDrift3 11s ease-in-out infinite',
      }}/>
      {/* Second accent — bottom right */}
      <div style={{
        position: 'absolute', borderRadius: '50%',
        width: 400, height: 400,
        bottom: '5%', right: '5%',
        background: hexA(T.accent, 0.11),
        filter: 'blur(65px)',
        animation: 'blobDrift4 15s ease-in-out infinite',
      }}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DANCE APP
// ─────────────────────────────────────────────────────────────
export default function DanceApp({ studios, instrs, classes, lastUpdated }) {
  const TODAY     = useMemo(todayLocal, []);
  const w         = useWindowWidth();
  const isDesktop = w !== null && w >= 768;

  const [tab,      setTab]      = useState('calendar');
  const [slideDir, setSlideDir] = useState(1); // 1 = enter from right, -1 = enter from left

  // Direction-aware tab change
  const changeTab = (newTab) => {
    const oldIdx = TAB_ORDER.indexOf(tab);
    const newIdx = TAB_ORDER.indexOf(newTab);
    setSlideDir(newIdx >= oldIdx ? 1 : -1);
    setTab(newTab);
  };

  const [date, setDate]                       = useState(TODAY);
  const allStudioIds = useMemo(() => new Set(studios.map(s => s.id)), [studios]);
  const [enabledStudios, setEnabledStudios]   = useState(() => new Set(studios.map(s => s.id)));

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sansayaw-filter') || 'null');
      if (Array.isArray(saved) && saved.length > 0) {
        setEnabledStudios(new Set(saved.filter(id => allStudioIds.has(id))));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('sansayaw-filter', JSON.stringify([...enabledStudios])); } catch {}
  }, [enabledStudios]);

  const [showFilter, setShowFilter]           = useState(false);
  const [showPicker, setShowPicker]           = useState(false);
  const [pickerMonth, setPickerMonth]         = useState(new Date(TODAY));
  const [query, setQuery]                     = useState('');
  const [selClass, setSelClass]               = useState(null);

  const dateCount = useMemo(() => {
    const c = {};
    classes.forEach(cl => { c[cl.date] = (c[cl.date]||0)+1; });
    return c;
  }, [classes]);

  useEffect(() => {
    const h = e => {
      if (e.key !== 'Escape') return;
      if (selClass)        setSelClass(null);
      else if (showPicker) setShowPicker(false);
      else if (showFilter) setShowFilter(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selClass, showPicker, showFilter]);

  const iso = isoOf(date);
  const classesForDate = useMemo(() =>
    classes.filter(c => c.date === iso).sort((a, b) => {
      const ta = a.parsedTime, tb = b.parsedTime;
      if (!ta || !tb) return 0;
      return (ta.hour*60+ta.minute) - (tb.hour*60+tb.minute);
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

      {/* Desktop sidebar */}
      {isDesktop && (
        <DesktopSidebar tab={tab} changeTab={changeTab} lastUpdated={lastUpdated} />
      )}

      {/* Content column */}
      <div style={{
        flex: 1, position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', minWidth: 0,
        zIndex: 1,
      }}>

        {/* Animated tab content — key changes on tab switch, triggering remount + animation */}
        <div key={tab} style={{
          flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: `${slideDir > 0 ? 'slideInRight' : 'slideInLeft'} .22s cubic-bezier(.25,.46,.45,.94)`,
        }}>
          {tab === 'calendar' && (
            <CalendarTab
              isDesktop={isDesktop}
              date={date} setDate={setDate} TODAY={TODAY}
              filtered={filtered} totalToday={classesForDate.length}
              studios={studios} dateCount={dateCount} filterCount={filterCount}
              onOpenFilter={() => setShowFilter(true)}
              onOpenPicker={() => { setPickerMonth(new Date(date)); setShowPicker(true); }}
              onOpenClass={setSelClass}
            />
          )}
          {tab === 'search' && (
            <SearchTab
              isDesktop={isDesktop}
              query={query} setQuery={setQuery}
              classes={classes} studios={studios}
              onOpenClass={setSelClass}
            />
          )}
          {tab === 'contact' && (
            <ContactTab isDesktop={isDesktop} lastUpdated={lastUpdated} />
          )}
        </div>

        {/* Mobile bottom nav */}
        {!isDesktop && <BottomNav tab={tab} changeTab={changeTab} />}

        {/* Sheets */}
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
            instrInfo={instrs[selClass.instructor]}
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
        @keyframes snsIn {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
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

// ─────────────────────────────────────────────────────────────
// DESKTOP SIDEBAR — editorial / brochure style
// ─────────────────────────────────────────────────────────────
function DesktopSidebar({ tab, changeTab, lastUpdated }) {
  const items = [
    { id: 'calendar', label: 'Calendar', sub: 'Browse by date',  I: Icon.cal    },
    { id: 'search',   label: 'Search',   sub: 'Find a class',    I: Icon.search },
    { id: 'contact',  label: 'About',    sub: 'Info & support',  I: Icon.info   },
  ];
  return (
    <div style={{
      width: 'min(46%, 420px)', flex: '0 0 min(46%, 420px)',
      display: 'flex', flexDirection: 'column',
      padding: '44px 32px 36px',
      borderRight: '1px solid ' + T.border,
      background: hexA(T.bgSoft, 0.6),
      position: 'relative', zIndex: 1,
    }}>
      {/* Wordmark */}
      <div>
        <h1 style={{
          margin: 0,
          fontFamily: T.headingFont, fontSize: 38, fontWeight: 700,
          letterSpacing: '-0.03em', lineHeight: 1, color: T.text,
        }}>
          sa<span style={{
            color: T.accent, textShadow: '0 0 20px ' + T.accent,
          }}>'</span>nsayaw
        </h1>
        <p style={{
          margin: '8px 0 0',
          fontFamily: T.monoFont, fontSize: 11, fontWeight: 500,
          color: T.textMute, letterSpacing: '.12em', textTransform: 'uppercase',
        }}>
          MNL Dance Classes
        </p>
        {/* Accent rule */}
        <div style={{
          marginTop: 20,
          width: 40, height: 2,
          background: `linear-gradient(90deg, ${T.accent}, ${T.secondary})`,
          borderRadius: 2,
        }}/>
      </div>

      {/* Nav */}
      <nav style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map(it => {
          const active = tab === it.id;
          return (
            <button key={it.id} onClick={() => changeTab(it.id)} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '14px 18px', borderRadius: T.radius + 2,
              background: active ? T.accentSoft : 'transparent',
              border: '1px solid ' + (active ? hexA(T.accent, 0.3) : 'transparent'),
              color: active ? T.accent : T.textDim,
              fontFamily: T.bodyFont, cursor: 'pointer', textAlign: 'left',
              transition: 'all .15s',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: T.radius,
                background: active ? hexA(T.accent, 0.15) : T.panel,
                border: '1px solid ' + (active ? hexA(T.accent, 0.25) : T.border),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flex: '0 0 auto', transition: 'all .15s',
                color: active ? T.accent : T.textDim,
              }}>
                <it.I s={20} w={active ? 2 : 1.6} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: active ? 700 : 500, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
                  {it.label}
                </div>
                <div style={{ fontSize: 11.5, color: active ? hexA(T.accent, 0.7) : T.textMute, marginTop: 2 }}>
                  {it.sub}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Last updated */}
      {lastUpdated && (
        <div style={{
          padding: '14px 16px', borderRadius: T.radius,
          background: T.panel, border: '1px solid ' + T.border,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 10, color: T.textMute, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 5 }}>
            Last updated
          </div>
          <div style={{ fontSize: 12, color: T.textDim, fontFamily: T.monoFont, lineHeight: 1.5 }}>
            {formatLastUpdated(lastUpdated)}
          </div>
        </div>
      )}

      <div style={{ fontSize: 10.5, color: T.textMute, letterSpacing: '.03em' }}>
        sa'nsayaw · made in Manila
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CALENDAR TAB
// ─────────────────────────────────────────────────────────────
function CalendarTab({ isDesktop, date, setDate, TODAY, filtered, totalToday, studios, dateCount, filterCount, onOpenFilter, onOpenPicker, onOpenClass }) {
  const isToday  = sameDay(date, TODAY);
  const dayLabel = isToday ? 'Today' : DOWFULL[date.getDay()];
  const dateLine = MONTHS[date.getMonth()] + ' ' + date.getDate();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar showWordmark={!isDesktop} onFilter={onOpenFilter} filterCount={filterCount} studioCount={studios.length} />

      <button onClick={onOpenPicker} style={{
        background: 'transparent', border: 0, color: 'inherit',
        padding: '12px 18px 16px', textAlign: 'left', cursor: 'pointer',
      }}>
        <div style={{ fontSize: 12, color: T.textDim, fontFamily: T.bodyFont, letterSpacing: '.01em', marginBottom: 4 }}>
          {dayLabel} · {filtered.length} class{filtered.length===1?'':'es'}
          {filterCount > 0 && <span style={{ color: T.accent }}> · {studios.length-filterCount} of {studios.length} studios</span>}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          fontFamily: T.headingFont, fontSize: 30, fontWeight: 600,
          letterSpacing: '-0.02em', lineHeight: 1.05,
        }}>
          <span>{dateLine}</span>
          <span style={{ color: T.accent, display: 'inline-flex' }}><Icon.chevD s={16}/></span>
        </div>
      </button>

      <DayStrip date={date} setDate={setDate} TODAY={TODAY} dateCount={dateCount} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 110px' }}>
        <h2 style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
          {dayLabel} dance classes in Metro Manila
        </h2>
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

function TopBar({ showWordmark = true, onFilter, filterCount, studioCount }) {
  return (
    <div style={{ padding: '16px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
      {showWordmark ? <Wordmark /> : <div />}
      {onFilter && (
        <button onClick={onFilter} style={{
          background: filterCount > 0 ? T.accentSoft : 'transparent',
          color: filterCount > 0 ? T.accent : T.text,
          border: '1px solid ' + (filterCount > 0 ? hexA(T.accent, 0.4) : T.borderStrong),
          borderRadius: T.pill, padding: '7px 12px',
          fontFamily: T.bodyFont, fontSize: 12, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}>
          <Icon.filter s={14}/>
          <span>Filter{filterCount > 0 ? ' · ' + (studioCount - filterCount) : ''}</span>
        </button>
      )}
    </div>
  );
}

function Wordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
      <span style={{ fontFamily: T.headingFont, fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', color: T.text, lineHeight: 1 }}>
        sa<span style={{ color: T.accent, fontWeight: 700, margin: '0 -1px', textShadow: '0 0 12px ' + T.accent }}>'</span>nsayaw
      </span>
      <span style={{ fontFamily: T.bodyFont, fontSize: 10.5, fontWeight: 500, color: T.textDim, letterSpacing: '.02em' }}>mnl</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DAY STRIP
// ─────────────────────────────────────────────────────────────
function DayStrip({ date, setDate, TODAY, dateCount }) {
  const start = addDays(TODAY, -3);
  const days  = Array.from({ length: 21 }, (_, i) => addDays(start, i));
  const ref   = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sel = el.querySelector("[data-sel='1']");
    if (sel) {
      const r = sel.getBoundingClientRect(), er = el.getBoundingClientRect();
      el.scrollLeft += r.left - er.left - er.width/2 + r.width/2;
    }
  }, [date]);

  return (
    <div ref={ref} style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 16px 14px', scrollbarWidth: 'none' }}>
      {days.map((d, i) => {
        const sel  = sameDay(d, date);
        const isT  = sameDay(d, TODAY);
        const cnt  = dateCount[isoOf(d)] || 0;

        const bg     = sel ? T.accent     : isT ? T.accentSoft : T.panel;
        const border = sel ? T.accent     : isT ? hexA(T.accent, 0.45) : T.border;
        const numClr = sel ? T.accentOn   : isT ? T.accent : T.text;
        const dowClr = sel ? T.accentOn   : isT ? T.accent : T.textDim;
        const dotClr = sel ? T.accentOn   : T.accent;

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
              {cnt > 0 && <span style={{ width: 4, height: 4, borderRadius: 999, background: dotClr, opacity: sel ? .9 : .85 }}/>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CLASS CARD
// ─────────────────────────────────────────────────────────────
function ClassCard({ c, studios, onClick }) {
  const studio  = studios.find(s => s.id === c.studioId);
  const sHue    = studioColor(c.studioId);
  const pt      = c.parsedTime;
  const timeStr = pt ? (pt.hour%12===0?12:pt.hour%12)+':'+pad(pt.minute) : '—';
  const apStr   = pt ? (pt.hour<12?'am':'pm') : '';

  const clickProps = onClick ? {
    onClick, role: 'button', tabIndex: 0,
    onKeyDown: e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); onClick(); } },
  } : {};

  return (
    <article {...clickProps} style={{
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
            <span style={{ width: 6, height: 6, borderRadius: 999, background: sHue, flex: '0 0 auto' }}/>
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

function Pill({ children, subtle }) {
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: T.bodyFont, fontSize: 11, fontWeight: 500,
      padding: '3px 9px', borderRadius: T.pill,
      border: '1px solid ' + T.border,
      color: subtle ? T.textDim : T.text,
      background: subtle ? 'transparent' : T.bgSoft,
      whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: T.textDim, fontSize: 13 }}>
      <div style={{ fontFamily: T.headingFont, fontSize: 16, color: T.text, marginBottom: 6 }}>No classes match</div>
      Try adjusting filters or picking another date.
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FILTER SHEET
// ─────────────────────────────────────────────────────────────
function FilterSheet({ studios, enabledStudios, setEnabledStudios, onClose }) {
  const toggle = id => {
    const next = new Set(enabledStudios);
    next.has(id) ? next.delete(id) : next.add(id);
    setEnabledStudios(next);
  };
  const allOn = enabledStudios.size === studios.length;

  return (
    <Sheet onClose={onClose} title="Studios">
      <div style={{ fontSize: 12.5, color: T.textDim, padding: '0 22px 14px' }}>Show classes from</div>
      <div style={{ padding: '0 16px' }}>
        {studios.map((s, i) => {
          const on = enabledStudios.has(s.id);
          return (
            <button key={s.id} onClick={() => toggle(s.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 12px', background: 'transparent',
              border: 0, borderBottom: i === studios.length-1 ? 'none' : '1px solid ' + T.border,
              cursor: 'pointer', color: T.text, textAlign: 'left', fontFamily: T.bodyFont,
            }}>
              <Checkbox on={on} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: studioColor(s.id) }}/>
                  <span style={{ fontSize: 15, fontWeight: 500, fontFamily: T.headingFont }}>{studioName(s)}</span>
                </div>
                <div style={{ fontSize: 12, color: T.textDim, marginTop: 3, marginLeft: 15 }}>{studioLoc(s)}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '16px 20px 4px' }}>
        <button onClick={() => setEnabledStudios(new Set(allOn ? [] : studios.map(s => s.id)))} style={{
          flex: 1, padding: '12px 0', background: 'transparent',
          border: '1px solid ' + T.borderStrong, borderRadius: T.pill,
          color: T.text, fontFamily: T.bodyFont, fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>{allOn ? 'Clear all' : 'Select all'}</button>
        <button onClick={onClose} style={{
          flex: 1.4, padding: '12px 0', background: T.accent, color: T.accentOn,
          border: '1px solid ' + T.accent, borderRadius: T.pill,
          fontFamily: T.bodyFont, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          boxShadow: T.accentGlow,
        }}>Apply</button>
      </div>
    </Sheet>
  );
}

function Checkbox({ on }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: 6,
      border: '1.5px solid ' + (on ? T.accent : T.borderStrong),
      background: on ? T.accent : 'transparent', color: T.accentOn,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flex: '0 0 auto', transition: 'all .15s',
    }}>
      {on && <Icon.check s={14}/>}
    </div>
  );
}

function Sheet({ onClose, title, children }) {
  const [dragY, setDragY] = useState(0);
  const startRef = useRef(null);
  const panelRef = useRef(null);

  const handleTouchStart = e => {
    startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchMove = e => {
    if (!startRef.current) return;
    const panel = panelRef.current;
    if (panel && panel.scrollTop > 0) return;
    const dx = e.touches[0].clientX - startRef.current.x;
    const dy = e.touches[0].clientY - startRef.current.y;
    if (dy > 0 && dy > Math.abs(dx)) setDragY(dy);
  };
  const handleTouchEnd = () => {
    if (dragY > 80) { onClose(); } else { setDragY(0); }
    startRef.current = null;
  };

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}/>
      <div
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'relative', background: T.bgSoft,
          borderTop: '1px solid ' + T.borderStrong,
          borderTopLeftRadius: 22, borderTopRightRadius: 22,
          paddingBottom: 22, maxHeight: '82%', overflowY: 'auto',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
          transform: `translateY(${dragY}px)`,
          transition: dragY === 0 ? 'transform .3s cubic-bezier(.2,.7,.3,1)' : 'none',
          willChange: 'transform',
        }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.borderStrong }}/>
        </div>
        <div style={{ padding: '10px 22px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: T.headingFont, fontSize: 17, fontWeight: 600, color: T.text, letterSpacing: '-0.01em' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, color: T.textDim, cursor: 'pointer', padding: 4 }}>
            <Icon.x/>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DATE PICKER
// ─────────────────────────────────────────────────────────────
function DatePicker({ TODAY, month, setMonth, selected, dateCount, onPick, onClose }) {
  const first       = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset      = first.getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const swipeRef = useRef(null);

  return (
    <Sheet onClose={onClose} title={MONTHS[month.getMonth()] + ' ' + month.getFullYear()}>
      <div style={{ padding: '0 22px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1))} style={ibStyle()}>
          <Icon.chevL/>
        </button>
        <button onClick={() => setMonth(new Date(TODAY))} style={{
          background: T.panel, border: '1px solid ' + T.border, color: T.text,
          padding: '6px 14px', borderRadius: T.pill,
          fontFamily: T.bodyFont, fontSize: 12, fontWeight: 500, cursor: 'pointer',
        }}>Today</button>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1))} style={ibStyle()}>
          <Icon.chevR/>
        </button>
      </div>
      <div
        style={{ padding: '0 16px 18px' }}
        onTouchStart={e => {
          swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={e => {
          if (!swipeRef.current) return;
          const dx = e.changedTouches[0].clientX - swipeRef.current.x;
          const dy = e.changedTouches[0].clientY - swipeRef.current.y;
          swipeRef.current = null;
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
            if (dx < 0) setMonth(new Date(month.getFullYear(), month.getMonth()+1, 1));
            else        setMonth(new Date(month.getFullYear(), month.getMonth()-1, 1));
          }
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6, textAlign: 'center' }}>
          {DOW.map(d => <div key={d} style={{ fontSize: 10.5, color: T.textMute, padding: '6px 0', fontWeight: 500 }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((d, i) => {
            if (d === null) return <div key={i}/>;
            const cd  = new Date(month.getFullYear(), month.getMonth(), d);
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
                    <span key={j} style={{ width: 3, height: 3, borderRadius: 999, background: sel ? T.accentOn : T.accent, opacity: .85 }}/>
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

function ibStyle() {
  return {
    background: T.panel, border: '1px solid ' + T.border, color: T.text,
    width: 32, height: 32, borderRadius: T.pill,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

// ─────────────────────────────────────────────────────────────
// SEARCH TAB
// ─────────────────────────────────────────────────────────────
function SearchTab({ isDesktop, query, setQuery, classes, studios, onOpenClass }) {
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return [];
    return classes.filter(c => {
      const s = studios.find(x => x.id === c.studioId);
      return c.name.toLowerCase().includes(q)
          || (c.instructor || '').toLowerCase().includes(q)
          || (s && s.name.toLowerCase().includes(q))
          || (c.genre || '').toLowerCase().includes(q);
    }).slice(0, 30);
  }, [q, classes, studios]);

  const studioCounts = useMemo(() => {
    const ct = {};
    classes.forEach(c => { ct[c.studioId] = (ct[c.studioId]||0)+1; });
    return ct;
  }, [classes]);

  const suggestions = ['Hip-Hop','K-Pop','Heels','Zero Studio','Playground','Nude Floor'];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar showWordmark={!isDesktop} />
      <div style={{ padding: '8px 18px 14px' }}>
        <div style={{ fontFamily: T.headingFont, fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 12 }}>
          Search
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: T.panel, border: '1px solid ' + T.border,
          borderRadius: T.pill, padding: '11px 14px',
        }}>
          <span style={{ color: T.accent, display: 'inline-flex' }}><Icon.search s={16}/></span>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Class, instructor, or studio"
            style={{
              flex: 1, background: 'transparent', border: 0, outline: 0,
              color: T.text, fontFamily: T.bodyFont,
              fontSize: 16, // 16px prevents iOS auto-zoom on focus
              caretColor: T.accent,
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ background: 'transparent', border: 0, color: T.textDim, cursor: 'pointer', padding: 0, display: 'flex' }}>
              <Icon.x s={16}/>
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 110px' }}>
        {!q ? (
          <>
            <SectionLabel>Try searching for</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 22 }}>
              {suggestions.map(s => (
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
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: studioColor(s.id) }}/>
                    <div>
                      <div style={{ fontFamily: T.headingFont, fontSize: 15, fontWeight: 600 }}>{studioName(s)}</div>
                      <div style={{ fontSize: 12, color: T.textDim, marginTop: 2 }}>{studioLoc(s)}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: T.textDim }}>{studioCounts[s.id]||0} classes</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <SectionLabel>{results.length} result{results.length===1?'':'s'}</SectionLabel>
            {results.length === 0 && (
              <div style={{ padding: '40px 0', color: T.textDim, textAlign: 'center', fontSize: 13 }}>
                Nothing matches &ldquo;{query}&rdquo; yet.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {results.map(r => {
                const s    = studios.find(x => x.id === r.studioId);
                const sHue = studioColor(r.studioId);
                const [y,mo,da] = r.date.split('-').map(Number);
                const d  = new Date(y, mo-1, da);
                const pt = r.parsedTime;
                const td = pt ? (pt.hour%12===0?12:pt.hour%12)+':'+pad(pt.minute)+(pt.hour<12?'am':'pm') : r.time_range||'';
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
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: sHue, flex: '0 0 auto' }}/>
                      <span>{r.instructor} · <span style={{ color: T.text }}>{s ? s.name : r.studioId}</span></span>
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

function SectionLabel({ children }) {
  return <div style={{ fontSize: 11.5, color: T.textDim, margin: '0 4px 10px', fontWeight: 500 }}>{children}</div>;
}

// ─────────────────────────────────────────────────────────────
// ABOUT / CONTACT TAB
// ─────────────────────────────────────────────────────────────
function ContactTab({ isDesktop, lastUpdated }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar showWordmark={!isDesktop} />
      <div style={{ flex: 1, overflowY: 'auto' }}>

        <div style={{ padding: '10px 18px 26px' }}>
          <div style={{ fontSize: 12, color: T.accent, marginBottom: 10, fontWeight: 500 }}>About sa&apos;nsayaw</div>
          <div style={{ fontFamily: T.headingFont, fontSize: 26, fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.02em' }}>
            One place to find every open dance class in Metro Manila.
          </div>
          <div style={{ marginTop: 14, fontSize: 14, lineHeight: 1.6, color: T.textDim }}>
            We pull schedules from Zero Studio, The Playground Studios, and Nude Floor so
            you stop juggling six Instagram tabs at 11pm trying to find a 7am class.
          </div>
          <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.6, color: T.textMute }}>
            This is a volunteer, community-driven project. All information is sourced from publicly available studio pages.
          </div>
        </div>

        <div style={{ padding: '22px 18px', borderTop: '1px solid ' + T.border }}>
          <SectionLabel>Support the floor</SectionLabel>
          <div style={{ fontFamily: T.headingFont, fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 10 }}>
            Keep the schedule live
          </div>
          <div style={{ fontSize: 13.5, color: T.textDim, lineHeight: 1.6, marginBottom: 22 }}>
            This project runs on weekend hours and one hosting bill. If it saves you time,
            tip any amount via InstaPay — every peso goes back into keeping it running.
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            {INSTAPAY_QR_URL ? (
              <img
                src={INSTAPAY_QR_URL}
                alt="InstaPay QR Code"
                style={{ width: 200, height: 'auto', borderRadius: T.radius, border: '1px solid ' + T.border, display: 'block' }}
              />
            ) : (
              <div style={{
                width: 200, height: 200, borderRadius: T.radius,
                border: '1px dashed ' + T.borderStrong, background: T.panel,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                <div style={{ fontFamily: T.monoFont, fontSize: 10.5, color: T.textMute }}>INSTAPAY QR — coming soon</div>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center', fontSize: 12.5, color: T.textDim }}>
            Any amount · Scan with your bank or e-wallet app
          </div>
        </div>

        <div style={{ padding: '22px 18px', borderTop: '1px solid ' + T.border }}>
          <SectionLabel>Get in touch</SectionLabel>
          <div style={{ fontFamily: T.headingFont, fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 10 }}>
            Say hi
          </div>
          <div style={{ fontSize: 13.5, color: T.textDim, lineHeight: 1.55, marginBottom: 14 }}>
            Got a class we&apos;re missing? Bug to report? Find us on Instagram.
          </div>
          <ContactRow icon={<span style={{ fontFamily: T.headingFont, fontSize: 14 }}>@</span>} label="instagram · @sansayaw.mnl" />
        </div>

        <div style={{ padding: '22px 18px 110px', borderTop: '1px solid ' + T.border }}>
          <SectionLabel>Behind the project</SectionLabel>
          <div style={{ fontSize: 13.5, color: T.textDim, lineHeight: 1.65 }}>
            Made in 2026 by a small crew of Metro Manila dancers who kept missing classes
            because schedules lived in stories that disappeared in 24 hours. Not affiliated
            with any studio. Always double-check class details with the studio before going.
          </div>

          {lastUpdated && (
            <div style={{
              marginTop: 18, padding: '10px 14px', borderRadius: T.radius,
              background: T.panel, border: '1px solid ' + T.border,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Icon.clock s={13}/>
              <div>
                <div style={{ fontSize: 10.5, color: T.textMute, fontWeight: 500, letterSpacing: '.05em', textTransform: 'uppercase' }}>
                  Schedule last updated
                </div>
                <div style={{ fontSize: 12, color: T.textDim, fontFamily: T.monoFont, marginTop: 2 }}>
                  {formatLastUpdated(lastUpdated)}
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: 11, color: T.textMute }}>
            sa&apos;nsayaw · made in Manila · {new Date().getFullYear()}
          </div>
        </div>

      </div>
    </div>
  );
}

function ContactRow({ icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '1px solid ' + T.border, color: T.text }}>
      <span style={{ color: T.accent, display: 'inline-flex', width: 22, justifyContent: 'center' }}>{icon}</span>
      <span style={{ fontSize: 13.5 }}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CLASS DETAIL SHEET
// ─────────────────────────────────────────────────────────────
// ── Calendar helpers ──────────────────────────────────────────
function parseTimeRange(timeRange) {
  if (!timeRange) return null;
  const parts = timeRange.split(/\s*[–\-]\s*/);
  if (parts.length < 2) return null;
  function parse12h(t) {
    const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!m) return null;
    let h = parseInt(m[1]), min = parseInt(m[2]);
    const ap = m[3].toUpperCase();
    if (ap === 'PM' && h !== 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return { h, min };
  }
  const start = parse12h(parts[0]);
  const end   = parse12h(parts[1]);
  return (start && end) ? { start, end } : null;
}

function buildCalendarData(c, studio) {
  const times = parseTimeRange(c.time_range);
  const [y, mo, d] = c.date.split('-').map(Number);
  const sNm    = studio?.branch ? `${studio.name} ${studio.branch}` : (studio?.name || '');
  const title  = c.instructor ? `${c.name} w/ ${c.instructor}` : c.name;
  const loc    = [sNm, studio?.address].filter(Boolean).join(', ');
  const desc   = [
    c.instructor ? `Instructor: ${c.instructor}` : null,
    c.genre      ? `Style: ${c.genre}`            : null,
    c.venue      ? `Venue: ${c.venue}`             : null,
    studio?.website ? `More info: ${studio.website}` : null,
  ].filter(Boolean).join('\n');

  // PHT → UTC (Manila is UTC+8)
  function toUTC(y, mo, d, h, min) {
    return new Date(Date.UTC(y, mo - 1, d, h - 8, min))
      .toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }
  function toICSLocal(y, mo, d, h, min) {
    return `${y}${String(mo).padStart(2,'0')}${String(d).padStart(2,'0')}T${String(h).padStart(2,'0')}${String(min).padStart(2,'0')}00`;
  }

  const dtFmt = times ? 'TZID=Asia/Manila:' : 'VALUE=DATE:';
  const dtS   = times ? toICSLocal(y, mo, d, times.start.h, times.start.min) : c.date.replace(/-/g, '');
  const dtE   = times ? toICSLocal(y, mo, d, times.end.h,   times.end.min)   : c.date.replace(/-/g, '');
  const ics   = [
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
  const gcalEnd   = times ? toUTC(y, mo, d, times.end.h,   times.end.min)   : c.date.replace(/-/g, '');
  const gcalUrl   = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${gcalStart}/${gcalEnd}` +
    `&details=${encodeURIComponent(desc)}` +
    `&location=${encodeURIComponent(loc)}`;

  const filename = title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.ics';
  return { gcalUrl, ics, filename };
}

function downloadICS(ics, filename) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function ClassDetailSheet({ c, studio, instrInfo, TODAY, onClose }) {
  const info = instrInfo || {};
  const [dragY, setDragY] = useState(0);
  const startRef = useRef(null);
  const scrollRef = useRef(null);

  const handleTouchStart = e => {
    startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchMove = e => {
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
  const d = new Date(y, mo-1, da);
  const isToday   = sameDay(d, TODAY);
  const dateLabel = (isToday ? 'Today · ' : DOWFULL[d.getDay()] + ', ') + MONTHS[d.getMonth()] + ' ' + d.getDate();
  const sHue = studioColor(c.studioId);
  const sNm  = studio ? studioName(studio) : c.studioId;
  const sLc  = studio ? studioLoc(studio) : '';

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}/>
      {/* Drag wrapper — translates on swipe without fighting the snsIn mount animation */}
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
          <div style={{ width: 40, height: 4, borderRadius: 2, background: T.borderStrong }}/>
        </div>
        <button onClick={onClose} aria-label="Close" style={{
          position: 'absolute', top: 14, right: 14, zIndex: 2,
          background: 'transparent', border: 0,
          color: T.textDim, cursor: 'pointer', padding: 4,
          display: 'flex', alignItems: 'center',
        }}>
          <Icon.x s={18}/>
        </button>

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 18px 26px' }}>
          <StudioPhoto studio={studio} />

          <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: T.accent, fontWeight: 500, flexWrap: 'wrap' }}>
            <Icon.calSm s={13}/><span>{dateLabel}</span>
            {c.time_range && <>
              <span style={{ color: T.textMute }}>·</span>
              <Icon.clock s={13}/><span>{c.time_range}</span>
            </>}
          </div>

          <h2 style={{ margin: '8px 0 0', fontFamily: T.headingFont, fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.15, color: T.text }}>
            {c.name}
          </h2>

          {(c.genre || c.venue) && (
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {c.genre  && <Pill>{c.genre}</Pill>}
              {c.venue  && <Pill subtle>{c.venue}</Pill>}
            </div>
          )}

          <SectionDivider label="Instructor" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <InstructorAvatar name={c.instructor} info={info} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.headingFont, fontSize: 16, fontWeight: 600 }}>{c.instructor}</div>
              {info.bio && <div style={{ fontSize: 12.5, color: T.textDim, marginTop: 2 }}>{info.bio}</div>}
              {info.instagram && (
                <a href={info.instagram} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: T.monoFont, fontSize: 11.5, color: T.accent, marginTop: 4, display: 'block', textDecoration: 'none' }}>
                  {info.instagram.replace('https://www.instagram.com/','@').replace(/\/$/,'')}
                </a>
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
              {sLc && (() => {
                const mapsQ = encodeURIComponent(studio?.address ? `${sNm} ${studio.address}` : `${sNm} ${sLc}`);
                const mapsHref = `https://maps.google.com/?q=${mapsQ}`;
                return (
                  <a href={mapsHref} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12.5, color: T.textDim, marginTop: 2, display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                    <Icon.pin s={12}/><span style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}>{sLc}</span>
                  </a>
                );
              })()}
              {studio?.address && (
                <div style={{ fontSize: 11.5, color: T.textMute, marginTop: 2, lineHeight: 1.5 }}>{studio.address}</div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {studio?.website && (
              <LinkRow icon={<Icon.globe s={16}/>} label="Visit website"
                value={studio.website.replace(/^https?:\/\//, '')} href={studio.website} />
            )}
            {studio?.instagram && (
              <LinkRow
                icon={<span style={{ fontFamily: T.headingFont, fontSize: 16, fontWeight: 600 }}>@</span>}
                label="Instagram"
                value={studio.instagram.replace('https://www.instagram.com/','@').replace(/\/$/,'')}
                href={studio.instagram} />
            )}
          </div>

          {(() => {
            const cal = buildCalendarData(c, studio);
            const rowStyle = {
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 14px',
              background: T.panel, border: '1px solid ' + T.border, borderRadius: T.radius, color: T.text,
            };
            const iconBox = {
              width: 32, height: 32, borderRadius: 8,
              background: T.accentSoft, color: T.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
            };
            const label1 = { fontSize: 13, fontWeight: 500 };
            const label2 = { fontSize: 11.5, color: T.textDim, marginTop: 1, fontFamily: T.monoFont };
            return (
              <>
                <SectionDivider label="Add to calendar" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <a href={cal.gcalUrl} target="_blank" rel="noopener noreferrer" style={{ ...rowStyle, textDecoration: 'none' }}>
                    <span style={iconBox}><Icon.cal s={16}/></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={label1}>Google Calendar</div>
                      <div style={label2}>Opens in browser</div>
                    </div>
                    <span style={{ color: T.textMute, flex: '0 0 auto' }}><Icon.ext s={14}/></span>
                  </a>
                  <button onClick={() => downloadICS(cal.ics, cal.filename)} style={{ ...rowStyle, cursor: 'pointer', width: '100%', textAlign: 'left' }}>
                    <span style={iconBox}><Icon.download s={16}/></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={label1}>Download .ics</div>
                      <div style={label2}>Apple Calendar · Outlook · more</div>
                    </div>
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </div>
      </div>{/* end drag wrapper */}
    </div>
  );
}

function StudioPhoto({ studio }) {
  if (studio?.photo_url) {
    return (
      <div style={{
        width: '100%', height: 152, borderRadius: T.radius,
        backgroundImage: `url(${studio.photo_url})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        border: '1px solid ' + T.border,
      }}/>
    );
  }
  return (
    <div style={{
      width: '100%', height: 152, borderRadius: T.radius,
      background: placeholderGrad(studio?.id || ''),
      border: '1px solid ' + T.border,
      position: 'relative', overflow: 'hidden',
      display: 'flex', alignItems: 'flex-end', padding: 14,
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: .35,
        backgroundImage: `linear-gradient(${T.border} 1px, transparent 1px), linear-gradient(90deg, ${T.border} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
      }}/>
      <div style={{
        position: 'absolute', top: 12, right: 12,
        fontFamily: T.monoFont, fontSize: 9.5, color: T.textMute,
        background: hexA('#000', 0.35), padding: '3px 7px', borderRadius: 4, letterSpacing: '.06em',
      }}>STUDIO · PHOTO PENDING</div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, background: T.accent, color: T.accentOn,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T.headingFont, fontWeight: 700, fontSize: 13, boxShadow: T.accentGlow,
        }}>{initials(studio?.name || '')}</div>
        <div>
          <div style={{ fontFamily: T.headingFont, fontSize: 15, fontWeight: 600 }}>{studio ? studioName(studio) : ''}</div>
          <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 1 }}>{studio ? studioLoc(studio) : ''}</div>
        </div>
      </div>
    </div>
  );
}

function InstructorAvatar({ name, info, size = 52 }) {
  if (info?.photo_url) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 999,
        backgroundImage: `url(${info.photo_url})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        border: '1px solid ' + T.borderStrong, flex: '0 0 auto',
      }}/>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: placeholderGrad(name || '', 'avatar'),
      border: '1px solid ' + T.borderStrong, flex: '0 0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: T.headingFont, fontWeight: 600, fontSize: size * 0.36,
      color: T.text, position: 'relative', overflow: 'hidden',
    }}>
      <span style={{ position: 'relative', zIndex: 1 }}>{initials(name || '')}</span>
    </div>
  );
}

function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 12px' }}>
      <span style={{ fontFamily: T.bodyFont, fontSize: 11, fontWeight: 600, color: T.textDim, letterSpacing: '.06em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: T.border }}/>
    </div>
  );
}

function LinkRow({ icon, label, value, href }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '13px 14px', textDecoration: 'none',
      background: T.panel, border: '1px solid ' + T.border, borderRadius: T.radius, color: T.text,
    }}>
      <span style={{
        width: 32, height: 32, borderRadius: 8,
        background: T.accentSoft, color: T.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
      }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 1, fontFamily: T.monoFont, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value}
        </div>
      </div>
      <span style={{ color: T.textMute, flex: '0 0 auto' }}><Icon.ext s={14}/></span>
    </a>
  );
}

// ─────────────────────────────────────────────────────────────
// BOTTOM NAV — floats above the keyboard on mobile
// ─────────────────────────────────────────────────────────────
function BottomNav({ tab, changeTab }) {
  const keyboardOffset = useKeyboardOffset();
  const items = [
    { id: 'calendar', label: 'Calendar', I: Icon.cal },
    { id: 'search',   label: 'Search',   I: Icon.search },
    { id: 'contact',  label: 'About',    I: Icon.info },
  ];
  return (
    <div style={{
      position: 'absolute',
      bottom: 18 + keyboardOffset,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 30,
      display: 'flex', alignItems: 'center', gap: 4, padding: 6,
      background: hexA(T.bgSoft, 0.78),
      border: '1px solid ' + T.borderStrong,
      borderRadius: 999,
      backdropFilter: 'blur(14px) saturate(140%)',
      WebkitBackdropFilter: 'blur(14px) saturate(140%)',
      boxShadow: `0 1px 0 ${hexA(T.accent,0.12)} inset, 0 16px 40px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.35)`,
      transition: 'bottom .15s ease',
    }}>
      {items.map(it => {
        const active = tab === it.id;
        return (
          <button key={it.id} onClick={() => changeTab(it.id)} style={{
            background: active ? T.accent : 'transparent',
            color: active ? T.accentOn : T.textDim,
            border: 0, cursor: 'pointer',
            padding: active ? '9px 16px 9px 13px' : '10px 12px',
            borderRadius: 999,
            display: 'flex', alignItems: 'center', gap: 7,
            fontFamily: T.bodyFont, fontSize: 12.5,
            fontWeight: active ? 600 : 500,
            boxShadow: active ? T.accentGlow : 'none',
            transition: 'all .18s ease',
          }}>
            <it.I s={18} w={active ? 2 : 1.7}/>
            {active && <span style={{ letterSpacing: '-0.005em' }}>{it.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
