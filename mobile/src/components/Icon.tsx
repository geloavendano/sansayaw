interface IconProps {
  s?: number;
  w?: number;
}

// Inline SVG set, ported verbatim from web/components/DanceApp.jsx.
export const Icon = {
  cal:      (p: IconProps) => <svg viewBox="0 0 24 24" width={p.s || 20} height={p.s || 20} fill="none" stroke="currentColor" strokeWidth={p.w || 1.6} strokeLinecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 9.5h17M8 3.5v3.5M16 3.5v3.5" /></svg>,
  download: (p: IconProps) => <svg viewBox="0 0 24 24" width={p.s || 16} height={p.s || 16} fill="none" stroke="currentColor" strokeWidth={p.w || 1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v13M7 12l5 5 5-5M4 19h16" /></svg>,
  search:   (p: IconProps) => <svg viewBox="0 0 24 24" width={p.s || 20} height={p.s || 20} fill="none" stroke="currentColor" strokeWidth={p.w || 1.6} strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="m19.5 19.5-3.8-3.8" /></svg>,
  info:     (p: IconProps) => <svg viewBox="0 0 24 24" width={p.s || 20} height={p.s || 20} fill="none" stroke="currentColor" strokeWidth={p.w || 1.6} strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8v.2" /></svg>,
  filter:   (p: IconProps) => <svg viewBox="0 0 24 24" width={p.s || 18} height={p.s || 18} fill="none" stroke="currentColor" strokeWidth={p.w || 1.6} strokeLinecap="round"><path d="M5 7h14M8 12h8M11 17h2" /></svg>,
  chevL:    (p: IconProps) => <svg viewBox="0 0 24 24" width={p.s || 18} height={p.s || 18} fill="none" stroke="currentColor" strokeWidth={p.w || 1.8} strokeLinecap="round"><path d="m14.5 6-6 6 6 6" /></svg>,
  chevR:    (p: IconProps) => <svg viewBox="0 0 24 24" width={p.s || 18} height={p.s || 18} fill="none" stroke="currentColor" strokeWidth={p.w || 1.8} strokeLinecap="round"><path d="m9.5 6 6 6-6 6" /></svg>,
  chevD:    (p: IconProps) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth={p.w || 1.8} strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>,
  x:        (p: IconProps) => <svg viewBox="0 0 24 24" width={p.s || 18} height={p.s || 18} fill="none" stroke="currentColor" strokeWidth={p.w || 1.6} strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>,
  check:    (p: IconProps) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth={p.w || 2.4} strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-11" /></svg>,
  mail:     (p: IconProps) => <svg viewBox="0 0 24 24" width={p.s || 16} height={p.s || 16} fill="none" stroke="currentColor" strokeWidth={p.w || 1.6} strokeLinecap="round"><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="m4 8 8 6 8-6" /></svg>,
  send:     (p: IconProps) => <svg viewBox="0 0 24 24" width={p.s || 16} height={p.s || 16} fill="none" stroke="currentColor" strokeWidth={p.w || 1.6} strokeLinecap="round" strokeLinejoin="round"><path d="m4 12 16-7-6 17-3-7-7-3z" /></svg>,
  globe:    (p: IconProps) => <svg viewBox="0 0 24 24" width={p.s || 16} height={p.s || 16} fill="none" stroke="currentColor" strokeWidth={p.w || 1.6} strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 3 2.5 14 0 17M12 3.5c-2.5 3-2.5 14 0 17" /></svg>,
  ext:      (p: IconProps) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth={p.w || 1.7} strokeLinecap="round" strokeLinejoin="round"><path d="M14 5h5v5M19 5l-9 9M11 6H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-4" /></svg>,
  pin:      (p: IconProps) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth={p.w || 1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>,
  clock:    (p: IconProps) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth={p.w || 1.7} strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>,
  calSm:    (p: IconProps) => <svg viewBox="0 0 24 24" width={p.s || 14} height={p.s || 14} fill="none" stroke="currentColor" strokeWidth={p.w || 1.7} strokeLinecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 9.5h17M8 3.5v3.5M16 3.5v3.5" /></svg>,
};
