import {
  formatDuration,
  formatGap,
  formatLapTime,
  formatPoints,
  formatSigned,
  ordinal,
  teamColourVar,
} from '../../src/transforms/format.js';

const table = (fn, cases) => {
  for (const [input, expected] of cases) {
    it(`${String(input)} → ${expected}`, () => expect(fn(input)).toBe(expected));
  }
};

describe('formatLapTime', () => {
  table(formatLapTime, [
    [92.456, '1:32.456'],
    [60, '1:00.000'],
    [81.0049, '1:21.005'],
    [59.9996, '1:00.000'],
    [125.1, '2:05.100'],
    [9.87, '9.870'],
    [0, '0.000'],
  ]);

  for (const bad of [null, undefined, NaN, Infinity, -1, '90']) {
    it(`returns a dash for ${String(bad)}`, () => expect(formatLapTime(bad)).toBe('—'));
  }
});

describe('teamColourVar', () => {
  it('maps a team name to its token with a default fallback', () => {
    expect(teamColourVar('Red Bull Racing')).toBe(
      'var(--team-red-bull-racing, var(--color-series-default))',
    );
    expect(teamColourVar('Haas F1 Team')).toBe(
      'var(--team-haas-f1-team, var(--color-series-default))',
    );
  });

  it('falls back to the default colour for empty or missing names', () => {
    expect(teamColourVar(undefined)).toBe('var(--color-series-default)');
    expect(teamColourVar('  ')).toBe('var(--color-series-default)');
  });
});

describe('formatPoints', () => {
  table(formatPoints, [
    [340, '340'],
    [12.5, '12.5'],
    [null, '—'],
  ]);
});

describe('formatSigned', () => {
  table(formatSigned, [
    [15, '+15'],
    [-3, '−3'],
    [0, '0'],
    [NaN, '0'],
  ]);
});

describe('formatGap', () => {
  table(formatGap, [
    [0, 'Winner'],
    [12.3456, '+12.346s'],
    ['+1 LAP', '+1 LAP'],
    ['2 LAPS', '+2 LAPS'],
    [null, '—'],
  ]);
});

describe('formatDuration', () => {
  table(formatDuration, [
    [6120.785, '1:42:00.785'],
    [3605, '1:00:05.000'],
    [3601.5, '1:00:01.500'],
    [59.5, '59.500'],
    [null, '—'],
    [-1, '—'],
  ]);
});

describe('ordinal', () => {
  table(ordinal, [
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [101, '101st'],
  ]);
});
