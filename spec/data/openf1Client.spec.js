import { buildUrl, createClient } from '../../src/data/openf1Client.js';

const json = (status, body) => ({
  ok: status < 400,
  status,
  statusText: '',
  json: async () => body,
});
const noSleep = async () => {};
const clientWith = (...responses) => {
  const fetchImpl = jasmine
    .createSpy('fetch')
    .and.returnValues(...responses.map((r) => Promise.resolve(r)));
  return { fetchImpl, fetchOpenF1: createClient({ fetchImpl, sleep: noSleep }) };
};

describe('buildUrl', () => {
  it('encodes plain params, operator suffixes and repeated keys', () => {
    expect(
      buildUrl('drivers', {
        'session_key>=': 100,
        'session_key<=': 200,
        driver_number: [1, 4],
        skipped: undefined,
      }),
    ).toBe(
      'https://api.openf1.org/v1/drivers?session_key>=100&session_key<=200&driver_number=1&driver_number=4',
    );
  });

  it('omits the query string when there are no params', () => {
    expect(buildUrl('meetings')).toBe('https://api.openf1.org/v1/meetings');
  });

  it('supports strict < and > operators', () => {
    expect(buildUrl('sessions', { 'date_start<': '2026-10-24' })).toBe(
      'https://api.openf1.org/v1/sessions?date_start<2026-10-24',
    );
  });
});

describe('createClient', () => {
  it('treats 404 "No results found" as an empty list', async () => {
    const { fetchOpenF1 } = clientWith(json(404, { detail: 'No results found.' }));
    await expectAsync(fetchOpenF1('laps', { session_key: 1 })).toBeResolvedTo([]);
  });

  it('surfaces the API detail message on other errors', async () => {
    const { fetchOpenF1 } = clientWith(json(401, { detail: 'Live F1 session in progress.' }));
    await expectAsync(fetchOpenF1('laps', { session_key: 1 })).toBeRejectedWithError(
      /Live F1 session/,
    );
  });

  it('retries after a 429 and caches the successful result', async () => {
    const { fetchImpl, fetchOpenF1 } = clientWith(json(429, {}), json(200, [{ ok: 1 }]));
    await expectAsync(fetchOpenF1('stints', { session_key: 1 })).toBeResolvedTo([{ ok: 1 }]);
    await expectAsync(fetchOpenF1('stints', { session_key: 1 })).toBeResolvedTo([{ ok: 1 }]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('gives up after repeated 429s', async () => {
    const { fetchImpl, fetchOpenF1 } = clientWith(json(429, {}), json(429, {}), json(429, {}));
    await expectAsync(fetchOpenF1('stints', { session_key: 1 })).toBeRejectedWithError(/429/);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('backs off longer on each retry', async () => {
    const sleep = jasmine.createSpy('sleep').and.resolveTo();
    const fetchImpl = jasmine
      .createSpy('fetch')
      .and.returnValues(
        Promise.resolve(json(429, {})),
        Promise.resolve(json(429, {})),
        Promise.resolve(json(200, [])),
      );
    await createClient({ fetchImpl, sleep, gapMs: 0 })('laps', { session_key: 1 });
    expect(sleep.calls.allArgs().slice(0, 2)).toEqual([[1200], [2400]]);
  });

  it('does not cache failures', async () => {
    const { fetchOpenF1 } = clientWith(json(500, {}), json(200, [1]));
    await expectAsync(fetchOpenF1('weather', { session_key: 1 })).toBeRejectedWithError(/500/);
    await expectAsync(fetchOpenF1('weather', { session_key: 1 })).toBeResolvedTo([1]);
  });

  it('sends requests one at a time', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const fetchImpl = jasmine.createSpy('fetch').and.callFake(async () => {
      maxInFlight = Math.max(maxInFlight, ++inFlight);
      await Promise.resolve();
      inFlight--;
      return json(200, []);
    });
    const fetchOpenF1 = createClient({ fetchImpl, sleep: noSleep });
    await Promise.all([1, 2, 3].map((k) => fetchOpenF1('laps', { session_key: k })));
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(maxInFlight).toBe(1);
  });
});
