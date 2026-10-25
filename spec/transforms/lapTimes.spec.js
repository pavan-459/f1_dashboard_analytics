import { fixture } from '../helpers/fixtures.js';
import {
  lapSummary,
  medianLap,
  toLapTimes,
  withoutSlowLaps,
} from '../../src/transforms/lapTimes.js';

const session = fixture('sessions/latest.json');
const lap = (overrides) => ({
  driver_number: 1,
  lap_number: 1,
  lap_duration: 90.123,
  is_pit_out_lap: false,
  ...overrides,
});

describe('toLapTimes', () => {
  it('maps raw laps to { driver, lap, seconds, isPitOutLap }', () => {
    expect(toLapTimes([lap({ lap_number: 3, is_pit_out_lap: true })])).toEqual([
      { driver: 1, lap: 3, seconds: 90.123, isPitOutLap: true },
    ]);
  });

  it('returns an empty array for no laps', () => {
    expect(toLapTimes([])).toEqual([]);
  });

  it('filters to one driver when driverNumber is given', () => {
    const laps = [lap({ driver_number: 1 }), lap({ driver_number: 16 })];
    expect(toLapTimes(laps, { driverNumber: 16 }).map((d) => d.driver)).toEqual([16]);
  });

  it('drops laps with null, missing, zero or non-numeric durations', () => {
    const laps = [
      lap({ lap_number: 1, lap_duration: null }),
      lap({ lap_number: 2, lap_duration: undefined }),
      lap({ lap_number: 3, lap_duration: 0 }),
      lap({ lap_number: 4, lap_duration: '91.0' }),
      lap({ lap_number: 5 }),
    ];
    expect(toLapTimes(laps).map((d) => d.lap)).toEqual([5]);
  });

  it('sorts by driver then lap regardless of input order', () => {
    const laps = [
      lap({ driver_number: 16, lap_number: 2 }),
      lap({ driver_number: 1, lap_number: 2 }),
      lap({ driver_number: 16, lap_number: 1 }),
      lap({ driver_number: 1, lap_number: 1 }),
    ];
    expect(toLapTimes(laps).map((d) => [d.driver, d.lap])).toEqual([
      [1, 1],
      [1, 2],
      [16, 1],
      [16, 2],
    ]);
  });

  it('treats a missing is_pit_out_lap as false', () => {
    expect(toLapTimes([lap({ is_pit_out_lap: undefined })])[0].isPitOutLap).toBeFalse();
  });

  it('handles the recorded fixture: one pit-out lap, gaps for missing timing', () => {
    const ham = toLapTimes(session.laps, { driverNumber: 44 });
    const rawHam = session.laps.filter((l) => l.driver_number === 44);
    const missing = rawHam.filter((l) => l.lap_duration === null).length;
    expect(missing).toBeGreaterThan(0);
    expect(ham).toHaveSize(rawHam.length - missing);
    expect(ham.filter((d) => d.isPitOutLap)).toHaveSize(1);
    expect(ham.every((d) => d.seconds > 60 && d.seconds < 200)).toBeTrue();
  });
});

describe('medianLap / withoutSlowLaps / lapSummary', () => {
  const laps = [90, 91, 92, 93, 120, 89].map((seconds, i) => ({
    driver: 1,
    lap: i + 1,
    seconds,
    isPitOutLap: false,
  }));

  it('finds the median for odd and even counts, null when empty', () => {
    expect(medianLap(laps)).toBe(91.5);
    expect(medianLap(laps.slice(0, 3))).toBe(91);
    expect(medianLap([])).toBeNull();
  });

  it('drops laps over 107% of the median', () => {
    expect(withoutSlowLaps(laps).map((l) => l.seconds)).toEqual([90, 91, 92, 93, 89]);
    expect(withoutSlowLaps(laps, 2)).toHaveSize(6);
    expect(withoutSlowLaps([])).toEqual([]);
  });

  it('summarises best lap, median and count', () => {
    expect(lapSummary(laps)).toEqual(
      jasmine.objectContaining({
        best: jasmine.objectContaining({ lap: 6, seconds: 89 }),
        median: 91.5,
        count: 6,
      }),
    );
    expect(lapSummary([])).toEqual({ best: null, median: null, count: 0 });
  });
});
