import { fixture } from '../helpers/fixtures.js';
import {
  toClassification,
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

const season2025 = fixture('seasons/2025.json');
const season2026 = fixture('seasons/2026.json');

const MARINA_BAY = 11388;
const directory = toDriverDirectory(season2026.drivers);
const rounds = toRounds(season2026.sessions, season2026.meetings, season2026.driverStandings);
const drivers = toDriverStandings(season2026.driverStandings, MARINA_BAY, directory);
const teams = toTeamStandings(season2026.teamStandings, MARINA_BAY, toTeamColours(directory));

describe('toRounds', () => {
  it('drops cancelled sessions and orders by date, not session_key', () => {
    expect(rounds.some((r) => ['Sakhir', 'Jeddah'].includes(r.location))).toBeFalse();
    const dates = rounds.map((r) => r.date);
    expect(dates).toEqual([...dates].sort());
    // Kuala Lumpur has the highest key of the season but ran before Marina Bay.
    const kl = rounds.findIndex((r) => r.sessionKey === 11731);
    const mb = rounds.findIndex((r) => r.sessionKey === MARINA_BAY);
    expect(kl).toBeLessThan(mb);
  });

  it('numbers rounds by weekend so a sprint shares its race weekend number', () => {
    const sprint = rounds.find((r) => r.isSprint);
    const race = rounds.find((r) => !r.isSprint && r.meetingKey === sprint.meetingKey);
    expect(sprint.round).toBe(race.round);
    expect(rounds[0].round).toBe(1);
  });

  it('joins meeting names and flags, and flags which sessions have standings', () => {
    const mb = rounds.find((r) => r.sessionKey === MARINA_BAY);
    expect(mb.name).toMatch(/Singapore/);
    expect(mb.flag).toMatch(/^https:/);
    expect(mb.hasStandings).toBeTrue();
    expect(rounds.at(-1).hasStandings).toBeFalse(); // Abu Dhabi hasn't run yet
  });

  it('falls back to "<location> Grand Prix" without a meeting', () => {
    const [r] = toRounds(
      [
        {
          session_key: 1,
          meeting_key: 9,
          session_name: 'Race',
          location: 'Monza',
          date_start: '2026-09-06',
        },
      ],
      [],
    );
    expect(r).toEqual(
      jasmine.objectContaining({
        name: 'Monza Grand Prix',
        flag: null,
        hasStandings: false,
        round: 1,
      }),
    );
  });
});

describe('toDriverDirectory', () => {
  it('title-cases names and prefixes team colours with #', () => {
    expect(directory.get(12)).toEqual(
      jasmine.objectContaining({
        name: 'Kimi Antonelli',
        lastName: 'Antonelli',
        acronym: 'ANT',
        team: 'Mercedes',
      }),
    );
    expect(directory.get(12).colour).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it('includes drivers who missed the latest round (looked up across the season)', () => {
    expect(directory.get(22)).toEqual(
      jasmine.objectContaining({ name: 'Yuki Tsunoda', team: 'Racing Bulls' }),
    );
  });

  it('lets later records win and tolerates missing fields', () => {
    const d = toDriverDirectory([
      { driver_number: 5, last_name: 'OLD', team_name: 'A' },
      { driver_number: 5, first_name: 'New', last_name: "O'CONNOR-SMITH", team_name: 'B' },
      { driver_number: 7 },
    ]);
    expect(d.get(5)).toEqual(
      jasmine.objectContaining({ name: "New O'Connor-Smith", team: 'B', colour: null }),
    );
    expect(d.get(7)).toEqual(jasmine.objectContaining({ name: '#7', acronym: '7', team: null }));
  });
});

describe('toDriverStandings', () => {
  it('orders by position and joins driver details', () => {
    expect(drivers[0]).toEqual(
      jasmine.objectContaining({
        position: 1,
        points: 340,
        pointsStart: 325,
        gained: 15,
        label: 'ANT',
      }),
    );
    expect(drivers.map((d) => d.position)).toEqual(drivers.map((_, i) => i + 1));
  });

  it('computes places gained (positive = up)', () => {
    expect(drivers.find((d) => d.id === '3').change).toBe(1); // 5th → 4th
    expect(drivers.find((d) => d.id === '16').change).toBe(-1); // 4th → 5th
  });

  it('uses a placeholder for numbers with no driver record', () => {
    const [row] = toDriverStandings(
      [
        {
          session_key: 1,
          driver_number: 99,
          position_current: 1,
          position_start: 1,
          points_current: 1,
          points_start: 0,
        },
      ],
      1,
      new Map(),
    );
    expect(row).toEqual(
      jasmine.objectContaining({ name: 'Driver #99', label: '#99', team: null, colour: null }),
    );
  });

  it('treats missing start values as no change', () => {
    const [row] = toDriverStandings(
      [
        {
          session_key: 1,
          driver_number: 1,
          position_current: 3,
          position_start: null,
          points_current: 10,
          points_start: null,
        },
      ],
      1,
      directory,
    );
    expect(row).toEqual(jasmine.objectContaining({ change: 0, gained: 0, pointsStart: 10 }));
  });

  it('returns nothing for an unknown session', () => {
    expect(toDriverStandings(season2026.driverStandings, -1, directory)).toEqual([]);
  });
});

describe('toTeamStandings', () => {
  it('orders teams and attaches colours from their drivers', () => {
    expect(teams.slice(0, 3).map((t) => [t.name, t.points])).toEqual([
      ['Mercedes', 578],
      ['Ferrari', 444],
      ['McLaren', 339],
    ]);
    expect(teams.every((t) => t.colour?.startsWith('#'))).toBeTrue();
  });
});

describe('toProgression', () => {
  it('gives each driver their points after every scored round, in date order', () => {
    const scored = rounds.filter((r) => r.hasStandings);
    const [ant] = toProgression(season2026.driverStandings, scored, [12]);
    expect(ant.values).toHaveSize(scored.length);
    expect(ant.values.map((v) => v.index)).toEqual(scored.map((_, i) => i));
    const points = ant.values.map((v) => v.points);
    expect(points).toEqual([...points].sort((a, b) => a - b)); // never decreases
    expect(ant.values.at(-1)).toEqual(
      jasmine.objectContaining({ sessionKey: MARINA_BAY, points: 340 }),
    );
  });
});

describe('toTitleMath', () => {
  const remaining = rounds.filter(
    (r) => r.date > rounds.find((x) => x.sessionKey === MARINA_BAY).date,
  );
  const math = toTitleMath(drivers, remaining);

  it('adds up 25 per race and 8 per sprint still to run', () => {
    expect(math.races).toBe(remaining.filter((r) => !r.isSprint).length);
    expect(math.available).toBe(math.races * 25 + math.sprints * 8);
  });

  it('keeps exactly the drivers within reach of the leader', () => {
    expect(math.contenders[0].id).toBe('12');
    expect(math.contenders.every((c) => c.deficit <= math.available)).toBeTrue();
    const out = drivers.filter((d) => 340 - d.points > math.available);
    expect(math.eliminatedCount).toBe(out.length);
    expect(math.decided).toBeFalse();
  });

  it('declares the title decided when nobody can catch the leader', () => {
    const final = toTitleMath(drivers, []);
    expect(final).toEqual(jasmine.objectContaining({ available: 0, decided: true }));
    expect(final.contenders).toHaveSize(1);
  });

  it('counts a tie on maximum points as still alive', () => {
    const rows = [
      { id: 'a', points: 33 },
      { id: 'b', points: 8 },
    ];
    expect(toTitleMath(rows, [{ isSprint: false }]).contenders.map((c) => c.id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('handles empty standings', () => {
    expect(toTitleMath([], [])).toEqual(
      jasmine.objectContaining({ contenders: [], decided: false }),
    );
  });
});

describe('toTeammateBattles', () => {
  const battles = toTeammateBattles(drivers, teams);

  it('pairs each team’s two top scorers, in constructors order', () => {
    expect(battles[0].team).toBe('Mercedes');
    expect(battles[0].drivers.map((d) => d.id)).toEqual(['12', '63']);
    expect(battles[0].margin).toBe(102);
    expect(battles[0].leadShare).toBeCloseTo(340 / 578);
    expect(battles.map((b) => b.team)).toEqual(
      teams.map((t) => t.team).filter((t) => battles.some((b) => b.team === t)),
    );
  });

  it('splits evenly when neither driver has scored', () => {
    const rows = [
      { id: '1', team: 'X', points: 0 },
      { id: '2', team: 'X', points: 0 },
      { id: '3', team: null, points: 4 },
    ];
    expect(toTeammateBattles(rows, [])).toEqual([
      jasmine.objectContaining({ team: 'X', leadShare: 0.5, margin: 0 }),
    ]);
  });
});

describe('toMovers', () => {
  it('lists climbers and fallers, biggest first', () => {
    const { up, down } = toMovers(drivers);
    expect(up.map((m) => m.change).every((c) => c > 0)).toBeTrue();
    expect(down.map((m) => m.change).every((c) => c < 0)).toBeTrue();
    expect(up.map((m) => m.id)).toContain('3');
    expect(down.map((m) => m.id)).toContain('16');
  });
});

describe('toClassification', () => {
  it('puts finishers in order, then retirements, with DSQ/DNS/DNF labels', () => {
    const rows = toClassification(
      [
        { driver_number: 12, position: 2, points: 18, gap_to_leader: 1.2 },
        { driver_number: 63, position: null, dnf: true, number_of_laps: 30 },
        { driver_number: 44, position: 1, points: 25, gap_to_leader: 0 },
        { driver_number: 1, position: 3, dsq: true },
        { driver_number: 99, position: null, dns: true, number_of_laps: 0 },
      ],
      directory,
    );
    expect(rows.map((r) => [r.driver.number, r.status])).toEqual([
      [44, null],
      [12, null],
      [1, 'DSQ'],
      [63, 'DNF'],
      [99, 'DNS'],
    ]);
    expect(rows.at(-1).driver.name).toBe('Driver #99');
  });
});

describe('a completed season (2025)', () => {
  it('ends with the title decided at the final round', () => {
    const r = toRounds(season2025.sessions, season2025.meetings, season2025.driverStandings);
    const scored = r.filter((x) => x.hasStandings);
    const last = scored.at(-1);
    expect(last.location).toBe('Yas Island');
    const standings = toDriverStandings(
      season2025.driverStandings,
      last.sessionKey,
      toDriverDirectory(season2025.drivers),
    );
    expect(toTitleMath(standings, []).decided).toBeTrue();
    expect(standings[0].name).not.toMatch(/^Driver #/);
  });
});
