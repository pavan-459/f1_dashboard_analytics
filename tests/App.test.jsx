import { render, screen, waitFor, within } from '@testing-library/react';
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

const { default: App } = await import('../src/App.jsx');
const source = await import('../src/data/championshipSource.js');

const NOW = new Date('2026-10-20T12:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  source.loadSeason.mockResolvedValue(season2026);
});

describe('App', () => {
  it('shows the start-lights loader, then the latest round by date', async () => {
    render(<App now={NOW} loader={source.loadSeason} />);
    expect(screen.getByRole('status')).toHaveTextContent(/Loading the 2026 season/);
    const summary = await screen.findByRole('region', { name: 'Championship summary' });
    expect(within(summary).getByText('Kimi Antonelli')).toBeInTheDocument();
    expect(within(summary).getByText('340')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Singapore Grand Prix/ })).toBeInTheDocument();
    expect(source.loadSeason).toHaveBeenCalledWith(2026);
  });

  it('renders every dashboard section', async () => {
    render(<App now={NOW} loader={source.loadSeason} />);
    await screen.findByRole('region', { name: 'Championship summary' });
    for (const name of [
      "Drivers' standings",
      'Who can still win?',
      'Points race, round by round',
      'Teammate battles',
      'Lap times',
    ]) {
      expect(screen.getByRole('region', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('complementary', { name: 'Next session' })).toHaveTextContent(
      /United States Grand Prix/,
    );
  });

  it('loads the podium and timing tower with tyre stints for the selected round', async () => {
    render(<App now={NOW} loader={source.loadSeason} />);
    const podium = await screen.findByRole('list', { name: 'Podium' });
    expect(within(podium).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByLabelText('medium 30 laps, then soft 32 laps')).toBeInTheDocument();
    expect(screen.getByText('DNF', { selector: 'td' })).toBeInTheDocument();
  });

  it('switches standings between drivers and teams, chart and table', async () => {
    const user = userEvent.setup();
    render(<App now={NOW} loader={source.loadSeason} />);
    const panel = await screen.findByRole('region', { name: "Drivers' standings" });
    await user.click(within(panel).getByRole('button', { name: 'Table' }));
    expect(within(panel).getByRole('table')).toHaveTextContent('Kimi Antonelli');
    await user.click(within(panel).getByRole('button', { name: 'Teams' }));
    const teams = screen.getByRole('region', { name: "Constructors' standings" });
    expect(within(teams).getByRole('rowheader', { name: /Mercedes/ })).toBeInTheDocument();
  });

  it('steps back a round with the scrubber and updates the standings', async () => {
    const user = userEvent.setup();
    render(<App now={NOW} loader={source.loadSeason} />);
    await screen.findByRole('region', { name: 'Championship summary' });
    await user.click(screen.getByRole('button', { name: 'Previous round' }));
    expect(
      screen.getByRole('heading', { name: /Singapore Grand Prix Sprint/ }),
    ).toBeInTheDocument();
    const summary = screen.getByRole('region', { name: 'Championship summary' });
    expect(within(summary).getByText('325')).toBeInTheDocument();
  });

  it('replays the season from the first round when play is pressed at the end', async () => {
    const user = userEvent.setup();
    render(<App now={NOW} loader={source.loadSeason} />);
    await screen.findByRole('region', { name: 'Championship summary' });
    await user.click(screen.getByRole('button', { name: 'Replay the season' }));
    expect(screen.getByRole('button', { name: 'Pause season replay' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('heading', { name: /Australian Grand Prix/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pause season replay' }));
    expect(screen.getByRole('button', { name: 'Replay the season' })).toBeInTheDocument();
  });

  it('shows race pace for the leader with slow laps hidden', async () => {
    render(<App now={NOW} loader={source.loadSeason} />);
    const pace = await screen.findByRole('region', { name: 'Lap times' });
    await waitFor(() =>
      expect(within(pace).getByRole('img', { name: /Kimi Antonelli, 4 laps/ })).toBeInTheDocument(),
    );
    expect(within(pace).getByText(/Hiding 1 slow lap/)).toBeInTheDocument();
    expect(within(pace).getByText('1:30.900')).toBeInTheDocument();
  });

  it('shows an error with retry when OpenF1 is unreachable', async () => {
    source.loadSeason.mockRejectedValueOnce(new Error('Live F1 session in progress.'));
    const user = userEvent.setup();
    render(<App now={NOW} loader={source.loadSeason} />);
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
    render(<App now={NOW} loader={source.loadSeason} />);
    expect(await screen.findByText('No championship standings for 2026 yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View 2025' })).toBeInTheDocument();
  });
});
