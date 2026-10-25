// The exact OpenF1 URLs the app requests — the contract with the API.
import * as client from '../../src/data/openf1Client.js';
import {
  loadDriverLaps,
  loadSessionResult,
  loadStints,
} from '../../src/data/championshipSource.js';

const BASE = 'https://api.openf1.org/v1';

describe('OpenF1 endpoint wrappers', () => {
  let urls;

  beforeAll(async () => {
    spyOn(globalThis, 'fetch').and.callFake(async () => ({
      ok: true,
      status: 200,
      json: async () => [],
    }));
    // The shared client spaces requests ~350ms apart, so fire everything at once.
    await Promise.all([
      client.getSessions({ year: 2026, session_type: 'Race' }),
      client.getMeetings({ year: 2026 }),
      client.getDrivers(11),
      client.getLaps(12, 4),
      client.getIntervals(13),
      client.getStints(14),
      client.getPosition(15),
      client.getChampionshipDrivers(16),
      client.getChampionshipTeams(17),
      loadSessionResult(18),
      loadDriverLaps(19, 63),
      loadStints(20),
    ]);
    urls = globalThis.fetch.calls.allArgs().map(([u]) => u);
  }, 15000);

  for (const [name, url] of [
    ['sessions', `${BASE}/sessions?year=2026&session_type=Race`],
    ['meetings', `${BASE}/meetings?year=2026`],
    ['drivers', `${BASE}/drivers?session_key=11`],
    ['laps', `${BASE}/laps?session_key=12&driver_number=4`],
    ['intervals', `${BASE}/intervals?session_key=13`],
    ['stints', `${BASE}/stints?session_key=14`],
    ['position', `${BASE}/position?session_key=15`],
    ['championship_drivers', `${BASE}/championship_drivers?session_key=16`],
    ['championship_teams', `${BASE}/championship_teams?session_key=17`],
    ['session_result (loadSessionResult)', `${BASE}/session_result?session_key=18`],
    ['laps (loadDriverLaps)', `${BASE}/laps?session_key=19&driver_number=63`],
    ['stints (loadStints)', `${BASE}/stints?session_key=20`],
  ]) {
    it(`requests ${name}`, () => expect(urls).toContain(url));
  }

  it('omits driver_number from laps when no driver is given', async () => {
    await client.getLaps(99);
    expect(globalThis.fetch).toHaveBeenCalledWith(`${BASE}/laps?session_key=99`);
  });
});
