// Burst behaviour of the OpenF1 client against a fake API. The free tier allows ~3 req/s,
// so under load the client must dedupe, serialise and space requests — never fan out.
import { createClient } from '../../src/data/openf1Client.js';

const json = (status, body) => ({
  ok: status < 400,
  status,
  statusText: '',
  json: async () => body,
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('OpenF1 client under a burst', () => {
  it('collapses 500 concurrent calls for 25 URLs into 25 serialised, spaced requests', async () => {
    const GAP = 5;
    const starts = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchImpl = jasmine.createSpy('fetch').and.callFake(async () => {
      starts.push(performance.now());
      maxInFlight = Math.max(maxInFlight, ++inFlight);
      await sleep(1); // network latency
      inFlight--;
      return json(200, [{ ok: true }]);
    });
    const api = createClient({ fetchImpl, gapMs: GAP });

    const calls = Array.from({ length: 500 }, (_, i) => api('laps', { session_key: i % 25 }));
    const results = await Promise.all(calls);

    expect(results.every((r) => r[0].ok)).toBeTrue();
    expect(fetchImpl).toHaveBeenCalledTimes(25);
    expect(maxInFlight).toBe(1);
    const gaps = starts.slice(1).map((t, i) => t - starts[i]);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(GAP - 1); // timer jitter
  });

  it('keeps the queue moving when some requests fail or are rate limited', async () => {
    let n = 0;
    const fetchImpl = jasmine.createSpy('fetch').and.callFake(async () => {
      n++;
      if (n % 7 === 0) return json(500, {});
      if (n % 5 === 0) return json(429, {});
      return json(200, []);
    });
    const api = createClient({ fetchImpl, gapMs: 0, sleep: async () => {} });
    const settled = await Promise.allSettled(
      Array.from({ length: 100 }, (_, i) => api('stints', { session_key: i })),
    );
    const ok = settled.filter((s) => s.status === 'fulfilled').length;
    expect(ok + settled.filter((s) => s.status === 'rejected').length).toBe(100);
    expect(ok).toBeGreaterThan(80);
  });

  it('a whole season loads in a bounded number of requests', async () => {
    // Mirrors loadSeason: sessions, meetings, 2 range queries, drivers, +1 missing lookup.
    const { loadSeason } = await import('../../src/data/championshipSource.js');
    let count = 0;
    const counted = (value) => async () => {
      count++;
      return value;
    };
    const sessions = Array.from({ length: 30 }, (_, i) => ({
      session_key: 1000 + i,
      date_start: `2026-01-${String(i + 1).padStart(2, '0')}`,
      is_cancelled: false,
    }));
    const standings = sessions.flatMap((s) =>
      Array.from({ length: 22 }, (_, d) => ({ session_key: s.session_key, driver_number: d + 1 })),
    );
    await loadSeason(2026, {
      getSessions: counted(sessions),
      getMeetings: counted([]),
      getDrivers: counted([{ driver_number: 1 }]),
      fetchOpenF1: async (endpoint) => {
        count++;
        if (endpoint === 'championship_drivers') return standings;
        return [];
      },
    });
    expect(count).toBeLessThanOrEqual(6);
  });
});
