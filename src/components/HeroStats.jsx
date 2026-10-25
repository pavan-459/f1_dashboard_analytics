import { formatPoints, formatSigned } from '../transforms/format.js';
import styles from './HeroStats.module.css';

/**
 * Headline tiles: championship leader, gap to P2, what's still in play, constructors leader.
 * @param {{ drivers: import('../transforms/championship.js').StandingRow[], teams: import('../transforms/championship.js').StandingRow[], title: ReturnType<typeof import('../transforms/championship.js').toTitleMath>, isFinal: boolean }} props
 */
export default function HeroStats({ drivers, teams, title, isFinal }) {
  const [leader, second] = drivers;
  const [teamLeader, teamSecond] = teams;
  if (!leader) return null;
  const gap = second ? leader.points - second.points : 0;

  return (
    <section className={styles.grid} aria-label="Championship summary">
      <article
        className={`${styles.tile} ${styles.leader}`}
        style={{ '--team': leader.colour ?? 'var(--color-series-default)' }}
      >
        <p className={styles.label}>
          {title.decided
            ? isFinal
              ? 'World Champion'
              : 'Champion — title sealed'
            : 'Championship leader'}
        </p>
        <div className={styles.leaderBody}>
          {leader.driver?.headshot && (
            <img className={styles.headshot} src={leader.driver.headshot} alt="" loading="lazy" />
          )}
          <div>
            <p className={styles.leaderName}>{leader.name}</p>
            <p className={styles.sub}>{leader.team}</p>
          </div>
        </div>
        <p className={styles.hero}>
          {formatPoints(leader.points)}
          <span className={styles.unit}>pts</span>
        </p>
        <p className={styles.delta}>{formatSigned(leader.gained)} this round</p>
      </article>

      <article className={styles.tile}>
        <p className={styles.label}>Gap to P2</p>
        <p className={styles.value}>{formatPoints(gap)}</p>
        <p className={styles.sub}>
          {second ? `${second.name} · ${formatPoints(second.points)} pts` : 'No rival yet'}
        </p>
      </article>

      <article className={styles.tile}>
        <p className={styles.label}>Points still in play</p>
        <p className={styles.value}>{formatPoints(title.available)}</p>
        <p className={styles.sub}>
          {title.races} {title.races === 1 ? 'race' : 'races'} · {title.sprints}{' '}
          {title.sprints === 1 ? 'sprint' : 'sprints'} left
        </p>
      </article>

      {teamLeader && (
        <article
          className={`${styles.tile} ${styles.team}`}
          style={{ '--team': teamLeader.colour ?? 'var(--color-series-default)' }}
        >
          <p className={styles.label}>Constructors leader</p>
          <p className={styles.value}>{teamLeader.name}</p>
          <p className={styles.sub}>
            {formatPoints(teamLeader.points)} pts
            {teamSecond &&
              ` · +${formatPoints(teamLeader.points - teamSecond.points)} over ${teamSecond.name}`}
          </p>
        </article>
      )}
    </section>
  );
}
