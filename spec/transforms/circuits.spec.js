import { fixture } from '../helpers/fixtures.js';
import {
  circuitTypeLabel,
  toCircuitList,
  toTrackOutline,
  trackLengthKm,
} from '../../src/transforms/circuits.js';

const singapore = fixture('circuits/61.json');
const suzuka = fixture('circuits/46.json');
const BOX = { width: 320, height: 200, padding: 10 };

describe('toTrackOutline', () => {
  const outline = toTrackOutline(singapore, BOX);

  it('keeps every outline point and corner', () => {
    expect(outline.points).toHaveSize(singapore.x.length);
    expect(outline.corners).toHaveSize(19);
    expect(outline.corners[0].number).toBe(1);
    expect(outline.start).toEqual(outline.points[0]);
  });

  it('fits inside the padded box and touches it on at least one axis', () => {
    const xs = outline.points.map((p) => p[0]);
    const ys = outline.points.map((p) => p[1]);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(9.9);
    expect(Math.max(...xs)).toBeLessThanOrEqual(310.1);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(9.9);
    expect(Math.max(...ys)).toBeLessThanOrEqual(190.1);
    const spanX = Math.max(...xs) - Math.min(...xs);
    const spanY = Math.max(...ys) - Math.min(...ys);
    expect(Math.max(spanX / 300, spanY / 180)).toBeCloseTo(1, 1);
  });

  it('centres the outline in the box', () => {
    const xs = outline.points.map((p) => p[0]);
    const ys = outline.points.map((p) => p[1]);
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(160, 0);
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(100, 0);
  });

  it('places corners on the track (near some outline point)', () => {
    for (const c of outline.corners) {
      const nearest = Math.min(...outline.points.map(([x, y]) => Math.hypot(x - c.x, y - c.y)));
      expect(nearest).toBeLessThan(6);
    }
  });

  it('applies the rotation (a 90° turn swaps the aspect)', () => {
    const plain = toTrackOutline({ ...suzuka, rotation: 0 }, BOX);
    const turned = toTrackOutline({ ...suzuka, rotation: 90 }, BOX);
    const aspect = (o) => {
      const xs = o.points.map((p) => p[0]);
      const ys = o.points.map((p) => p[1]);
      return (Math.max(...xs) - Math.min(...xs)) / (Math.max(...ys) - Math.min(...ys));
    };
    expect(aspect(plain) > 1).not.toBe(aspect(turned) > 1);
  });

  it('returns an empty outline for missing data (404 → [])', () => {
    expect(toTrackOutline(null, BOX)).toEqual({ points: [], corners: [], start: null });
    expect(toTrackOutline([], BOX).points).toEqual([]);
    expect(toTrackOutline({ x: [1], y: [1] }, BOX).points).toEqual([]);
  });
});

describe('trackLengthKm', () => {
  it('estimates lap length within ~3% of the official figure', () => {
    expect(Math.abs(trackLengthKm(singapore) - 4.94) / 4.94).toBeLessThan(0.03);
    expect(Math.abs(trackLengthKm(suzuka) - 5.807) / 5.807).toBeLessThan(0.03);
  });

  it('is null without an outline', () => {
    expect(trackLengthKm(undefined)).toBeNull();
    expect(trackLengthKm({ x: [0], y: [0] })).toBeNull();
  });
});

describe('circuitTypeLabel', () => {
  for (const [input, label] of [
    ['Temporary - Street', 'Street circuit'],
    ['Permanent', 'Permanent circuit'],
    ['Temporary - Road', 'Temporary - Road'],
    [null, 'Circuit'],
  ]) {
    it(`${input} → ${label}`, () => expect(circuitTypeLabel(input)).toBe(label));
  }
});

describe('toCircuitList', () => {
  it('keeps the first weekend per circuit and skips unknown circuits', () => {
    const list = toCircuitList([
      { meetingKey: 1, circuitKey: 10 },
      { meetingKey: 2, circuitKey: 20 },
      { meetingKey: 3, circuitKey: 10 },
      { meetingKey: 4, circuitKey: null },
    ]);
    expect(list.map((w) => w.meetingKey)).toEqual([1, 2]);
  });
});
