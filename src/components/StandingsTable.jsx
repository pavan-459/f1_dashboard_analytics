import { formatPoints, formatSigned } from '../transforms/format.js';
import styles from './StandingsTable.module.css';

function Change({ change }) {
  if (!change)
    return (
      <span className={styles.same} aria-label="No change">
        –
      </span>
    );
  const up = change > 0;
  const n = Math.abs(change);
  return (
    <span
      className={up ? styles.up : styles.down}
      aria-label={`${up ? 'Up' : 'Down'} ${n} ${n === 1 ? 'place' : 'places'}`}
    >
      {up ? '▲' : '▼'}
      {n}
    </span>
  );
}

/**
 * Standings as a table; doubles as the accessible view of the standings chart.
 * @param {{ rows: import('../transforms/championship.js').StandingRow[], kind: 'drivers' | 'teams', caption: string }} props
 */
export default function StandingsTable({ rows, kind, caption }) {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption className={styles.caption}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={styles.num}>
              Pos
            </th>
            <th scope="col">
              <span className={styles.srOnly}>Change</span>
            </th>
            <th scope="col">{kind === 'drivers' ? 'Driver' : 'Team'}</th>
            {kind === 'drivers' && (
              <th scope="col" className={styles.wide}>
                Team
              </th>
            )}
            <th scope="col" className={styles.num}>
              +Round
            </th>
            <th scope="col" className={styles.num}>
              Pts
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={`${styles.num} ${styles.pos}`}>{r.position}</td>
              <td>
                <Change change={r.change} />
              </td>
              <th scope="row" className={styles.name}>
                <i
                  style={{ background: r.colour ?? 'var(--color-series-default)' }}
                  aria-hidden="true"
                />
                <span>
                  {r.name}
                  {kind === 'drivers' && r.team && (
                    <small className={styles.narrowTeam}>{r.team}</small>
                  )}
                </span>
              </th>
              {kind === 'drivers' && (
                <td className={`${styles.wide} ${styles.muted}`}>{r.team ?? '—'}</td>
              )}
              <td className={`${styles.num} ${styles.muted}`}>
                {r.gained ? formatSigned(r.gained) : '–'}
              </td>
              <td className={`${styles.num} ${styles.points}`}>{formatPoints(r.points)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
