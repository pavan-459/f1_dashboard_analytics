// Throughput of the dashboard transforms on a dataset ~10× a real season, so scrubbing and
// season replay stay well inside a frame budget even on slow phones (4–6× slower than CI).
import { fixture } from '../helpers/fixtures.js';
import {
  toDriverDirectory,
  toDriverStandings,
  toMovers,
  toProgression,
  toRounds,
  toTeammateBattles,
  toTeamColours,
  toTeamStandings,
  toTitleMath,
} from '../../src/transforms/championship.js';

const season = fixture('seasons/2026.json');

// Ten copies of the season with shifted keys and dates: ~5,000 standings rows.
const copies = 10;
const shift = (k, i) => k + i * 100000;
const big = {
  sessions: Array.from({ length: copies }, (_, i) =>
    season.sessions.map((s) => ({
      ...s,
      session_key: shift(s.session_key, i),
      date_start: `${2026 + i}${s.date_start.slice(4)}`,
    })),
  ).flat(),
  meetings: season.meetings,
  driverStandings: Array.from({ length: copies }, (_, i) =>
    season.driverStandings.map((r) => ({ ...r, session_key: shift(r.session_key, i) })),
  ).flat(),
  teamStandings: Array.from({ length: copies }, (_, i) =>
    season.teamStandings.map((r) => ({ ...r, session_key: shift(r.session_key, i) })),
  ).flat(),
};

const time = (fn, runs = 20) => {
  fn(); // warm up
  const t0 = performance.now();
  for (let i = 0; i < runs; i++) fn();
  return (performance.now() - t0) / runs;
};

describe('transform throughput (10× season)', () => {
  const directory = toDriverDirectory(season.drivers);
  const rounds = toRounds(big.sessions, big.meetings, big.driverStandings);
  const scored = rounds.filter((r) => r.hasStandings);

  it(`builds the calendar for ${big.sessions.length} sessions in under 5ms`, () => {
    expect(time(() => toRounds(big.sessions, big.meetings, big.driverStandings))).toBeLessThan(5);
  });

  it(`recomputes one round's full view over ${big.driverStandings.length} rows in under 4ms`, () => {
    const key = scored.at(-1).sessionKey;
    const colours = toTeamColours(directory);
    const ms = time(() => {
      const drivers = toDriverStandings(big.driverStandings, key, directory);
      const teams = toTeamStandings(big.teamStandings, key, colours);
      toTitleMath(drivers, []);
      toTeammateBattles(drivers, teams);
      toMovers(drivers);
    });
    expect(ms).toBeLessThan(4);
  });

  it('replays every round of all ten seasons in under 250ms total', () => {
    const colours = toTeamColours(directory);
    const t0 = performance.now();
    for (const r of scored) {
      const drivers = toDriverStandings(big.driverStandings, r.sessionKey, directory);
      toTeamStandings(big.teamStandings, r.sessionKey, colours);
      toTitleMath(drivers, []);
    }
    expect(performance.now() - t0).toBeLessThan(250);
  });

  it('builds the five-line progression over every round in under 10ms', () => {
    expect(
      time(() => toProgression(big.driverStandings, scored, [12, 63, 44, 16, 1])),
    ).toBeLessThan(10);
  });
});
