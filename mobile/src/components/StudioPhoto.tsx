import { useCachedImage } from '../hooks/useCachedImage';
import { T } from '../lib/theme';
import { studioLoc, studioName } from '../lib/studios';
import type { Studio } from '../types';
import { hexA, initials, placeholderGrad } from '../utils/style';

export function StudioPhoto({ studio }: { studio: Studio | undefined }) {
  const cachedSrc = useCachedImage(studio?.photo_url);
  if (studio?.photo_url) {
    return (
      <div style={{
        width: '100%', height: 152, borderRadius: T.radius,
        backgroundImage: `url(${cachedSrc ?? studio.photo_url})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        border: '1px solid ' + T.border,
      }} />
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
      }} />
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
