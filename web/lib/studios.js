import { T } from './theme';

export function studioColor(id) {
  if (!id) return T.textDim;
  if (id.startsWith('zero'))  return T.accent;
  if (id === 'playground')    return T.secondary;
  if (id === 'nudefloor')     return T.tertiary;
  if (id.startsWith('808'))   return '#b39dff'; // 808 Studio — lavender
  return T.textDim;
}

// City per studio — shown under the name. The branch is already part of
// studioName(), so repeating it here would be redundant.
export const STUDIO_CITY = {
  '808_podium':             'Mandaluyong',
  '808_bgc':                'Taguig',
  ember:                    'San Juan',
  kidlat:                   'San Juan',
  nudefloor:                'Makati',
  spac3:                    'Quezon City',
  tads:                     'Quezon City',
  playground:               'San Juan',
  zero_studio_qc:           'Quezon City',
  zero_studio_mandaluyong:  'Mandaluyong',
};

export function studioLoc(s) {
  if (!s) return '';
  return STUDIO_CITY[s.id] || '';
}

export function studioName(s) {
  if (!s) return '';
  return s.branch ? `${s.name} · ${s.branch}` : s.name;
}
