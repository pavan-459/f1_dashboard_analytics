/**
 * @typedef {object} CircuitInfo MultiViewer /circuits/{key}/{year} response (subset)
 * @property {number[]} x outline, decimetres
 * @property {number[]} y
 * @property {number} rotation degrees to rotate for the conventional map orientation
 * @property {{ number: number, trackPosition: { x: number, y: number } }[]} corners
 */

/**
 * @typedef {object} TrackOutline
 * @property {[number, number][]} points outline in box coordinates (y down)
 * @property {{ number: number, x: number, y: number }[]} corners
 * @property {[number, number] | null} start first outline point (start/finish)
 */

const rotate = (x, y, deg) => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [x * c - y * s, x * s + y * c];
};

/**
 * Rotate an outline and scale it uniformly to fit a width × height box with padding.
 * Screen y grows downwards, so the outline is flipped vertically.
 * @param {CircuitInfo | null | undefined} info
 * @param {{ width: number, height: number, padding?: number }} box
 * @returns {TrackOutline}
 */
export function toTrackOutline(info, { width, height, padding = 8 }) {
  const xs = info?.x ?? [];
  const ys = info?.y ?? [];
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return { points: [], corners: [], start: null };
  const deg = info.rotation ?? 0;

  const raw = [];
  for (let i = 0; i < n; i++) raw.push(rotate(xs[i], ys[i], deg));
  const rawCorners = (info.corners ?? []).map((c) => ({
    number: c.number,
    p: rotate(c.trackPosition.x, c.trackPosition.y, deg),
  }));

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of raw) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const k = Math.min((width - 2 * padding) / spanX, (height - 2 * padding) / spanY);
  const offX = (width - spanX * k) / 2;
  const offY = (height - spanY * k) / 2;
  const fit = ([x, y]) => [
    Math.round((offX + (x - minX) * k) * 10) / 10,
    Math.round((offY + (maxY - y) * k) * 10) / 10,
  ];

  const points = raw.map(fit);
  return {
    points,
    corners: rawCorners.map(({ number, p }) => {
      const [x, y] = fit(p);
      return { number, x, y };
    }),
    start: points[0],
  };
}

/**
 * Approximate lap length in km from the outline (MultiViewer units are decimetres).
 * The sampled centre line runs ~1–2% short of official lengths, so callers show it as "≈".
 * @param {CircuitInfo | null | undefined} info
 * @returns {number | null}
 */
export function trackLengthKm(info) {
  const xs = info?.x ?? [];
  const ys = info?.y ?? [];
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  let d = 0;
  for (let i = 1; i < n; i++) d += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
  return Math.round(d / 100) / 100;
}

/**
 * "Temporary - Street" → "Street circuit", "Permanent" → "Permanent circuit".
 * @param {string | null | undefined} type
 */
export function circuitTypeLabel(type) {
  if (!type) return 'Circuit';
  if (/street/i.test(type)) return 'Street circuit';
  if (/permanent/i.test(type)) return 'Permanent circuit';
  return type;
}

/**
 * Unique circuits of a calendar, in calendar order, keeping each circuit's first weekend.
 * @param {import('./calendar.js').Weekend[]} weekends
 */
export function toCircuitList(weekends) {
  const seen = new Set();
  return weekends.filter((w) => {
    if (w.circuitKey == null || seen.has(w.circuitKey)) return false;
    seen.add(w.circuitKey);
    return true;
  });
}
