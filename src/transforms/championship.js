/**
 * @typedef {object} Round
 * @property {number} sessionKey
 * @property {number} meetingKey
 * @property {number} round 1-based Grand Prix number (a sprint shares its weekend's number)
 * @property {boolean} isSprint
 * @property {string} name e.g. "United States Grand Prix"
 * @property {string} location e.g. "Austin"
 * @property {string} countryCode e.g. "USA"
 * @property {string | null} flag image URL
 * @property {string} date ISO start time
 * @property {boolean} hasStandings standings have been published for this session
 */

/**
 * @typedef {object} DriverInfo
 * @property {number} number
 * @property {string} name full name, e.g. "Lando Norris"
 * @property {string} lastName
 * @property {string} acronym
 * @property {string | null} team
 * @property {string | null} colour "#rrggbb" team colour, or null when unknown
 * @property {string | null} headshot
 */

/**
 * @typedef {object} StandingRow
 * @property {string} id driver number or team name, as a string
 * @property {number} position
 * @property {number} change places gained this round (positive = moved up)
 * @property {number} points
 * @property {number} pointsStart
 * @property {number} gained
 * @property {string} label short label for charts
 * @property {string} name
 * @property {string | null} team
 * @property {string | null} colour
 * @property {DriverInfo} [driver]
 */

/** Maximum points one session can award (P1; no fastest-lap point since 2025). */
export const MAX_POINTS = { race: 25, sprint: 8 };

const toTitleCase = (s) => s.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase());

/**
 * Calendar: non-cancelled race and sprint sessions, in date order, numbered by weekend.
 * @param {object[]} sessions OpenF1 /sessions rows (session_type "Race")
 * @param {object[]} meetings OpenF1 /meetings rows
 * @param {object[]} [driverStandings] used only to flag which sessions have standings yet
 * @returns {Round[]}
 */
export function toRounds(sessions, meetings, driverStandings = []) {
  const meetingByKey = new Map(meetings.map((m) => [m.meeting_key, m]));
  const withStandings = new Set(driverStandings.map((r) => r.session_key));
  const roundOf = new Map();
  return sessions
    .filter((s) => !s.is_cancelled)
    .sort((a, b) => a.date_start.localeCompare(b.date_start))
    .map((s) => {
      if (!roundOf.has(s.meeting_key)) roundOf.set(s.meeting_key, roundOf.size + 1);
      const meeting = meetingByKey.get(s.meeting_key);
      return {
        sessionKey: s.session_key,
        meetingKey: s.meeting_key,
        round: roundOf.get(s.meeting_key),
        isSprint: s.session_name === 'Sprint',
        name: meeting?.meeting_name ?? `${s.location} Grand Prix`,
        location: s.location,
        countryCode: s.country_code,
        flag: meeting?.country_flag ?? null,
        date: s.date_start,
        hasStandings: withStandings.has(s.session_key),
      };
    });
}

/**
 * Latest known details per driver number. Later records win, so pass oldest first.
 * @param {object[]} drivers OpenF1 /drivers rows
 * @returns {Map<number, DriverInfo>}
 */
export function toDriverDirectory(drivers) {
  const directory = new Map();
  for (const d of drivers) {
    const first = d.first_name ?? '';
    const last = d.last_name ? toTitleCase(d.last_name) : `#${d.driver_number}`;
    directory.set(d.driver_number, {
      number: d.driver_number,
      name: first ? `${first} ${last}` : last,
      lastName: last,
      acronym: d.name_acronym ?? String(d.driver_number),
      team: d.team_name ?? null,
      colour: d.team_colour ? `#${d.team_colour}` : null,
      headshot: d.headshot_url ?? null,
    });
  }
  return directory;
}

/** Placeholder for a driver number that has no /drivers record. */
const unknownDriver = (number) => ({
  number,
  name: `Driver #${number}`,
  lastName: `#${number}`,
  acronym: `#${number}`,
  team: null,
  colour: null,
  headshot: null,
});

/**
 * Team name → colour, taken from the directory's drivers.
 * @param {Map<number, DriverInfo>} directory
 * @returns {Map<string, string>}
 */
export function toTeamColours(directory) {
  const colours = new Map();
  for (const d of directory.values()) {
    if (d.team && d.colour) colours.set(d.team, d.colour);
  }
  return colours;
}

const round1 = (n) => Math.round(n * 10) / 10;

function baseRow(r) {
  return {
    position: r.position_current,
    change: r.position_start == null ? 0 : r.position_start - r.position_current,
    points: r.points_current,
    pointsStart: r.points_start ?? r.points_current,
    gained: round1(r.points_current - (r.points_start ?? r.points_current)),
  };
}

/**
 * One session's driver standings, joined with driver details, ordered by position.
 * @param {object[]} rows OpenF1 /championship_drivers rows (any sessions; filtered by sessionKey)
 * @param {number} sessionKey
 * @param {Map<number, DriverInfo>} directory
 * @returns {StandingRow[]}
 */
export function toDriverStandings(rows, sessionKey, directory) {
  return rows
    .filter((r) => r.session_key === sessionKey)
    .map((r) => {
      const driver = directory.get(r.driver_number) ?? unknownDriver(r.driver_number);
      return {
        ...baseRow(r),
        id: String(r.driver_number),
        label: driver.acronym,
        name: driver.name,
        team: driver.team,
        colour: driver.colour,
        driver,
      };
    })
    .sort((a, b) => a.position - b.position || b.points - a.points);
}

