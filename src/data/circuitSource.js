import { createClient } from './openf1Client.js';

// Track outlines and corners from the MultiViewer circuit API (linked from OpenF1 meetings as
// `circuit_info_url`). Separate client so it has its own queue and cache.
export const MULTIVIEWER_BASE_URL = 'https://api.multiviewer.app/api/v1';
const multiviewer = createClient({ baseUrl: MULTIVIEWER_BASE_URL, gapMs: 150 });

/**
 * @param {number} circuitKey OpenF1 circuit_key
 * @param {number} year
 * @param {typeof multiviewer} [api] injectable for tests
 * @returns {Promise<{ x: number[], y: number[], rotation: number, corners: { number: number, trackPosition: { x: number, y: number } }[] }>}
 */
export const loadCircuit = (circuitKey, year, api = multiviewer) =>
  api(`circuits/${circuitKey}/${year}`);
