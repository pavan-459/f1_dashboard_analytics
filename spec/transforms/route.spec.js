import { PAGES, parseRoute, toHref } from '../../src/state/useRoute.js';

describe('parseRoute', () => {
  it('reads path and query', () => {
    expect(parseRoute('#/results?season=2025&round=9839')).toEqual({
      path: '/results',
      params: { season: '2025', round: '9839' },
    });
  });

  it('defaults to the dashboard for empty or unknown hashes', () => {
    expect(parseRoute('')).toEqual({ path: '/', params: {} });
    expect(parseRoute('#')).toEqual({ path: '/', params: {} });
    expect(parseRoute('#/nope?season=2024').path).toBe('/');
    expect(parseRoute(undefined).path).toBe('/');
  });
});

describe('toHref', () => {
  it('drops empty params and round-trips through parseRoute', () => {
    const href = toHref('/calendar', { season: 2026, round: null, x: '' });
    expect(href).toBe('#/calendar?season=2026');
    expect(parseRoute(href)).toEqual({ path: '/calendar', params: { season: '2026' } });
  });

  it('omits the query string with no params', () => {
    expect(toHref('/')).toBe('#/');
  });
});

describe('PAGES', () => {
  it('has unique paths, titles and icons', () => {
    expect(new Set(PAGES.map((p) => p.path)).size).toBe(PAGES.length);
    expect(PAGES.every((p) => p.title && p.icon)).toBeTrue();
  });
});
