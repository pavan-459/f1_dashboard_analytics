/**
 * @typedef {object} Stint
 * @property {number} stint
 * @property {string} compound SOFT | MEDIUM | HARD | INTERMEDIATE | WET | UNKNOWN
 * @property {number} lapStart
 * @property {number | null} lapEnd
 * @property {number} laps laps on this set (0 when lap_end is unknown)
 * @property {boolean} used tyre already had laps on it at the start of the stint
 */

const COMPOUNDS = new Set(['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET']);

/**
 * OpenF1 stints → each driver's stints in order. Unknown compounds are kept as "UNKNOWN".
 * @param {object[]} stints OpenF1 /stints rows
 * @returns {Map<number, Stint[]>}
 */
export function toStintsByDriver(stints) {
  const byDriver = new Map();
  for (const s of stints) {
    const compound = COMPOUNDS.has(s.compound) ? s.compound : 'UNKNOWN';
    const lapEnd = Number.isFinite(s.lap_end) ? s.lap_end : null;
    const row = {
      stint: s.stint_number,
      compound,
      lapStart: s.lap_start,
      lapEnd,
      laps: lapEnd === null ? 0 : lapEnd - s.lap_start + 1,
      used: (s.tyre_age_at_start ?? 0) > 0,
    };
    if (!byDriver.has(s.driver_number)) byDriver.set(s.driver_number, []);
    byDriver.get(s.driver_number).push(row);
  }
  for (const list of byDriver.values()) list.sort((a, b) => a.stint - b.stint);
  return byDriver;
}

/** One-letter compound label as shown on timing screens. */
export const compoundLetter = (compound) =>
  ({ SOFT: 'S', MEDIUM: 'M', HARD: 'H', INTERMEDIATE: 'I', WET: 'W' })[compound] ?? '?';
