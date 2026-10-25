import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import season2026 from '../fixtures/seasons/2026.json';

vi.mock('../src/data/championshipSource.js', () => ({
  loadSeason: vi.fn(),
  loadSessionResult: vi.fn(async () => [
    {
      driver_number: 12,
      position: 1,
      points: 25,
      gap_to_leader: 0,
      duration: 6120.785,
      number_of_laps: 62,
    },
    { driver_number: 63, position: 2, points: 18, gap_to_leader: 7.3, number_of_laps: 62 },
    { driver_number: 44, position: 3, points: 15, gap_to_leader: 24.5, number_of_laps: 62 },
    { driver_number: 18, position: null, points: 0, dnf: true, number_of_laps: 36 },
  ]),
  loadStints: vi.fn(async () => [
    { driver_number: 12, stint_number: 1, compound: 'MEDIUM', lap_start: 1, lap_end: 30 },
    { driver_number: 12, stint_number: 2, compound: 'SOFT', lap_start: 31, lap_end: 62 },
  ]),
  loadDriverLaps: vi.fn(async (sessionKey, n) =>
    [92.1, 91.4, 90.9, 112.3, 91.2].map((d, i) => ({
      driver_number: n,
      lap_number: i + 1,
      lap_duration: d,
      is_pit_out_lap: i === 3,
    })),
  ),
}));

vi.mock('../src/data/circuitSource.js', async () => {
  const { default: singapore } = await import('../fixtures/circuits/61.json');
  return { loadCircuit: vi.fn(async () => singapore) };
});

const { default: App } = await import('../src/App.jsx');
const source = await import('../src/data/championshipSource.js');
const circuits = await import('../src/data/circuitSource.js');

const NOW = new Date('2026-10-20T12:00:00Z');
const MARINA_BAY = 11388;

const go = (hash) => window.history.replaceState(null, '', hash);
const app = () => render(<App now={NOW} loader={source.loadSeason} />);
const ready = () => screen.findByRole('region', { name: 'Season rounds' });
const nav = () => screen.getByRole('complementary', { name: 'Main navigation' });

beforeEach(() => {
  vi.clearAllMocks();
  go('#/');
  source.loadSeason.mockResolvedValue(season2026);
});

