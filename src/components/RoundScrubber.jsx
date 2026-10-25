import { useEffect, useRef } from 'react';
import styles from './RoundScrubber.module.css';

/**
 * The season as a strip of round chips. Rounds with standings are selectable; upcoming ones
 * are shown greyed out. A play button replays the season round by round.
 * @param {{
 *   rounds: import('../transforms/championship.js').Round[],
 *   currentKey: number | undefined,
 *   onSelect: (sessionKey: number) => void,
 *   playing: boolean,
 *   onTogglePlay: () => void,
 * }} props
 */
export default function RoundScrubber({ rounds, currentKey, onSelect, playing, onTogglePlay }) {
  const trackRef = useRef(null);
  const scored = rounds.filter((r) => r.hasStandings);
  const index = scored.findIndex((r) => r.sessionKey === currentKey);
  const current = scored[index];

  // Keep the selected chip in view as playback advances.
  useEffect(() => {
    const chip = trackRef.current?.querySelector('[aria-current="true"]');
    chip?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [currentKey]);

  const step = (delta) => {
    const next = scored[index + delta];
    if (next) onSelect(next.sessionKey);
  };

  return (
    <section className={styles.scrubber} aria-label="Season rounds">
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.play}
          onClick={onTogglePlay}
          aria-pressed={playing}
          aria-label={playing ? 'Pause season replay' : 'Replay the season'}
        >
          <span aria-hidden="true">{playing ? '❚❚' : '▶'}</span>
          <span className={styles.playText}>{playing ? 'Pause' : 'Replay season'}</span>
        </button>
        <button
          type="button"
          className={styles.stepBtn}
          onClick={() => step(-1)}
          disabled={index <= 0}
          aria-label="Previous round"
        >
          ‹
        </button>
        <div className={styles.now} aria-live="polite">
          {current && (
            <>
              <span className={styles.roundNo}>
                R{current.round}
                {current.isSprint ? ' · Sprint' : ''}
              </span>
              <span className={styles.roundName}>{current.name}</span>
            </>
          )}
        </div>
        <button
          type="button"
          className={styles.stepBtn}
          onClick={() => step(1)}
          disabled={index < 0 || index >= scored.length - 1}
          aria-label="Next round"
        >
          ›
        </button>
      </div>

      <div className={styles.progress} aria-hidden="true">
        <div
          className={styles.progressFill}
          style={{ width: `${rounds.length ? ((index + 1) / rounds.length) * 100 : 0}%` }}
        />
      </div>

      <ol ref={trackRef} className={styles.track}>
        {rounds.map((r) => {
          const selected = r.sessionKey === currentKey;
          return (
            <li key={r.sessionKey}>
              <button
                type="button"
                className={styles.chip}
                data-sprint={r.isSprint || undefined}
                aria-current={selected ? 'true' : undefined}
                disabled={!r.hasStandings}
                onClick={() => onSelect(r.sessionKey)}
                title={`${r.name}${r.isSprint ? ' (Sprint)' : ''}`}
              >
                {r.flag ? (
                  <img src={r.flag} alt="" className={styles.flag} loading="lazy" />
                ) : (
                  <span className={styles.flag} />
                )}
                <span className={styles.code}>{r.countryCode}</span>
                <span className={styles.meta}>{r.isSprint ? 'SPR' : `R${r.round}`}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
