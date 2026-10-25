import {
  fetchOpenF1,
  getDrivers,
  getLaps,
  getMeetings,
  getSessions,
  getStints,
} from './openf1Client.js';

const defaultApi = { fetchOpenF1, getDrivers, getMeetings, getSessions };

/**
 * Everything the season dashboard needs, in ~6 requests: the calendar, every round's
 * driver + team standings (one range query each), and driver details.
 * @param {number} year
 * @param {typeof defaultApi} [api] injectable for tests
 */
export async function loadSeason(year, api = defaultApi) {
  const [sessions, meetings] = await Promise.all([
    api.getSessions({ year, session_type: 'Race' }),
    api.getMeetings({ year }),
  ]);
  const keys = sessions.filter((s) => !s.is_cancelled).map((s) => s.session_key);
  if (!keys.length)
    return { sessions, meetings, driverStandings: [], teamStandings: [], drivers: [] };

  const range = { 'session_key>=': Math.min(...keys), 'session_key<=': Math.max(...keys) };
  const [driverStandings, teamStandings] = await Promise.all([
    api.fetchOpenF1('championship_drivers', range),
    api.fetchOpenF1('championship_teams', range),
  ]);
  const drivers = await loadDriverDetails(api, driverStandings, sessions, range);
  return { sessions, meetings, driverStandings, teamStandings, drivers };
}

// Driver details come from the latest round with standings. Anyone who didn't take part in it
// (injury, mid-season swap) is looked up across the season in one extra request.
// Session keys aren't chronological (rescheduled rounds get new keys), so "latest" goes by date.
async function loadDriverDetails(api, driverStandings, sessions, range) {
  if (!driverStandings.length) return [];
  const scored = new Set(driverStandings.map((r) => r.session_key));
  const latestKey = sessions
    .filter((s) => scored.has(s.session_key))
    .reduce((a, b) => (b.date_start > a.date_start ? b : a)).session_key;
  const drivers = await api.getDrivers(latestKey);
  const known = new Set(drivers.map((d) => d.driver_number));
  const missing = [...new Set(driverStandings.map((r) => r.driver_number))].filter(
    (n) => !known.has(n),
  );
  if (!missing.length) return drivers;
  const extra = await api.fetchOpenF1('drivers', { ...range, driver_number: missing });
  return [...extra, ...drivers];
}

/** @param {number} sessionKey */
export const loadSessionResult = (sessionKey) =>
  fetchOpenF1('session_result', { session_key: sessionKey });

/** @param {number} sessionKey @param {number} driverNumber */
export const loadDriverLaps = (sessionKey, driverNumber) => getLaps(sessionKey, driverNumber);

/** @param {number} sessionKey */
export const loadStints = (sessionKey) => getStints(sessionKey);
