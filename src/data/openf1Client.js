export const OPENF1_BASE_URL = 'https://api.openf1.org/v1';

// The free tier allows ~3 requests/second, so requests go out one at a time with a gap.
const MIN_GAP_MS = 350;
const RETRY_DELAY_MS = 1200;

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Build an OpenF1 URL. Keys may carry an operator suffix, e.g. { 'date_start<': '2026-01-01' }.
 * Array values repeat the key (driver_number=1&driver_number=4). Undefined values are skipped.
 * @param {string} endpoint
 * @param {Record<string, string | number | Array<string | number> | undefined>} [params]
 */
export function buildUrl(endpoint, params = {}, baseUrl = OPENF1_BASE_URL) {
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    const op = key.match(/[<>]=?$/)?.[0] ?? '=';
    const name = op === '=' ? key : key.slice(0, -op.length);
    for (const v of [value].flat()) {
      parts.push(`${encodeURIComponent(name)}${op}${encodeURIComponent(String(v))}`);
    }
  }
  return `${baseUrl}/${endpoint}${parts.length ? `?${parts.join('&')}` : ''}`;
}

/**
 * A rate-limited, caching JSON fetcher (OpenF1 by default). Requests are queued one at a time with a gap,
 * retried on 429, and cached by URL for the client's lifetime (failures are not cached).
 * @param {{ fetchImpl?: typeof fetch, sleep?: (ms: number) => Promise<void>, gapMs?: number, baseUrl?: string }} [options]
 * @returns {(endpoint: string, params?: Parameters<typeof buildUrl>[1]) => Promise<object[]>}
 */
export function createClient({
  fetchImpl = (...args) => fetch(...args),
  sleep = defaultSleep,
  gapMs = MIN_GAP_MS,
  baseUrl = OPENF1_BASE_URL,
} = {}) {
  const cache = new Map();
  let queue = Promise.resolve();

  async function request(url, attempt = 0) {
    const res = await fetchImpl(url);
    // OpenF1 answers 404 with { detail: "No results found." } for an empty result set.
    if (res.status === 404) return [];
    if (res.status === 429 && attempt < 2) {
      await sleep(RETRY_DELAY_MS * (attempt + 1));
      return request(url, attempt + 1);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail ?? `OpenF1 request failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  return function fetchOpenF1(endpoint, params = {}) {
    const url = buildUrl(endpoint, params, baseUrl);
    if (cache.has(url)) return cache.get(url);
    const result = queue.then(() => request(url));
    queue = result.catch(() => {}).then(() => sleep(gapMs));
    cache.set(url, result);
    result.catch(() => cache.delete(url));
    return result;
  };
}

/** Shared client for the app. */
export const fetchOpenF1 = createClient();

export const getSessions = (params) => fetchOpenF1('sessions', params);
export const getMeetings = (params) => fetchOpenF1('meetings', params);
export const getDrivers = (sessionKey) => fetchOpenF1('drivers', { session_key: sessionKey });
export const getLaps = (sessionKey, driverNumber) =>
  fetchOpenF1('laps', { session_key: sessionKey, driver_number: driverNumber });
export const getIntervals = (sessionKey) => fetchOpenF1('intervals', { session_key: sessionKey });
export const getStints = (sessionKey) => fetchOpenF1('stints', { session_key: sessionKey });
export const getPosition = (sessionKey) => fetchOpenF1('position', { session_key: sessionKey });
export const getChampionshipDrivers = (sessionKey) =>
  fetchOpenF1('championship_drivers', { session_key: sessionKey });
export const getChampionshipTeams = (sessionKey) =>
  fetchOpenF1('championship_teams', { session_key: sessionKey });
