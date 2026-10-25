/**
 * Seconds → "m:ss.SSS" (or "ss.SSS" under a minute). Returns "—" for missing values.
 * @param {number | null | undefined} seconds
 * @returns {string}
 */
export function formatLapTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const totalMs = Math.round(seconds * 1000);
  const minutes = Math.floor(totalMs / 60000);
  const ms = totalMs % 60000;
  const secs = String(Math.floor(ms / 1000)).padStart(minutes ? 2 : 1, '0');
  const frac = String(ms % 1000).padStart(3, '0');
  return minutes ? `${minutes}:${secs}.${frac}` : `${secs}.${frac}`;
}

/**
 * Team name → CSS custom property holding that team's colour (see styles/tokens.css).
 * Unknown teams fall back to the default series colour.
 * @param {string | undefined} teamName
 * @returns {string} a `var(...)` expression usable as an inline style value
 */
export function teamColourVar(teamName) {
  const slug = (teamName ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug ? `var(--team-${slug}, var(--color-series-default))` : 'var(--color-series-default)';
}

/**
 * Championship points: whole numbers as-is, half points with one decimal ("12.5").
 * @param {number | null | undefined} points
 */
export function formatPoints(points) {
  if (!Number.isFinite(points)) return '—';
  return Number.isInteger(points) ? String(points) : points.toFixed(1);
}

/**
 * Signed change for deltas: "+12", "−3", "0". Uses a real minus sign.
 * @param {number} n
 * @param {(n: number) => string} [fmt]
 */
export function formatSigned(n, fmt = formatPoints) {
  if (!Number.isFinite(n) || n === 0) return fmt(0);
  return n > 0 ? `+${fmt(n)}` : `−${fmt(-n)}`;
}

/**
 * Gap to the winner from /session_result: seconds, "+1 LAP" strings, or null.
 * @param {number | string | null | undefined} gap
 */
export function formatGap(gap) {
  if (gap === 0) return 'Winner';
  if (typeof gap === 'string') return gap.startsWith('+') ? gap : `+${gap}`;
  if (!Number.isFinite(gap)) return '—';
  return `+${gap.toFixed(3)}s`;
}

/**
 * Race duration in seconds → "1:42:00.785".
 * @param {number | null | undefined} seconds
 */
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const h = Math.floor(seconds / 3600);
  const rest = formatLapTime(seconds - h * 3600);
  if (!h) return rest;
  const [m, s] = rest.includes(':') ? rest.split(':') : ['0', rest];
  return `${h}:${m.padStart(2, '0')}:${s.padStart(6, '0')}`;
}

/**
 * Ordinal for positions: 1 → "1st", 22 → "22nd".
 * @param {number} n
 */
export function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
