import { loadSeason } from '../../src/data/championshipSource.js';

const sessions = [
  { session_key: 300, date_start: '2026-03-01', is_cancelled: false },
  { session_key: 900, date_start: '2026-04-01', is_cancelled: true },
  // Highest key, but an earlier date than session 400 (rescheduled round).
  { session_key: 500, date_start: '2026-05-01', is_cancelled: false },
  { session_key: 400, date_start: '2026-06-01', is_cancelled: false },
];
const standings = [300, 500, 400].flatMap((k) => [
  { session_key: k, driver_number: 1 },
  { session_key: k, driver_number: 22 },
]);
const RANGE = { 'session_key>=': 300, 'session_key<=': 500 }; // cancelled 900 excluded

describe('loadSeason', () => {
  let api;

  beforeEach(() => {
    api = {
      getSessions: jasmine.createSpy('getSessions').and.resolveTo(sessions),
      getMeetings: jasmine.createSpy('getMeetings').and.resolveTo([{ meeting_key: 1 }]),
      getDrivers: jasmine
        .createSpy('getDrivers')
        .and.resolveTo([{ driver_number: 1, last_name: 'NORRIS' }]),
      fetchOpenF1: jasmine.createSpy('fetchOpenF1').and.callFake(async (endpoint) => {
        if (endpoint === 'championship_drivers') return standings;
        if (endpoint === 'championship_teams') return [{ session_key: 400, team_name: 'X' }];
        if (endpoint === 'drivers') return [{ driver_number: 22, last_name: 'TSUNODA' }];
        return [];
      }),
    };
  });

  it('queries standings for the whole season in one range request each', async () => {
    await loadSeason(2026, api);
    expect(api.getSessions).toHaveBeenCalledWith({ year: 2026, session_type: 'Race' });
    expect(api.fetchOpenF1).toHaveBeenCalledWith('championship_drivers', RANGE);
    expect(api.fetchOpenF1).toHaveBeenCalledWith('championship_teams', RANGE);
  });

  it('takes driver details from the latest round by date, not by key', async () => {
    await loadSeason(2026, api);
    expect(api.getDrivers).toHaveBeenCalledOnceWith(400);
  });

  it('looks up drivers missing from that round across the season, oldest records first', async () => {
    const season = await loadSeason(2026, api);
    expect(api.fetchOpenF1).toHaveBeenCalledWith('drivers', { ...RANGE, driver_number: [22] });
    expect(season.drivers.map((d) => d.driver_number)).toEqual([22, 1]);
  });

  it('skips the extra lookup when everyone is present', async () => {
    api.getDrivers.and.resolveTo([{ driver_number: 1 }, { driver_number: 22 }]);
    await loadSeason(2026, api);
    expect(api.fetchOpenF1).not.toHaveBeenCalledWith('drivers', jasmine.anything());
  });

  it('returns empty standings for a season with no races yet', async () => {
    api.getSessions.and.resolveTo([]);
    const season = await loadSeason(2027, api);
    expect(season).toEqual(
      jasmine.objectContaining({ driverStandings: [], teamStandings: [], drivers: [] }),
    );
    expect(api.fetchOpenF1).not.toHaveBeenCalled();
  });

  it('propagates API errors', async () => {
    api.getSessions.and.rejectWith(new Error('Live F1 session in progress.'));
    await expectAsync(loadSeason(2026, api)).toBeRejectedWithError(/Live F1/);
  });
});
