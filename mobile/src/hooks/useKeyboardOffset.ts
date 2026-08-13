import { useEffect, useState } from 'react';

// Tracks how far the keyboard has pushed up from the bottom so the floating
// nav can stay visible above it. Uses window.visualViewport, which WKWebView
// supports — verified against Capacitor's default keyboard resize behavior
// during on-device testing; revisit if it ever double-compensates.
export function useKeyboardOffset(): number {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kb = Math.max(0, window.innerHeight - vv.offsetTop - vv.height);
      setOffset(kb);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);
  return offset;
}