/**
 * One session's team standings, ordered by position.
 * @param {object[]} rows OpenF1 /championship_teams rows
 * @param {number} sessionKey
 * @param {Map<string, string>} teamColours
 * @returns {StandingRow[]}
 */
export function toTeamStandings(rows, sessionKey, teamColours) {
  return rows
    .filter((r) => r.session_key === sessionKey)
    .map((r) => ({
      ...baseRow(r),
      id: r.team_name,
      label: r.team_name,
      name: r.team_name,
      team: r.team_name,
      colour: teamColours.get(r.team_name) ?? null,
    }))
    .sort((a, b) => a.position - b.position || b.points - a.points);
}

/**
 * Points after each round for the given ids, for a progression chart.
 * @param {object[]} rows OpenF1 /championship_drivers rows
 * @param {Round[]} rounds rounds with standings, in order
 * @param {number[]} driverNumbers
 * @returns {{ driverNumber: number, values: { index: number, sessionKey: number, points: number, position: number }[] }[]}
 */
export function toProgression(rows, rounds, driverNumbers) {
  const index = new Map(rounds.map((r, i) => [r.sessionKey, i]));
  return driverNumbers.map((driverNumber) => ({
    driverNumber,
    values: rows
      .filter((r) => r.driver_number === driverNumber && index.has(r.session_key))
      .map((r) => ({
        index: index.get(r.session_key),
        sessionKey: r.session_key,
        points: r.points_current,
        position: r.position_current,
      }))
      .sort((a, b) => a.index - b.index),
  }));
}

/**
 * Who can still mathematically win the title, given the sessions still to run.
 * A driver is alive while points + everything still available ≥ the leader's points.
 * Tie-breaks (count-back on wins) are ignored, so a tie counts as alive.
 * @param {StandingRow[]} standings ordered by position
 * @param {Round[]} remaining sessions after the current one
 * @param {{ race: number, sprint: number }} [maxPoints]
 */
export function toTitleMath(standings, remaining, maxPoints = MAX_POINTS) {
  const available = remaining.reduce(
    (sum, r) => sum + (r.isSprint ? maxPoints.sprint : maxPoints.race),
    0,
  );
  const leader = standings[0];
  if (!leader) return { available, races: 0, sprints: 0, contenders: [], decided: false };
  const contenders = standings.map((row) => {
    const deficit = round1(leader.points - row.points);
    return { ...row, deficit, maxPoints: row.points + available, alive: deficit <= available };
  });
  const alive = contenders.filter((c) => c.alive);
  return {
    available,
    races: remaining.filter((r) => !r.isSprint).length,
    sprints: remaining.filter((r) => r.isSprint).length,
    contenders: alive,
    eliminatedCount: contenders.length - alive.length,
    decided: alive.length === 1,
  };
}

/**
 * Teammate head-to-heads: drivers grouped by their current team, in team-standings order.
 * Teams with a single scorer are left out.
 * @param {StandingRow[]} driverStandings
 * @param {StandingRow[]} teamStandings
 */
export function toTeammateBattles(driverStandings, teamStandings) {
  const byTeam = new Map();
  for (const row of driverStandings) {
    if (!row.team) continue;
    if (!byTeam.has(row.team)) byTeam.set(row.team, []);
    byTeam.get(row.team).push(row);
  }
  const order = new Map(teamStandings.map((t, i) => [t.team, i]));
  return [...byTeam.entries()]
    .filter(([, drivers]) => drivers.length >= 2)
    .map(([team, drivers]) => {
      const pair = drivers.sort((a, b) => b.points - a.points).slice(0, 2);
      const total = pair[0].points + pair[1].points;
      return {
        team,
        colour: pair[0].colour,
        drivers: pair,
        total,
        leadShare: total ? pair[0].points / total : 0.5,
        margin: round1(pair[0].points - pair[1].points),
      };
    })
    .sort((a, b) => (order.get(a.team) ?? 99) - (order.get(b.team) ?? 99));
}

/**
 * Biggest championship-position climbers and fallers this round.
 * @param {StandingRow[]} standings
 * @param {number} [count]
 */
export function toMovers(standings, count = 3) {
  const moved = standings.filter((r) => r.change !== 0);
  return {
    up: moved
      .filter((r) => r.change > 0)
      .sort((a, b) => b.change - a.change || a.position - b.position)
      .slice(0, count),
    down: moved
      .filter((r) => r.change < 0)
      .sort((a, b) => a.change - b.change || a.position - b.position)
      .slice(0, count),
  };
}

/**
 * Session classification joined with driver details: finishers in order, then DNF/DNS/DSQ.
 * @param {object[]} results OpenF1 /session_result rows
 * @param {Map<number, DriverInfo>} directory
 */
export function toClassification(results, directory) {
  const status = (r) => (r.dsq ? 'DSQ' : r.dns ? 'DNS' : r.dnf ? 'DNF' : null);
  return results
    .map((r) => ({
      position: r.position,
      status: status(r),
      points: r.points ?? 0,
      laps: r.number_of_laps ?? null,
      gap: r.gap_to_leader,
      duration: r.duration,
      driver: directory.get(r.driver_number) ?? unknownDriver(r.driver_number),
    }))
    .sort((a, b) => {
      const ar = a.status ? 1 : 0;
      const br = b.status ? 1 : 0;
      return ar - br || (a.position ?? 99) - (b.position ?? 99) || (b.laps ?? 0) - (a.laps ?? 0);
    });
}
