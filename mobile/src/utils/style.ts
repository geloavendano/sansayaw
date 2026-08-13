import { T } from '../lib/theme';

export function hexA(hex: string, a: number): string {
  const m = hex.replace('#', '');
  return `rgba(${parseInt(m.slice(0, 2), 16)},${parseInt(m.slice(2, 4), 16)},${parseInt(m.slice(4, 6), 16)},${a})`;
}

export function initials(name: string | null | undefined): string {
  return (name || '').split(/[\s·\-]+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

export function placeholderGrad(seed: string | null | undefined, kind: 'studio' | 'avatar' = 'studio'): string {
  const h = [...(seed || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  const tilt = (h % 60) - 30;
  const cols = kind === 'studio'
    ? [hexA(T.accent, 0.18), hexA(T.secondary, 0.18), hexA(T.tertiary, 0.12)]
    : [hexA(T.accent, 0.32), hexA(T.secondary, 0.22)];
  return `linear-gradient(${135 + tilt}deg, ${cols.join(', ')}), ${T.panelSolid}`;
}
