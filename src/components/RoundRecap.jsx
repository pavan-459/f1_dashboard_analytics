import { useMemo, useState } from 'react';
import { loadSessionResult, loadStints } from '../data/championshipSource.js';
import { useAsync } from '../state/useAsync.js';
import { toClassification } from '../transforms/championship.js';
import { formatDuration, formatGap, formatPoints, ordinal } from '../transforms/format.js';
import { compoundLetter, toStintsByDriver } from '../transforms/stints.js';
import Panel from './Panel.jsx';
import styles from './RoundRecap.module.css';

const PODIUM_ORDER = [1, 0, 2]; // P2, P1, P3 left to right

function Tyres({ stints }) {
  if (!stints?.length) return <span className={styles.noTyres}>—</span>;
  return (
    <span
      className={styles.tyres}
      aria-label={stints
        .map((s) => `${s.compound.toLowerCase()} ${s.laps ? `${s.laps} laps` : ''}`)
        .join(', then ')}
    >
      {stints.map((s) => (
        <span
          key={s.stint}
          className={styles.tyre}
          data-compound={s.compound}
          data-used={s.used || undefined}
        >
          {compoundLetter(s.compound)}
          {s.laps > 0 && <small>{s.laps}</small>}
        </span>
      ))}
    </span>
  );
}

/**
 * The selected session's result: podium, biggest championship movers, full classification.
 * @param {{
 *   round: import('../transforms/championship.js').Round,
 *   directory: Map<number, import('../transforms/championship.js').DriverInfo>,
 *   movers: ReturnType<typeof import('../transforms/championship.js').toMovers>,
 *   loadResult?: typeof loadSessionResult,
 *   loadTyres?: typeof loadStints,
 * }} props
 */
export default function RoundRecap({
  round,
  directory,
  movers,
  loadResult = loadSessionResult,
  loadTyres = loadStints,
}) {
  const [showAll, setShowAll] = useState(false);
  const { status, data, error } = useAsync(
    () => loadResult(round.sessionKey),
    [round.sessionKey, loadResult],
  );
  const tyres = useAsync(() => loadTyres(round.sessionKey), [round.sessionKey, loadTyres]);
  const stints = useMemo(() => (tyres.data ? toStintsByDriver(tyres.data) : null), [tyres.data]);
  const classification = useMemo(
    () => (data ? toClassification(data, directory) : []),
    [data, directory],
  );
  const podium = classification.filter((r) => !r.status).slice(0, 3);
  const retirements = classification.filter((r) => r.status);

  return (
    <Panel
      kicker={`Round ${round.round}${round.isSprint ? ' · Sprint' : ''}`}
      title={`${round.name}${round.isSprint ? ' Sprint' : ''}`}
      className={styles.panel}
    >
      {status === 'loading' && !data && <p className={styles.muted}>Loading result…</p>}
      {status === 'error' && (
        <p className={styles.muted} role="alert">
          Couldn’t load the result: {error.message}
        </p>
      )}

      {podium.length > 0 && (
        <ol className={styles.podium} aria-label="Podium">
          {PODIUM_ORDER.filter((i) => podium[i]).map((i) => {
            const r = podium[i];
            return (
              <li
                key={r.driver.number}
                className={styles.step}
                data-pos={i + 1}
                style={{ '--team': r.driver.colour ?? 'var(--color-series-default)' }}
              >
                {r.driver.headshot ? (
                  <img src={r.driver.headshot} alt="" className={styles.headshot} loading="lazy" />
                ) : (
                  <span className={styles.headshot} />
                )}
                <span className={styles.stepName}>{r.driver.lastName}</span>
                <span className={styles.stepTeam}>{r.driver.team}</span>
                <span className={styles.block}>
                  <b>P{i + 1}</b>
                  <small>{i === 0 ? formatDuration(r.duration) : formatGap(r.gap)}</small>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className={styles.columns}>
        <div>
          <h3 className={styles.h3}>Championship movers</h3>
          {movers.up.length + movers.down.length === 0 ? (
            <p className={styles.muted}>No position changes this round.</p>
          ) : (
            <ul className={styles.movers}>
              {movers.up.map((m) => (
                <li key={m.id}>
                  <span className={styles.up}>▲{m.change}</span> {m.name}{' '}
                  <span className={styles.muted}>now {ordinal(m.position)}</span>
                </li>
              ))}
              {movers.down.map((m) => (
                <li key={m.id}>
                  <span className={styles.down}>▼{-m.change}</span> {m.name}{' '}
                  <span className={styles.muted}>now {ordinal(m.position)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className={styles.h3}>Retirements</h3>
          {retirements.length === 0 ? (
            <p className={styles.muted}>{data ? 'Everyone was classified.' : '—'}</p>
          ) : (
            <ul className={styles.movers}>
              {retirements.map((r) => (
                <li key={r.driver.number}>
                  <span className={styles.badge}>{r.status}</span> {r.driver.name}{' '}
                  {r.laps != null && <span className={styles.muted}>lap {r.laps}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {classification.length > 0 && (
        <div className={styles.tower}>
          <h3 className={styles.h3}>Timing tower</h3>
          <table className={styles.table}>
            <caption className={styles.sr}>
              Classification and tyre strategy for {round.name}
            </caption>
            <thead>
              <tr>
                <th scope="col" className={styles.num}>
                  Pos
                </th>
                <th scope="col">Driver</th>
                <th scope="col">Tyres</th>
                <th scope="col" className={styles.num}>
                  Gap
                </th>
                <th scope="col" className={styles.num}>
                  Pts
                </th>
              </tr>
            </thead>
            <tbody>
              {(showAll ? classification : classification.slice(0, 10)).map((r) => (
                <tr key={r.driver.number} data-status={r.status ?? undefined}>
                  <td className={`${styles.num} ${styles.pos}`}>{r.status ?? r.position ?? '—'}</td>
                  <th scope="row">
                    <i
                      style={{ background: r.driver.colour ?? 'var(--color-series-default)' }}
                      aria-hidden="true"
                    />
                    <span className={styles.acr}>{r.driver.acronym}</span>
                    <span className={styles.full}>{r.driver.name}</span>
                  </th>
                  <td>
                    <Tyres stints={stints?.get(r.driver.number)} />
                  </td>
                  <td className={styles.num}>
                    {r.status ? `${r.laps ?? 0} laps` : formatGap(r.gap)}
                  </td>
                  <td className={`${styles.num} ${styles.pts}`}>
                    {r.points ? formatPoints(r.points) : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {classification.length > 10 && (
            <button type="button" className={styles.more} onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show top 10' : `Show all ${classification.length}`}
            </button>
          )}
        </div>
      )}
    </Panel>
  );
}
