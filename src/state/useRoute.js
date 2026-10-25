import { useCallback, useEffect, useState } from 'react';

/** Pages in sidebar order. `path` is the hash path; `icon` is a key of icons/geometry.js. */
export const PAGES = [
  { path: '/', title: 'Dashboard', icon: 'dashboard' },
  { path: '/results', title: 'Results', icon: 'results' },
  { path: '/standings', title: 'Standings', icon: 'standings' },
  { path: '/calendar', title: 'Calendar', icon: 'calendar' },
  { path: '/circuits', title: 'Circuits', icon: 'circuits' },
  { path: '/teams', title: 'Teams', icon: 'teams' },
];

/**
 * Parse "#/results?season=2025&round=9839" → { path: '/results', params: { season: '2025', round: '9839' } }.
 * Unknown paths fall back to the dashboard.
 * @param {string} hash
 */
export function parseRoute(hash) {
  const raw = (hash ?? '').replace(/^#/, '') || '/';
  const [pathPart, query = ''] = raw.split('?');
  const path = PAGES.some((p) => p.path === pathPart) ? pathPart : '/';
  return { path, params: Object.fromEntries(new URLSearchParams(query)) };
}

/**
 * Build a hash href. Empty/undefined params are dropped.
 * @param {string} path
 * @param {Record<string, string | number | null | undefined>} [params]
 */
export function toHref(path, params = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  const qs = q.toString();
  return `#${path}${qs ? `?${qs}` : ''}`;
}

/**
 * Hash-based routing: works on any static host with no server rewrites, and every view
 * (page + season + round) is a shareable link.
 * @returns {[ReturnType<typeof parseRoute>, (path: string, params?: object, opts?: { replace?: boolean }) => void]}
 */
export function useRoute() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((path, params = {}, { replace = false } = {}) => {
    const href = toHref(path, params);
    if (replace) {
      window.history.replaceState(null, '', href);
      setRoute(parseRoute(href));
    } else {
      window.location.hash = href.slice(1);
    }
  }, []);

  return [route, navigate];
}
