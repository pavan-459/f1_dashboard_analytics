import { useCallback, useEffect, useMemo, useState } from 'react';
import StandingsChart from './charts/StandingsChart.jsx';
import HeroStats from './components/HeroStats.jsx';
import NextRound from './components/NextRound.jsx';
import Panel from './components/Panel.jsx';
import RacePace from './components/RacePace.jsx';
import RoundRecap from './components/RoundRecap.jsx';
import RoundScrubber from './components/RoundScrubber.jsx';
import StandingsPanel from './components/StandingsPanel.jsx';
import StandingsTable from './components/StandingsTable.jsx';
import TeammateBattles from './components/TeammateBattles.jsx';
import TitleFight from './components/TitleFight.jsx';
import TitleMath from './components/TitleMath.jsx';
import { loadSeason } from './data/championshipSource.js';
import AppShell from './layout/AppShell.jsx';
import PageHeader from './layout/PageHeader.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import CircuitsPage from './pages/CircuitsPage.jsx';
import { useAsync } from './state/useAsync.js';
import { useRoute } from './state/useRoute.js';
import { useSeasonView } from './state/useSeasonView.js';
import { toCalendar } from './transforms/calendar.js';
import { toDriverStandings } from './transforms/championship.js';
import styles from './App.module.css';

const FIRST_SEASON = 2023; // OpenF1 history starts here
const REPLAY_STEP_MS = 1400;
// Pages that show one round of the season (and so get the round scrubber).
const ROUND_PAGES = new Set(['/', '/results', '/standings', '/teams']);

/**
 * @param {{ loader?: typeof loadSeason, now?: Date }} props loader/now are injectable for tests
 */
