import { useEffect, useState } from 'react';

/**
 * Track an element's content width with a ResizeObserver.
 * Falls back to `fallbackWidth` where ResizeObserver or layout is unavailable (jsdom).
 * @param {import('react').RefObject<HTMLElement>} ref
 * @param {number} [fallbackWidth]
 * @returns {number}
 */
export function useResponsiveSvg(ref, fallbackWidth = 640) {
  const [width, setWidth] = useState(fallbackWidth);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}

/** True when the viewer asked for reduced motion (or matchMedia is unavailable). */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
