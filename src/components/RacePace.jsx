import { useMemo, useState } from 'react';
import LapTimeChart from '../charts/LapTimeChart.jsx';
import { loadDriverLaps } from '../data/championshipSource.js';
import { useAsync } from '../state/useAsync.js';
import { formatLapTime } from '../transforms/format.js';
import { lapSummary, toLapTimes, withoutSlowLaps } from '../transforms/lapTimes.js';
import Panel, { Segmented } from './Panel.jsx';
import styles from './RacePace.module.css';

/**
 * Lap-by-lap pace for one driver in the selected session.
 * @param {{
 *   round: import('../transforms/championship.js').Round,
 *   drivers: import('../transforms/championship.js').StandingRow[],
 *   loadLaps?: typeof loadDriverLaps,
 * }} props
 */
export default function RacePace({ round, drivers, loadLaps = loadDriverLaps }) {
  const [picked, setPicked] = useState(null);
  const [filter, setFilter] = useState('clean');
  const driver = drivers.find((d) => d.driver?.number === picked) ?? drivers[0];
  const number = driver?.driver?.number;

  const { status, data, error } = useAsync(
    number === undefined ? null : () => loadLaps(round.sessionKey, number),
    [round.sessionKey, number, loadLaps],
  );
  const all = useMemo(
    () => (data ? toLapTimes(data, { driverNumber: number }) : []),
    [data, number],
  );
  const shown = useMemo(() => (filter === 'clean' ? withoutSlowLaps(all) : all), [all, filter]);
  const summary = lapSummary(all);

  return (
    <Panel
      kicker="Race pace"
      title="Lap times"
      className={styles.panel}
      actions={
        <>
          <label className={styles.picker}>
            <span className={styles.sr}>Driver</span>
            <select value={number ?? ''} onChange={(e) => setPicked(Number(e.target.value))}>
              {drivers.map((d) => (
                <option key={d.id} value={d.driver?.number}>
                  {d.label} · {d.name}
                </option>
              ))}
            </select>
          </label>
          <Segmented
            label="Laps shown"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'clean', label: 'Clean laps' },
              { value: 'all', label: 'All laps' },
            ]}
          />
        </>
      }
    >
      <dl className={styles.stats}>
        <div>
          <dt>Fastest lap</dt>
          <dd className={styles.purple}>
            {summary.best ? `${formatLapTime(summary.best.seconds)}` : '—'}
            {summary.best && <small> L{summary.best.lap}</small>}
          </dd>
        </div>
        <div>
          <dt>Median</dt>
          <dd>{formatLapTime(summary.median)}</dd>
        </div>
        <div>
          <dt>Timed laps</dt>
          <dd>{summary.count || '—'}</dd>
        </div>
      </dl>
      {status === 'loading' && !data && <p className={styles.muted}>Loading laps…</p>}
      {status === 'error' && (
        <p className={styles.muted} role="alert">
          Couldn’t load laps: {error.message}
        </p>
      )}
      {status !== 'error' && data && driver && (
        <LapTimeChart
          data={shown}
          driverName={driver.name}
          colour={driver.colour ?? 'var(--color-series-default)'}
        />
      )}
      {filter === 'clean' && all.length > shown.length && (
        <p className={styles.muted}>
          Hiding {all.length - shown.length} slow {all.length - shown.length === 1 ? 'lap' : 'laps'}{' '}
          (over 107% of the median: pit stops, safety car, lap 1).
        </p>
      )}
    </Panel>
  );
}
