import { T } from '../lib/theme';
import { hexA } from '../utils/style';

export function BgBlobs() {
  return (
    <div aria-hidden="true" style={{
      position: 'fixed', inset: 0, zIndex: 0,
      overflow: 'hidden', pointerEvents: 'none',
    }}>
      <div style={{
        position: 'absolute', borderRadius: '50%',
        width: 600, height: 600,
        top: '-15%', right: '-10%',
        background: hexA(T.accent, 0.15),
        filter: 'blur(80px)',
        animation: 'blobDrift1 13s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', borderRadius: '50%',
        width: 500, height: 500,
        bottom: '-10%', left: '-12%',
        background: hexA(T.secondary, 0.13),
        filter: 'blur(70px)',
        animation: 'blobDrift2 17s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', borderRadius: '50%',
        width: 320, height: 320,
        top: '40%', left: '35%',
        background: hexA(T.tertiary, 0.10),
        filter: 'blur(60px)',
        animation: 'blobDrift3 11s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', borderRadius: '50%',
        width: 400, height: 400,
        bottom: '5%', right: '5%',
        background: hexA(T.accent, 0.11),
        filter: 'blur(65px)',
        animation: 'blobDrift4 15s ease-in-out infinite',
      }} />
    </div>
  );
}