export default function App({ loader = loadSeason, now: nowProp }) {
  // Pin "now" for the session so derived data (calendar, countdown) isn't rebuilt every render.
  const [now] = useState(() => nowProp ?? new Date());
  const thisYear = now.getFullYear();
  const [route, navigate] = useRoute();
  const year = clampYear(Number(route.params.season), thisYear);
  const selectedKey = route.params.round ? Number(route.params.round) : null;
  const [playing, setPlaying] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const season = useAsync(() => loader(year), [year, loader, attempt]);
  const view = useSeasonView(season.status === 'error' ? null : season.data, selectedKey);
  const scored = useMemo(() => view?.scored ?? [], [view]);
  const currentKey = view?.current?.sessionKey;

  const changeYear = (y) => {
    setPlaying(false);
    navigate(route.path, { season: y });
  };

  // Scrubbing and replay rewrite the URL in place, so Back leaves the page instead of
  // stepping back through every round.
  const showRound = useCallback(
    (key) => navigate(route.path, { season: year, round: key }, { replace: true }),
    [navigate, route.path, year],
  );
  const selectRound = useCallback(
    (key) => {
      setPlaying(false);
      showRound(key);
    },
    [showRound],
  );

  // Season replay: step through every scored round, then stop on the latest.
  useEffect(() => {
    if (!playing) return undefined;
    const i = scored.findIndex((r) => r.sessionKey === currentKey);
    if (i < 0 || i >= scored.length - 1) {
      setPlaying(false);
      return undefined;
    }
    const id = setTimeout(() => showRound(scored[i + 1].sessionKey), REPLAY_STEP_MS);
    return () => clearTimeout(id);
  }, [playing, currentKey, scored, showRound]);

  // Replay only makes sense on round pages.
  useEffect(() => {
    if (!ROUND_PAGES.has(route.path)) setPlaying(false);
  }, [route.path]);

  const togglePlay = () => {
    if (playing) return setPlaying(false);
    if (currentKey === scored.at(-1)?.sessionKey && scored.length > 1) {
      showRound(scored[0].sessionKey);
    }
    setPlaying(true);
  };

  const finalStandings = useMemo(
    () =>
      view && scored.length
        ? toDriverStandings(season.data.driverStandings, scored.at(-1).sessionKey, view.directory)
        : [],
    [view, scored, season.data],
  );
  const weekends = useMemo(
    () => (season.data ? toCalendar(season.data.sessions, season.data.meetings, now) : []),
    [season.data, now],
  );
  const scoredKeys = useMemo(() => new Set(scored.map((r) => r.sessionKey)), [scored]);

  const years = [];
  for (let y = thisYear; y >= FIRST_SEASON; y--) years.push(y);
  const current = view?.current;
  const isFinal = Boolean(current && view.remaining.length === 0);
  const roundLabel = current
    ? `round ${current.round}${current.isSprint ? ' sprint' : ''}, ${current.name}`
    : '';
  const nextRound = view?.rounds.find((r) => new Date(r.date) > now);
  const isRoundPage = ROUND_PAGES.has(route.path);

  let body = null;
  if (season.status === 'loading' && !season.data) {
    body = (
      <div className={styles.loading} role="status">
        <span className={styles.lights} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        Loading the {year} season…
      </div>
    );
  } else if (season.status === 'error') {
    body = (
      <div className={styles.message} role="alert">
        <p>Couldn’t reach OpenF1: {season.error.message}</p>
        <p className={styles.muted}>
          OpenF1 restricts access while a live session is running, and rate-limits bursts. Try again
          in a minute.
        </p>
        <button type="button" className={styles.retry} onClick={() => setAttempt((n) => n + 1)}>
          Retry
        </button>
      </div>
    );
  } else if (view && route.path === '/calendar') {
    body = <CalendarPage year={year} weekends={weekends} scoredKeys={scoredKeys} />;
  } else if (view && route.path === '/circuits') {
    body = <CircuitsPage year={year} weekends={weekends} />;
  } else if (view && !current && season.status === 'ready') {
    body = (
      <div className={styles.message}>
        <p>No championship standings for {year} yet.</p>
        {year > FIRST_SEASON && (
          <button type="button" className={styles.retry} onClick={() => changeYear(year - 1)}>
            View {year - 1}
          </button>
        )}
      </div>
    );
  } else if (view && current) {
    body = (
      <>
        {isRoundPage && (
          <RoundScrubber
            rounds={view.rounds}
            currentKey={currentKey}
            onSelect={selectRound}
            playing={playing}
            onTogglePlay={togglePlay}
          />
        )}
        {route.path === '/' && (
          <>
            {nextRound && <NextRound round={nextRound} now={now} />}
            <HeroStats
              drivers={view.drivers}
              teams={view.teams}
              title={view.title}
              isFinal={isFinal}
            />
            <div className={styles.grid}>
              <div className={styles.wide}>
                <StandingsPanel drivers={view.drivers} teams={view.teams} roundLabel={roundLabel} />
              </div>
              <div className={styles.side}>
                <TitleMath drivers={view.title} teams={view.constructorsTitle} isFinal={isFinal} />
              </div>
              <TitleFight
                rows={season.data.driverStandings}
                scored={scored}
                finalStandings={finalStandings}
                currentIndex={view.currentIndex}
                onSelectRound={selectRound}
              />
            </div>
          </>
        )}
        {route.path === '/results' && (
          <div className={styles.grid}>
            <RoundRecap round={current} directory={view.directory} movers={view.movers} />
            <RacePace round={current} drivers={view.drivers} />
          </div>
        )}
        {route.path === '/standings' && (
          <>
            <PageHeader
              title={`Championship standings ${year}`}
              subtitle={`After ${roundLabel}. ${view.title.contenders.length} drivers can still win the title.`}
            />
            <div className={styles.pair}>
              <Panel kicker="Drivers" title="Drivers' championship">
                <StandingsTable
                  rows={view.drivers}
                  kind="drivers"
                  caption={`Drivers' standings after ${roundLabel}`}
                />
              </Panel>
              <Panel kicker="Constructors" title="Constructors' championship">
                <StandingsTable
                  rows={view.teams}
                  kind="teams"
                  caption={`Constructors' standings after ${roundLabel}`}
                />
              </Panel>
            </div>
          </>
        )}
        {route.path === '/teams' && (
          <>
            <PageHeader
              title={`Teams ${year}`}
              subtitle={`${view.teams.length} constructors. Points after ${roundLabel}, and how each team's drivers compare.`}
            />
            <div className={styles.grid}>
              <Panel kicker="Constructors" title="Constructors' points" className={styles.full}>
                <StandingsChart
                  rows={view.teams}
                  labelWidth={150}
                  ariaLabel={`Constructors' standings after ${roundLabel}. Leader ${view.teams[0]?.name} on ${view.teams[0]?.points} points.`}
                />
              </Panel>
              <TeammateBattles battles={view.battles} />
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <AppShell
      path={route.path}
      linkParams={{ season: year === thisYear ? undefined : year, round: selectedKey ?? undefined }}
      year={year}
      years={years}
      onYearChange={changeYear}
    >
      {body}
    </AppShell>
  );
}

function clampYear(y, thisYear) {
  return Number.isInteger(y) && y >= FIRST_SEASON && y <= thisYear ? y : thisYear;
}
