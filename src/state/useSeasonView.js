import { useMemo } from 'react';
import {
  toDriverDirectory,
  toDriverStandings,
  toMovers,
  toRounds,
  toTeammateBattles,
  toTeamColours,
  toTeamStandings,
  toTitleMath,
} from '../transforms/championship.js';

/**
 * Derive every dashboard view from a loaded season and the selected session.
 * @param {Awaited<ReturnType<typeof import('../data/championshipSource.js').loadSeason>> | null} season
 * @param {number | null} selectedKey session_key of the selected round, or null for the latest
 */
export function useSeasonView(season, selectedKey) {
  const base = useMemo(() => {
    if (!season) return null;
    const rounds = toRounds(season.sessions, season.meetings, season.driverStandings);
    const directory = toDriverDirectory(season.drivers);
    return {
      rounds,
      scored: rounds.filter((r) => r.hasStandings),
      directory,
      teamColours: toTeamColours(directory),
    };
  }, [season]);

  return useMemo(() => {
    if (!base || !base.scored.length) return base && { ...base, current: null };
    const current = base.scored.find((r) => r.sessionKey === selectedKey) ?? base.scored.at(-1);
    const drivers = toDriverStandings(season.driverStandings, current.sessionKey, base.directory);
    const teams = toTeamStandings(season.teamStandings, current.sessionKey, base.teamColours);
    const remaining = base.rounds.filter((r) => r.date > current.date);
    return {
      ...base,
      current,
      currentIndex: base.scored.indexOf(current),
      drivers,
      teams,
      remaining,
      title: toTitleMath(drivers, remaining),
      constructorsTitle: toTitleMath(teams, remaining, { race: 43, sprint: 15 }),
      battles: toTeammateBattles(drivers, teams),
      movers: toMovers(drivers),
    };
  }, [base, season, selectedKey]);
}
