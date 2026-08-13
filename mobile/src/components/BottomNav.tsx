import { T } from '../lib/theme';
import { useKeyboardOffset } from '../hooks/useKeyboardOffset';
import { hexA } from '../utils/style';
import { Icon } from './Icon';
import type { Tab } from './App.types';

const ITEMS: { id: Tab; label: string; I: typeof Icon.cal }[] = [
  { id: 'calendar', label: 'Calendar', I: Icon.cal },
  { id: 'search', label: 'Search', I: Icon.search },
  { id: 'contact', label: 'About', I: Icon.info },
];

export function BottomNav({ tab, changeTab }: { tab: Tab; changeTab: (t: Tab) => void }) {
  const keyboardOffset = useKeyboardOffset();
  return (
    <div style={{
      position: 'absolute',
      bottom: `calc(18px + env(safe-area-inset-bottom) + ${keyboardOffset}px)`,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 30,
      display: 'flex', alignItems: 'center', gap: 4, padding: 6,
      background: hexA(T.bgSoft, 0.78),
      border: '1px solid ' + T.borderStrong,
      borderRadius: 999,
      backdropFilter: 'blur(14px) saturate(140%)',
      WebkitBackdropFilter: 'blur(14px) saturate(140%)',
      boxShadow: `0 1px 0 ${hexA(T.accent, 0.12)} inset, 0 16px 40px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.35)`,
      transition: 'bottom .15s ease',
    }}>
      {ITEMS.map(it => {
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
            <it.I s={18} w={active ? 2 : 1.7} />
            {active && <span style={{ letterSpacing: '-0.005em' }}>{it.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
