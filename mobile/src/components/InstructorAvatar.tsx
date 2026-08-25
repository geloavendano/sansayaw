import { useCachedImage } from '../hooks/useCachedImage';
import { T } from '../lib/theme';
import type { Instructor } from '../types';
import { initials, placeholderGrad } from '../utils/style';

export function InstructorAvatar({ name, info, size = 52 }: { name: string | null | undefined; info: Instructor | undefined; size?: number }) {
  const cachedSrc = useCachedImage(info?.photo_url);
  if (info?.photo_url) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 999,
        backgroundImage: `url(${cachedSrc ?? info.photo_url})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        border: '1px solid ' + T.borderStrong, flex: '0 0 auto',
      }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 999,
      background: placeholderGrad(name || '', 'avatar'),
      border: '1px solid ' + T.borderStrong, flex: '0 0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: T.headingFont, fontWeight: 600, fontSize: size * 0.36,
      color: T.text, position: 'relative', overflow: 'hidden',
    }}>
      <span style={{ position: 'relative', zIndex: 1 }}>{initials(name || '')}</span>
    </div>
  );
}
