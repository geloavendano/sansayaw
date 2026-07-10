import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #0a1820 0%, #0e2030 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 132, fontWeight: 700, color: '#f0eef8', letterSpacing: '-0.02em' }}>
          <span>sa</span>
          <span style={{ color: '#3ee0d8' }}>&apos;</span>
          <span>nsayaw</span>
        </div>
        <div style={{ display: 'flex', marginTop: 28, fontSize: 36, color: '#8fb0bd', letterSpacing: '0.02em' }}>
          Manila Dance Classes, Studios &amp; Schedules
        </div>
        <div style={{ display: 'flex', marginTop: 44, gap: 16 }}>
          {['#3ee0d8', '#f5a623', '#f77b72', '#b39dff'].map((c, i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: 999, background: c }} />
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
