import PageHeader from '../layout/PageHeader.jsx';
import { STATUS_LABEL } from '../transforms/calendar.js';
import { circuitTypeLabel } from '../transforms/circuits.js';
import { toHref } from '../state/useRoute.js';
import styles from './CardGrid.module.css';

const day = (iso) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const range = (a, b) => (day(a) === day(b) ? day(a) : `${day(a)} – ${day(b)}`);

/**
 * Season calendar as cards: status, dates, circuit, sprint badge, link to results.
 * @param {{ year: number, weekends: import('../transforms/calendar.js').Weekend[], scoredKeys: Set<number> }} props
 */
export default function CalendarPage({ year, weekends, scoredKeys }) {
  const done = weekends.filter((w) => w.status === 'completed').length;
  const total = weekends.filter((w) => w.status !== 'cancelled').length;
  const sprints = weekends.filter((w) => w.sprintKey && w.status !== 'cancelled').length;

  return (
    <>
      <PageHeader
        title={`Formula 1 Calendar ${year}`}
        subtitle={`${total} Grands Prix, ${sprints} sprint weekends. ${done} of ${total} completed.`}
      />
      <ol className={styles.grid}>
        {weekends.map((w) => {
          // Prefer the Grand Prix; fall back to the sprint if only that has been scored.
          const resultsKey = [w.raceKey, w.sprintKey].find((k) => k && scoredKeys.has(k));
          return (
            <li key={w.meetingKey} className={styles.card} data-status={w.status}>
              <div className={styles.body}>
                <div className={styles.top}>
                  <span className={styles.pill} data-status={w.status}>
                    {w.round ? `R${w.round} · ` : ''}
                    {STATUS_LABEL[w.status]}
                  </span>
                  {w.flag && <img className={styles.flag} src={w.flag} alt="" loading="lazy" />}
                </div>
                <h3 className={styles.name}>{w.name}</h3>
                <p className={styles.place}>
                  {w.location}, {w.country}
                </p>
                <dl className={styles.stats}>
                  <div>
                    <dt>Dates</dt>
                    <dd>{range(w.start, w.end)}</dd>
                  </div>
                  <div>
                    <dt>Circuit</dt>
                    <dd>{w.circuitName}</dd>
                  </div>
                </dl>
                <div className={styles.footer}>
                  <span className={styles.tag}>{circuitTypeLabel(w.circuitType)}</span>
                  {w.sprintKey && (
                    <span className={styles.tag} data-kind="sprint">
                      Sprint weekend
                    </span>
                  )}
                  {resultsKey && (
                    <a
                      className={styles.link}
                      href={toHref('/results', { season: year, round: resultsKey })}
                    >
                      Results →
                    </a>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
