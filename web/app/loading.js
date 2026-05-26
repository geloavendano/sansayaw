// Shown while the Server Component fetches data (only on cache miss)
export default function Loading() {
  return (
    <div style={{
      width: '100%', height: '100svh',
      background: '#0a1820', color: '#eaf6f7',
      fontFamily: "var(--font-geist-sans), 'Helvetica Neue', sans-serif",
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 18,
      backgroundImage: 'radial-gradient(120% 50% at 80% 0%, rgba(62,224,216,0.08) 0%, transparent 60%)',
    }}>
      {/* Wordmark */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>
          sa<span style={{ color: '#3ee0d8', fontWeight: 700, margin: '0 -1px', textShadow: '0 0 12px #3ee0d8' }}>&apos;</span>nsayaw
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 500, color: 'rgba(234,246,247,0.62)', letterSpacing: '.02em' }}>mnl</span>
      </div>
      <div style={{ color: 'rgba(234,246,247,0.62)', fontSize: 13 }}>Loading schedule…</div>
    </div>
  );
}
