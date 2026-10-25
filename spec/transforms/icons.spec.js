import { ICONS } from '../../src/icons/geometry.js';

const numbers = (d) => (d.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);

describe('D3 icon geometry', () => {
  for (const [name, parts] of Object.entries(ICONS)) {
    describe(name, () => {
      it('has at least one part with a valid stroke/fill mode', () => {
        expect(parts.length).toBeGreaterThan(0);
        for (const p of parts) expect(['stroke', 'fill']).toContain(p.mode);
      });

      it('has path data that starts with a move and contains no NaN', () => {
        for (const p of parts) {
          expect(p.d).toMatch(/^M/);
          expect(p.d).not.toMatch(/NaN|undefined/);
        }
      });

      it('stays on the 24×24 grid', () => {
        for (const p of parts) {
          if (p.at) {
            // Origin-centred arc: every coordinate lies within its radius of the placed centre.
            const [cx, cy] = p.at;
            const reach = Math.max(...numbers(p.d).map(Math.abs));
            expect(cx - reach).toBeGreaterThanOrEqual(-0.5);
            expect(cx + reach).toBeLessThanOrEqual(24.5);
            expect(cy - reach).toBeGreaterThanOrEqual(-0.5);
            expect(cy + reach).toBeLessThanOrEqual(24.5);
          } else {
            for (const n of numbers(p.d)) {
              expect(n).toBeGreaterThanOrEqual(-0.5);
              expect(n).toBeLessThanOrEqual(24.5);
            }
          }
        }
      });
    });
  }

  it('includes every icon the sidebar uses', () => {
    for (const name of [
      'dashboard',
      'results',
      'standings',
      'calendar',
      'circuits',
      'teams',
      'collapse',
      'expand',
      'menu',
      'close',
    ]) {
      expect(ICONS[name]).toBeDefined();
    }
  });
});
