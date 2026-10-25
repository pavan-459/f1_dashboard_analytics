import { fixture } from '../helpers/fixtures.js';
import { STATUS_LABEL, toCalendar } from '../../src/transforms/calendar.js';

const season = fixture('seasons/2026.json');
const at = (iso) => toCalendar(season.sessions, season.meetings, new Date(iso));

describe('toCalendar', () => {
  const weekends = at('2026-10-20T12:00:00Z');

  it('has one entry per race weekend, testing excluded, in date order', () => {
    expect(weekends).toHaveSize(25);
    expect(weekends.some((w) => /testing/i.test(w.name))).toBeFalse();
    const starts = weekends.map((w) => w.start);
    expect(starts).toEqual([...starts].sort());
  });

  it('keeps cancelled weekends without a round number', () => {
    const cancelled = weekends.filter((w) => w.status === 'cancelled');
    expect(cancelled.map((w) => w.location).sort()).toEqual(['Jeddah', 'Sakhir']);
    expect(cancelled.every((w) => w.round === null)).toBeTrue();
  });

  it('numbers the remaining weekends 1…n in order', () => {
    const rounds = weekends.filter((w) => w.round !== null).map((w) => w.round);
    expect(rounds).toEqual(rounds.map((_, i) => i + 1));
  });

  it('marks finished weekends completed and only the first future one as next', () => {
    const singapore = weekends.find((w) => w.location === 'Marina Bay');
    const austin = weekends.find((w) => w.location === 'Austin');
    expect(singapore.status).toBe('completed');
    expect(austin.status).toBe('next');
    expect(weekends.filter((w) => w.status === 'next')).toHaveSize(1);
    expect(weekends.at(-1).status).toBe('upcoming');
  });

  it('marks a weekend live between its first session and the end of the race', () => {
    const live = at('2026-10-24T12:00:00Z');
    expect(live.find((w) => w.location === 'Austin').status).toBe('live');
    expect(live.filter((w) => w.status === 'next')).toHaveSize(0);
    expect(at('2026-10-26T00:00:00Z').find((w) => w.location === 'Austin').status).toBe(
      'completed',
    );
  });

  it('links race and sprint sessions and circuit details', () => {
    const sprintWeekend = weekends.find((w) => w.sprintKey !== null);
    expect(sprintWeekend.raceKey).not.toBeNull();
    const singapore = weekends.find((w) => w.location === 'Marina Bay');
    expect(singapore).toEqual(
      jasmine.objectContaining({
        name: 'Singapore Grand Prix',
        circuitType: 'Temporary - Street',
        raceKey: 11388,
      }),
    );
    expect(singapore.flag).toMatch(/^https:/);
  });

  it('falls back to session details when a meeting is missing', () => {
    const [w] = toCalendar(
      [
        {
          session_key: 1,
          meeting_key: 7,
          session_name: 'Race',
          location: 'Monza',
          country_name: 'Italy',
          circuit_key: 39,
          circuit_short_name: 'Monza',
          date_start: '2026-09-06T13:00:00Z',
          date_end: '2026-09-06T15:00:00Z',
          is_cancelled: false,
        },
      ],
      [],
      new Date('2026-01-01'),
    );
    expect(w).toEqual(
      jasmine.objectContaining({
        name: 'Monza Grand Prix',
        circuitKey: 39,
        flag: null,
        round: 1,
        status: 'next',
      }),
    );
  });

  it('has a label for every status', () => {
    for (const status of ['completed', 'live', 'next', 'upcoming', 'cancelled']) {
      expect(STATUS_LABEL[status]).toEqual(jasmine.any(String));
    }
  });
});
