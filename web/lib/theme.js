// Shared design tokens ("Neon City" theme). Plain data — safe to import
// from both client components (DanceApp) and server components (studio/
// instructor pages) since it has no 'use client' directive of its own.
export const T = {
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
