// Shared design tokens ("Neon City" theme), ported from web/lib/theme.js.
// Font tokens use the system font stack instead of Next's next/font-loaded
// Geist (Geist isn't trivially available outside Next) — -apple-system
// renders as San Francisco on iOS, which is the more native-feeling choice
// for an app shell anyway, and it's already the fallback chain the web
// theme itself falls back to.
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
  headingFont:  "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
  bodyFont:     "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
  monoFont:     "ui-monospace, 'SF Mono', monospace",
  radius:       10,
  pill:         999,
};
