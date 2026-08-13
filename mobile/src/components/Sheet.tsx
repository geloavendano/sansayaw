import { useRef, useState, type ReactNode, type TouchEvent } from 'react';
import { T } from '../lib/theme';
import { Icon } from './Icon';

interface SheetProps {
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Sheet({ onClose, title, children, footer }: SheetProps) {
  const [dragY, setDragY] = useState(0);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleTouchMove = (e: TouchEvent) => {
    if (!startRef.current) return;
    const sc = scrollRef.current;
    if (sc && sc.scrollTop > 0) return;
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
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'relative', background: T.bgSoft,
          borderTop: '1px solid ' + T.borderStrong,
          borderTopLeftRadius: 22, borderTopRightRadius: 22,
          maxHeight: '82%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
          transform: `translateY(${dragY}px)`,
          transition: dragY === 0 ? 'transform .3s cubic-bezier(.2,.7,.3,1)' : 'none',
          willChange: 'transform',
        }}>
        <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'center', padding: '10px 0 6px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: T.borderStrong }} />
        </div>
        <div style={{ flex: '0 0 auto', padding: '10px 22px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: T.headingFont, fontSize: 17, fontWeight: 600, color: T.text, letterSpacing: '-0.01em' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 0, color: T.textDim, cursor: 'pointer', padding: 4 }}>
            <Icon.x />
          </button>
        </div>
        <div ref={scrollRef} style={{ flex: '0 1 auto', overflowY: 'auto', paddingBottom: footer ? 8 : 'calc(22px + env(safe-area-inset-bottom))' }}>
          {children}
        </div>
        {footer && (
          <div style={{ flex: '0 0 auto', borderTop: '1px solid ' + T.border, background: T.bgSoft, padding: '14px 20px calc(22px + env(safe-area-inset-bottom))' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
