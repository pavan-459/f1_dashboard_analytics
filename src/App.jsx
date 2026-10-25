import { useCallback, useEffect, useMemo, useState } from 'react';
import HeroStats from './components/HeroStats.jsx';
import NextRound from './components/NextRound.jsx';
import RacePace from './components/RacePace.jsx';
import RoundRecap from './components/RoundRecap.jsx';
import RoundScrubber from './components/RoundScrubber.jsx';
import StandingsPanel from './components/StandingsPanel.jsx';
import TeammateBattles from './components/TeammateBattles.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import TitleFight from './components/TitleFight.jsx';
import TitleMath from './components/TitleMath.jsx';
import { loadSeason } from './data/championshipSource.js';
import { useAsync } from './state/useAsync.js';
import { useSeasonView } from './state/useSeasonView.js';
import { toDriverStandings } from './transforms/championship.js';
import styles from './App.module.css';

const FIRST_SEASON = 2023; // OpenF1 history starts here
const REPLAY_STEP_MS = 1400;

/**
 * @param {{ loader?: typeof loadSeason, now?: Date }} props loader/now are injectable for tests
 */
export default function App({ loader = loadSeason, now = new Date() }) {
  const thisYear = now.getFullYear();
  const [year, setYear] = useState(thisYear);
  const [selectedKey, setSelectedKey] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const season = useAsync(() => loader(year), [year, loader, attempt]);
  const view = useSeasonView(season.status === 'error' ? null : season.data, selectedKey);
  const scored = useMemo(() => view?.scored ?? [], [view]);
  const currentKey = view?.current?.sessionKey;

  const changeYear = (y) => {
    setPlaying(false);
    setSelectedKey(null);
    setYear(y);
  };

  // Season replay: step through every scored round, then stop on the latest.
  useEffect(() => {
    if (!playing) return undefined;
    const i = scored.findIndex((r) => r.sessionKey === currentKey);
    if (i < 0 || i >= scored.length - 1) {
      setPlaying(false);
      return undefined;
    }
    const id = setTimeout(() => setSelectedKey(scored[i + 1].sessionKey), REPLAY_STEP_MS);
    return () => clearTimeout(id);
  }, [playing, currentKey, scored]);

  const togglePlay = () => {
    if (playing) return setPlaying(false);
    if (currentKey === scored.at(-1)?.sessionKey && scored.length > 1) {
      setSelectedKey(scored[0].sessionKey);
    }
    setPlaying(true);
  };

  const selectRound = useCallback((key) => {
    setPlaying(false);
    setSelectedKey(key);
  }, []);

  const finalStandings = useMemo(
    () =>
      view && scored.length
        ? toDriverStandings(season.data.driverStandings, scored.at(-1).sessionKey, view.directory)
        : [],
    [view, scored, season.data],
  );

  const years = [];
  for (let y = thisYear; y >= FIRST_SEASON; y--) years.push(y);
  const current = view?.current;
  const isFinal = Boolean(current && view.remaining.length === 0);
  const roundLabel = current
    ? `round ${current.round}${current.isSprint ? ' sprint' : ''}, ${current.name}`
    : '';
  const nextRound = view?.rounds.find((r) => new Date(r.date) > now);

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logo} aria-hidden="true" />
          <div>
            <h1 className={styles.title}>Pit Wall</h1>
            <p className={styles.tagline}>F1 championship dashboard · live from OpenF1</p>
          </div>
        </div>
        <div className={styles.headerControls}>
          <label className={styles.season}>
            <span>Season</span>
            <select value={year} onChange={(e) => changeYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <ThemeToggle />
        </div>
      </header>

      {season.status === 'loading' && !season.data && (
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
      )}

      {season.status === 'error' && (
        <div className={styles.message} role="alert">
          <p>Couldn’t reach OpenF1: {season.error.message}</p>
          <p className={styles.muted}>
            OpenF1 restricts access while a live session is running, and rate-limits bursts. Try
            again in a minute.
          </p>
          <button type="button" className={styles.retry} onClick={() => setAttempt((n) => n + 1)}>
            Retry
          </button>
        </div>
      )}

      {view && !current && season.status === 'ready' && (
        <div className={styles.message}>
          <p>No championship standings for {year} yet.</p>
          {year > FIRST_SEASON && (
            <button type="button" className={styles.retry} onClick={() => changeYear(year - 1)}>
              View {year - 1}
            </button>
          )}
        </div>
      )}

      {view && current && (
        <>
          <RoundScrubber
            rounds={view.rounds}
            currentKey={currentKey}
            onSelect={selectRound}
            playing={playing}
            onTogglePlay={togglePlay}
          />
          {nextRound && <NextRound round={nextRound} now={now} />}
          <HeroStats
            drivers={view.drivers}
            teams={view.teams}
            title={view.title}
            isFinal={isFinal}
          />
          <main className={styles.grid}>
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
            <RoundRecap round={current} directory={view.directory} movers={view.movers} />
            <TeammateBattles battles={view.battles} />
            <RacePace round={current} drivers={view.drivers} />
          </main>
        </>
      )}

      <footer className={styles.footer}>
        Data from <a href="https://openf1.org">OpenF1</a>. Unofficial fan project, not associated
        with Formula 1 or the FIA.
      </footer>
    </div>
  );
}
