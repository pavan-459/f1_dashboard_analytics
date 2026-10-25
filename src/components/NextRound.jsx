import { useEffect, useState } from 'react';
import styles from './NextRound.module.css';

function countdown(ms) {
  if (ms <= 0) return 'Lights out';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}

/**
 * Countdown chip for the next race or sprint. Pulses red inside the final 24 hours.
 * @param {{ round: import('../transforms/championship.js').Round, now: Date }} props
 */
export default function NextRound({ round, now }) {
  const [time, setTime] = useState(now.getTime());
  useEffect(() => {
    setTime(now.getTime());
    const id = setInterval(() => setTime(Date.now()), 30000);
    return () => clearInterval(id);
  }, [now]);

  const start = new Date(round.date);
  const ms = start.getTime() - time;
  const when = start.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <aside className={styles.next} data-soon={ms < 86400000 || undefined} aria-label="Next session">
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>{round.isSprint ? 'Next sprint' : 'Next race'}</span>
      <span className={styles.name}>
        {round.flag && <img src={round.flag} alt="" className={styles.flag} />}
        {round.name}
      </span>
      <span className={styles.when}>{when}</span>
      <span className={styles.count}>{countdown(ms)}</span>
    </aside>
  );
}
