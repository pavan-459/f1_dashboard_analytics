import { compoundLetter, toStintsByDriver } from '../../src/transforms/stints.js';

describe('toStintsByDriver', () => {
  it('groups by driver, orders by stint and counts laps', () => {
    const byDriver = toStintsByDriver([
      {
        driver_number: 1,
        stint_number: 2,
        compound: 'HARD',
        lap_start: 21,
        lap_end: 57,
        tyre_age_at_start: 0,
      },
      {
        driver_number: 1,
        stint_number: 1,
        compound: 'MEDIUM',
        lap_start: 1,
        lap_end: 20,
        tyre_age_at_start: 3,
      },
      { driver_number: 4, stint_number: 1, compound: 'SOFT', lap_start: 1, lap_end: null },
    ]);
    expect(byDriver.get(1)).toEqual([
      { stint: 1, compound: 'MEDIUM', lapStart: 1, lapEnd: 20, laps: 20, used: true },
      { stint: 2, compound: 'HARD', lapStart: 21, lapEnd: 57, laps: 37, used: false },
    ]);
    expect(byDriver.get(4)[0]).toEqual(
      jasmine.objectContaining({ lapEnd: null, laps: 0, used: false }),
    );
  });

  it('maps unexpected compounds to UNKNOWN', () => {
    const byDriver = toStintsByDriver([
      { driver_number: 1, stint_number: 1, compound: 'TEST_UNKNOWN', lap_start: 1, lap_end: 2 },
      { driver_number: 1, stint_number: 2, compound: null, lap_start: 3, lap_end: 4 },
    ]);
    expect(byDriver.get(1).map((s) => s.compound)).toEqual(['UNKNOWN', 'UNKNOWN']);
  });

  it('returns an empty map for no stints', () => {
    expect(toStintsByDriver([]).size).toBe(0);
  });
});

describe('compoundLetter', () => {
  for (const [c, l] of [
    ['SOFT', 'S'],
    ['MEDIUM', 'M'],
    ['HARD', 'H'],
    ['INTERMEDIATE', 'I'],
    ['WET', 'W'],
    ['UNKNOWN', '?'],
  ]) {
    it(`${c} → ${l}`, () => expect(compoundLetter(c)).toBe(l));
  }
});
