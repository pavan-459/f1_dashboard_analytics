/**
 * @typedef {object} OpenF1Lap
 * @property {number} driver_number
 * @property {number} lap_number
 * @property {number | null} lap_duration seconds; null when timing is missing
 * @property {boolean} [is_pit_out_lap]
 */

/**
 * @typedef {object} LapTime
 * @property {number} driver driver_number
 * @property {number} lap
 * @property {number} seconds
 * @property {boolean} isPitOutLap
 */

/**
 * Raw OpenF1 laps → chart-ready lap times, sorted by driver then lap.
 * Laps without a usable duration (null, missing, non-positive) are dropped.
 * @param {OpenF1Lap[]} laps
 * @param {{ driverNumber?: number }} [options] keep only this driver
 * @returns {LapTime[]}
 */
export function toLapTimes(laps, { driverNumber } = {}) {
  return laps
    .filter((l) => driverNumber === undefined || l.driver_number === driverNumber)
    .filter((l) => Number.isFinite(l.lap_duration) && l.lap_duration > 0)
    .map((l) => ({
      driver: l.driver_number,
      lap: l.lap_number,
      seconds: l.lap_duration,
      isPitOutLap: Boolean(l.is_pit_out_lap),
    }))
    .sort((a, b) => a.driver - b.driver || a.lap - b.lap);
}

/**
 * Median lap time in seconds, or null for no laps.
 * @param {LapTime[]} laps
 */
export function medianLap(laps) {
  if (!laps.length) return null;
  const s = laps.map((l) => l.seconds).sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Drop laps slower than `threshold` × the median (pit stops, safety car, lap 1 traffic).
 * @param {LapTime[]} laps
 * @param {number} [threshold] 1.07 mirrors the 107% rule
 * @returns {LapTime[]}
 */
export function withoutSlowLaps(laps, threshold = 1.07) {
  const median = medianLap(laps);
  if (median === null) return [];
  return laps.filter((l) => l.seconds <= median * threshold);
}

/**
 * Best lap, median and count for a stint of laps.
 * @param {LapTime[]} laps
 * @returns {{ best: LapTime | null, median: number | null, count: number }}
 */
export function lapSummary(laps) {
  const best = laps.reduce((b, l) => (!b || l.seconds < b.seconds ? l : b), null);
  return { best, median: medianLap(laps), count: laps.length };
}