describe('App shell', () => {
  it('shows the start-lights loader, then the dashboard on the latest round by date', async () => {
    app();
    expect(screen.getByRole('status')).toHaveTextContent(/Loading the 2026 season/);
    const summary = await screen.findByRole('region', { name: 'Championship summary' });
    expect(within(summary).getByText('Kimi Antonelli')).toBeInTheDocument();
    expect(within(summary).getByText('340')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByText('Singapore Grand Prix')).toBeInTheDocument();
    expect(source.loadSeason).toHaveBeenCalledWith(2026);
  });

  it('has a sidebar link with a D3 icon for every page, marking the current one', async () => {
    app();
    await ready();
    const links = within(nav()).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual([
      'Dashboard',
      'Results',
      'Standings',
      'Calendar',
      'Circuits',
      'Teams',
    ]);
    expect(links.every((l) => l.querySelector('svg[data-icon] path'))).toBe(true);
    expect(within(nav()).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('navigates between pages through the sidebar', async () => {
    const user = userEvent.setup();
    app();
    await ready();
    await user.click(within(nav()).getByRole('link', { name: 'Results' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Results' })).toBeInTheDocument();
    expect(within(nav()).getByRole('link', { name: 'Results' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('collapses the sidebar to icons and remembers it', async () => {
    const user = userEvent.setup();
    app();
    await ready();
    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(localStorage.getItem('pitwall-sidebar-collapsed')).toBe('1');
    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }));
  });

  it('opens and closes the mobile drawer', async () => {
    const user = userEvent.setup();
    app();
    await ready();
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('loads the season and round from the URL', async () => {
    go('#/results?season=2026&round=11383');
    app();
    expect(
      await screen.findByRole('heading', { name: /Singapore Grand Prix Sprint/ }),
    ).toBeInTheDocument();
  });

  it('writes the selected round into the URL', async () => {
    const user = userEvent.setup();
    app();
    await ready();
    await user.click(screen.getByRole('button', { name: 'Previous round' }));
    expect(window.location.hash).toBe('#/?season=2026&round=11383');
    const summary = screen.getByRole('region', { name: 'Championship summary' });
    expect(within(summary).getByText('325')).toBeInTheDocument();
  });

  it('switches season from the top bar', async () => {
    const user = userEvent.setup();
    app();
    await ready();
    await user.selectOptions(screen.getByRole('combobox', { name: /Season/ }), '2025');
    expect(window.location.hash).toBe('#/?season=2025');
    await waitFor(() => expect(source.loadSeason).toHaveBeenCalledWith(2025));
  });

  it('shows an error with retry when OpenF1 is unreachable', async () => {
    source.loadSeason.mockRejectedValueOnce(new Error('Live F1 session in progress.'));
    const user = userEvent.setup();
    app();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Live F1 session in progress/);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('region', { name: 'Championship summary' })).toBeInTheDocument();
  });

  it('offers the previous season when the selected one has no standings', async () => {
    source.loadSeason.mockResolvedValueOnce({
      ...season2026,
      driverStandings: [],
      teamStandings: [],
    });
    app();
    expect(await screen.findByText('No championship standings for 2026 yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View 2025' })).toBeInTheDocument();
  });
});

describe('Dashboard page', () => {
  it('renders the summary, standings, title math and title fight', async () => {
    app();
    await ready();
    for (const name of [
      "Drivers' standings",
      'Who can still win?',
      'Points race, round by round',
    ]) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('complementary', { name: 'Next session' })).toHaveTextContent(
      /United States Grand Prix/,
    );
  });

  it('switches standings between drivers and teams, chart and table', async () => {
    const user = userEvent.setup();
    app();
    const panel = await screen.findByRole('region', { name: "Drivers' standings" });
    await user.click(within(panel).getByRole('button', { name: 'Table' }));
    expect(within(panel).getByRole('table')).toHaveTextContent('Kimi Antonelli');
    await user.click(within(panel).getByRole('button', { name: 'Teams' }));
    const teams = screen.getByRole('region', { name: "Constructors' standings" });
    expect(within(teams).getByRole('rowheader', { name: /Mercedes/ })).toBeInTheDocument();
  });

  it('replays the season from round 1 and can be paused', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      app();
      await ready();
      await user.click(screen.getByRole('button', { name: 'Replay the season' }));
      expect(screen.getByText('Australian Grand Prix')).toBeInTheDocument();
      await act(() => vi.advanceTimersByTimeAsync(1500));
      expect(screen.getByText('Chinese Grand Prix')).toBeInTheDocument();
      expect(window.location.hash).toMatch(/round=/);
      await user.click(screen.getByRole('button', { name: 'Pause season replay' }));
      expect(screen.getByRole('button', { name: 'Replay the season' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Results page', () => {
  beforeEach(() => go(`#/results?round=${MARINA_BAY}`));

  it('shows the podium and the timing tower with tyre stints', async () => {
    app();
    const podium = await screen.findByRole('list', { name: 'Podium' });
    expect(within(podium).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByLabelText('medium 30 laps, then soft 32 laps')).toBeInTheDocument();
    expect(screen.getByText('DNF', { selector: 'td' })).toBeInTheDocument();
  });

  it('shows race pace for the leader with slow laps hidden', async () => {
    app();
    const pace = await screen.findByRole('region', { name: 'Lap times' });
    await waitFor(() =>
      expect(within(pace).getByRole('img', { name: /Kimi Antonelli, 4 laps/ })).toBeInTheDocument(),
    );
    expect(within(pace).getByText(/Hiding 1 slow lap/)).toBeInTheDocument();
    expect(within(pace).getByText('1:30.900')).toBeInTheDocument();
  });
});

describe('Standings page', () => {
  it('shows full drivers and constructors tables', async () => {
    go('#/standings');
    app();
    expect(
      await screen.findByRole('heading', { name: 'Championship standings 2026' }),
    ).toBeInTheDocument();
    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(2);
    expect(within(tables[0]).getAllByRole('row')).toHaveLength(1 + 23);
    expect(within(tables[1]).getAllByRole('row')).toHaveLength(1 + 11);
  });
});

describe('Teams page', () => {
  it('shows constructors points and teammate battles', async () => {
    go('#/teams');
    app();
    expect(await screen.findByRole('heading', { name: 'Teams 2026' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Constructors' standings/ })).toBeInTheDocument();
    const battles = screen.getByRole('region', { name: 'Teammate battles' });
    expect(within(battles).getByText('Mercedes')).toBeInTheDocument();
  });
});

describe('Calendar page', () => {
  it('lists every weekend with status, and links completed rounds to results', async () => {
    go('#/calendar');
    app();
    expect(
      await screen.findByRole('heading', { name: 'Formula 1 Calendar 2026' }),
    ).toBeInTheDocument();
    const cards = screen.getAllByRole('listitem');
    expect(cards).toHaveLength(25);
    const singapore = cards.find((c) => within(c).queryByText('Singapore Grand Prix'));
    expect(within(singapore).getByText(/Completed/)).toBeInTheDocument();
    expect(within(singapore).getByRole('link', { name: 'Results →' })).toHaveAttribute(
      'href',
      `#/results?season=2026&round=${MARINA_BAY}`,
    );
    const austin = cards.find((c) => within(c).queryByText('United States Grand Prix'));
    expect(within(austin).getByText(/Next up/)).toBeInTheDocument();
    expect(cards.filter((c) => within(c).queryByText(/Cancelled/))).toHaveLength(2);
  });
});

describe('Circuits page', () => {
  it('draws a track map with corners for each circuit and splits out cancelled venues', async () => {
    go('#/circuits');
    app();
    expect(
      await screen.findByRole('heading', { name: 'Formula 1 Circuits 2026' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cancelled this season' })).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getAllByRole('img', { name: /with 19 numbered corners/ }).length,
      ).toBeGreaterThan(0),
    );
    expect(circuits.loadCircuit).toHaveBeenCalledWith(61, 2026);
    expect(screen.getAllByText('≈4.84 km').length).toBeGreaterThan(0);
  });
});
