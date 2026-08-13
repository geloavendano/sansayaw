import type { ReactNode } from 'react';
import { T } from '../lib/theme';
import { hexA } from '../utils/style';
import { Icon } from './Icon';

export function Pill({ children, subtle }: { children: ReactNode; subtle?: boolean }) {
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

export function EmptyState() {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', color: T.textDim, fontSize: 13 }}>
      <div style={{ fontFamily: T.headingFont, fontSize: 16, color: T.text, marginBottom: 6 }}>No classes match</div>
      Try adjusting filters or picking another date.
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 11.5, color: T.textDim, margin: '0 4px 10px', fontWeight: 500 }}>{children}</div>;
}

export function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '22px 0 12px' }}>
      <span style={{ fontFamily: T.bodyFont, fontSize: 11, fontWeight: 600, color: T.textDim, letterSpacing: '.06em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ flex: 1, height: 1, background: T.border }} />
    </div>
  );
}

export function Checkbox({ on, indeterminate }: { on: boolean; indeterminate?: boolean }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: 6,
      border: '1.5px solid ' + (on || indeterminate ? T.accent : T.borderStrong),
      background: on || indeterminate ? T.accent : 'transparent', color: T.accentOn,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flex: '0 0 auto', transition: 'all .15s',
    }}>
      {on && <Icon.check s={14} />}
      {indeterminate && !on && <div style={{ width: 10, height: 2, borderRadius: 1, background: T.accentOn }} />}
    </div>
  );
}

// External-link row — onPress is provided by callers via Capacitor's
// Browser.open() (see lib/links.ts) instead of an <a target="_blank">.
export function LinkRow({ icon, label, value, onPress }: { icon: ReactNode; label: string; value: string; onPress: () => void }) {
  return (
    <button onClick={onPress} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%',
      padding: '13px 14px', textAlign: 'left',
      background: T.panel, border: '1px solid ' + T.border, borderRadius: T.radius, color: T.text,
      fontFamily: T.bodyFont, cursor: 'pointer',
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
      <span style={{ color: T.textMute, flex: '0 0 auto' }}><Icon.ext s={14} /></span>
    </button>
  );
}

export function Wordmark() {
  return <img src="/wordmark.svg" alt="sa'nsayaw" style={{ height: 22, width: 'auto', display: 'block' }} />;
}

export function TopBar({ onFilter, filterCount, studioCount }: { onFilter?: () => void; filterCount?: number; studioCount?: number }) {
  return (
    <div style={{ padding: 'calc(16px + env(safe-area-inset-top)) 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 }}>
      <Wordmark />
      {onFilter && (
        <button onClick={onFilter} style={{
          background: (filterCount || 0) > 0 ? T.accentSoft : 'transparent',
          color: (filterCount || 0) > 0 ? T.accent : T.text,
          border: '1px solid ' + ((filterCount || 0) > 0 ? hexA(T.accent, 0.4) : T.borderStrong),
          borderRadius: T.pill, padding: '7px 12px',
          fontFamily: T.bodyFont, fontSize: 12, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        }}>
          <Icon.filter s={14} />
          <span>Filter{(filterCount || 0) > 0 ? ' · ' + ((studioCount || 0) - (filterCount || 0)) : ''}</span>
        </button>
      )}
    </div>
  );
}
