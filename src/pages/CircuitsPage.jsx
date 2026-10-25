import TrackMap from '../charts/TrackMap.jsx';
import { loadCircuit } from '../data/circuitSource.js';
import PageHeader from '../layout/PageHeader.jsx';
import { useAsync } from '../state/useAsync.js';
import { STATUS_LABEL } from '../transforms/calendar.js';
import { circuitTypeLabel, toCircuitList, trackLengthKm } from '../transforms/circuits.js';
import styles from './CardGrid.module.css';

function CircuitCard({ weekend, year, load }) {
  const { status, data } = useAsync(
    () => load(weekend.circuitKey, year),
    [weekend.circuitKey, year, load],
  );
  const info = data && !Array.isArray(data) ? data : null;
  const length = trackLengthKm(info);
  const corners = info?.corners?.length;

  return (
    <li className={styles.card} data-status={weekend.status}>
      <div className={styles.media}>
        <span
          className={styles.pill}
          data-status={weekend.status === 'cancelled' ? 'cancelled' : undefined}
        >
          {weekend.status === 'cancelled' ? 'Cancelled' : `On ${year} calendar`}
        </span>
        {weekend.flag && <img className={styles.flag} src={weekend.flag} alt="" loading="lazy" />}
        <TrackMap info={info} name={weekend.circuitName} />
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{weekend.circuitName}</h3>
        <p className={styles.place}>
          {weekend.location}, {weekend.country}
        </p>
        <dl className={styles.stats}>
          <div>
            <dt>Length</dt>
            <dd title="Measured from the track outline; within ~2% of the official figure">
              {length ? `≈${length.toFixed(2)} km` : status === 'loading' ? '…' : '—'}
            </dd>
          </div>
          <div>
            <dt>Corners</dt>
            <dd>{corners ?? (status === 'loading' ? '…' : '—')}</dd>
          </div>
          <div>
            <dt>Round</dt>
            <dd>{weekend.round ?? '—'}</dd>
          </div>
        </dl>
        <div className={styles.footer}>
          <span className={styles.tag}>{circuitTypeLabel(weekend.circuitType)}</span>
          <span className={styles.tag}>{weekend.name}</span>
          {weekend.status !== 'completed' && weekend.status !== 'cancelled' && (
            <span className={styles.tag} data-kind="sprint">
              {STATUS_LABEL[weekend.status]}
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Every circuit on the season's calendar with a D3 track map, corners and approximate length.
 * @param {{ year: number, weekends: import('../transforms/calendar.js').Weekend[], load?: typeof loadCircuit }} props
 */
export default function CircuitsPage({ year, weekends, load = loadCircuit }) {
  const circuits = toCircuitList(weekends);
  const active = circuits.filter((w) => w.status !== 'cancelled');
  const cancelled = circuits.filter((w) => w.status === 'cancelled');

  return (
    <>
      <PageHeader
        title={`Formula 1 Circuits ${year}`}
        subtitle={`Every circuit on the ${year} calendar, with track maps, corner numbers and lap length drawn from live track data. ${circuits.length} venues in total.`}
      />
      <h3 className={styles.section}>On the {year} calendar</h3>
      <ul className={styles.grid}>
        {active.map((w) => (
          <CircuitCard key={w.circuitKey} weekend={w} year={year} load={load} />
        ))}
      </ul>
      {cancelled.length > 0 && (
        <>
          <h3 className={styles.section}>Cancelled this season</h3>
          <ul className={styles.grid}>
            {cancelled.map((w) => (
              <CircuitCard key={w.circuitKey} weekend={w} year={year} load={load} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}
