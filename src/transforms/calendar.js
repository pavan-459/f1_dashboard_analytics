/**
 * @typedef {'completed' | 'live' | 'next' | 'upcoming' | 'cancelled'} WeekendStatus
 */

/**
 * @typedef {object} Weekend
 * @property {number} meetingKey
 * @property {number | null} round null for cancelled weekends
 * @property {string} name e.g. "Singapore Grand Prix"
 * @property {string} location
 * @property {string} country
 * @property {string | null} countryCode
 * @property {string | null} flag
 * @property {number | null} circuitKey
 * @property {string} circuitName
 * @property {string | null} circuitType "Permanent" | "Temporary - Street" | …
 * @property {string} start ISO, first session of the weekend
 * @property {string} end ISO, end of the race
 * @property {number | null} raceKey session_key of the Grand Prix
 * @property {number | null} sprintKey session_key of the sprint, if any
 * @property {WeekendStatus} status
 */

/**
 * Race weekends of a season with a status relative to `now`. Testing meetings (no race or
 * sprint session) are left out; cancelled weekends are kept, unnumbered.
 * @param {object[]} sessions OpenF1 /sessions rows (session_type "Race")
 * @param {object[]} meetings OpenF1 /meetings rows
 * @param {Date} now
 * @returns {Weekend[]}
 */
export function toCalendar(sessions, meetings, now) {
  const byMeeting = new Map();
  for (const s of sessions) {
    if (!byMeeting.has(s.meeting_key)) byMeeting.set(s.meeting_key, []);
    byMeeting.get(s.meeting_key).push(s);
  }
  const meetingByKey = new Map(meetings.map((m) => [m.meeting_key, m]));
  const t = now.getTime();

  const weekends = [...byMeeting.entries()]
    .map(([meetingKey, list]) => {
      const m = meetingByKey.get(meetingKey) ?? {};
      const race = list.find((s) => s.session_name !== 'Sprint') ?? null;
      const sprint = list.find((s) => s.session_name === 'Sprint') ?? null;
      const main = race ?? sprint;
      return {
        meetingKey,
        round: null,
        name: m.meeting_name ?? `${main.location} Grand Prix`,
        location: m.location ?? main.location,
        country: m.country_name ?? main.country_name ?? '',
        countryCode: m.country_code ?? main.country_code ?? null,
        flag: m.country_flag ?? null,
        circuitKey: m.circuit_key ?? main.circuit_key ?? null,
        circuitName: m.circuit_short_name ?? main.circuit_short_name ?? main.location,
        circuitType: m.circuit_type ?? null,
        start: m.date_start ?? (sprint ?? main).date_start,
        end: main.date_end ?? main.date_start,
        raceKey: race?.session_key ?? null,
        sprintKey: sprint?.session_key ?? null,
        cancelled: Boolean(m.is_cancelled ?? list.every((s) => s.is_cancelled)),
      };
    })
    .sort((a, b) => a.start.localeCompare(b.start));

  let round = 0;
  let nextAssigned = false;
  return weekends.map(({ cancelled, ...w }) => {
    if (cancelled) return { ...w, status: 'cancelled' };
    round += 1;
    let status;
    if (Date.parse(w.end) < t) status = 'completed';
    else if (Date.parse(w.start) <= t) status = 'live';
    else status = nextAssigned ? 'upcoming' : 'next';
    if (status === 'live' || status === 'next') nextAssigned = true;
    return { ...w, round, status };
  });
}

/** Human label for a status pill. */
export const STATUS_LABEL = {
  completed: 'Completed',
  live: 'Race weekend',
  next: 'Next up',
  upcoming: 'Upcoming',
  cancelled: 'Cancelled',
};
