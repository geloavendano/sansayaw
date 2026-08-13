import { useMemo } from 'react';
import { track } from '../lib/analytics';
import { T } from '../lib/theme';
import { studioColor, studioLoc, studioName } from '../lib/studios';
import type { Studio } from '../types';
import { Checkbox } from './Primitives';
import { Sheet } from './Sheet';

// Group studios by city (in studio list order within each group), cities
// sorted alphabetically. Studios with no known city fall into "Other".
function groupStudiosByCity(studios: Studio[]): [string, Studio[]][] {
  const map = new Map<string, Studio[]>();
  for (const s of studios) {
    const city = studioLoc(s) || 'Other';
    if (!map.has(city)) map.set(city, []);
    map.get(city)!.push(s);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

interface FilterSheetProps {
  studios: Studio[];
  enabledStudios: Set<string>;
  setEnabledStudios: (s: Set<string>) => void;
  onClose: () => void;
}

export function FilterSheet({ studios, enabledStudios, setEnabledStudios, onClose }: FilterSheetProps) {
  const toggle = (id: string) => {
    const next = new Set(enabledStudios);
    next.has(id) ? next.delete(id) : next.add(id);
    setEnabledStudios(next);
  };
  const toggleGroup = (groupStudios: Studio[], groupAllOn: boolean) => {
    const next = new Set(enabledStudios);
    groupStudios.forEach(s => groupAllOn ? next.delete(s.id) : next.add(s.id));
    setEnabledStudios(next);
  };
  const allOn = enabledStudios.size === studios.length;
  const cityGroups = useMemo(() => groupStudiosByCity(studios), [studios]);

  const footer = (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={() => setEnabledStudios(new Set(allOn ? [] : studios.map(s => s.id)))} style={{
        flex: 1, padding: '12px 0', background: 'transparent',
        border: '1px solid ' + T.borderStrong, borderRadius: T.pill,
        color: T.text, fontFamily: T.bodyFont, fontSize: 13, fontWeight: 500, cursor: 'pointer',
      }}>{allOn ? 'Clear all' : 'Select all'}</button>
      <button onClick={() => { track('filter_applied', { enabled_count: enabledStudios.size, total_count: studios.length }); onClose(); }} style={{
        flex: 1.4, padding: '12px 0', background: T.accent, color: T.accentOn,
        border: '1px solid ' + T.accent, borderRadius: T.pill,
        fontFamily: T.bodyFont, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        boxShadow: T.accentGlow,
      }}>Apply</button>
    </div>
  );

  return (
    <Sheet onClose={onClose} title="Studios" footer={footer}>
      <div style={{ fontSize: 12.5, color: T.textDim, padding: '0 22px 14px' }}>Show classes from</div>
      <div style={{ padding: '0 16px' }}>
        {cityGroups.map(([city, groupStudios], gi) => {
          const onCount = groupStudios.filter(s => enabledStudios.has(s.id)).length;
          const groupAllOn = onCount === groupStudios.length;
          const groupSomeOn = onCount > 0 && !groupAllOn;
          return (
            <div key={city} style={{ marginTop: gi === 0 ? 0 : 6 }}>
              <button onClick={() => toggleGroup(groupStudios, groupAllOn)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '10px 12px', background: 'transparent', border: 0,
                cursor: 'pointer', color: T.text, textAlign: 'left', fontFamily: T.bodyFont,
              }}>
                <Checkbox on={groupAllOn} indeterminate={groupSomeOn} />
                <span style={{
                  flex: 1, fontSize: 12, fontWeight: 600, color: T.textDim,
                  letterSpacing: '.06em', textTransform: 'uppercase',
                }}>{city}</span>
                <span style={{ fontSize: 11.5, color: T.textMute }}>{onCount}/{groupStudios.length}</span>
              </button>
              {groupStudios.map((s, i) => {
                const on = enabledStudios.has(s.id);
                return (
                  <button key={s.id} onClick={() => toggle(s.id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 12px 12px 30px', background: 'transparent',
                    border: 0, borderBottom: i === groupStudios.length - 1 ? 'none' : '1px solid ' + T.border,
                    cursor: 'pointer', color: T.text, textAlign: 'left', fontFamily: T.bodyFont,
                  }}>
                    <Checkbox on={on} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 999, background: studioColor(s.id) }} />
                        <span style={{ fontSize: 15, fontWeight: 500, fontFamily: T.headingFont }}>{studioName(s)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
