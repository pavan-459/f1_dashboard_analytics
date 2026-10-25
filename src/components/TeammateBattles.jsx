import { formatPoints } from '../transforms/format.js';
import Panel from './Panel.jsx';
import styles from './TeammateBattles.module.css';

/**
 * Same car, different driver: each team's points split between its two top scorers.
 * @param {{ battles: ReturnType<typeof import('../transforms/championship.js').toTeammateBattles> }} props
 */
export default function TeammateBattles({ battles }) {
  return (
    <Panel kicker="Intra-team" title="Teammate battles" className={styles.panel}>
      <ul className={styles.grid}>
        {battles.map((b) => {
          const [a, c] = b.drivers;
          const share = Math.round(b.leadShare * 100);
          return (
            <li
              key={b.team}
              className={styles.card}
              style={{ '--team': b.colour ?? 'var(--color-series-default)' }}
            >
              <p className={styles.team}>{b.team}</p>
              <div className={styles.names}>
                <span>
                  <b>{a.label}</b> {formatPoints(a.points)}
                </span>
                <span>
                  {formatPoints(c.points)} <b>{c.label}</b>
                </span>
              </div>
              <div
                className={styles.split}
                role="img"
                aria-label={`${a.name} ${formatPoints(a.points)} points, ${c.name} ${formatPoints(c.points)} points`}
              >
                <span className={styles.lead} style={{ flexGrow: Math.max(b.leadShare, 0.02) }} />
                <span
                  className={styles.trail}
                  style={{ flexGrow: Math.max(1 - b.leadShare, 0.02) }}
                />
              </div>
              <p className={styles.margin}>
                {b.margin === 0
                  ? 'Dead level'
                  : `${a.driver?.lastName ?? a.label} +${formatPoints(b.margin)} · ${share}% of team points`}
              </p>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
