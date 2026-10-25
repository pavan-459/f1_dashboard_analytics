import { useCallback, useMemo, useState } from 'react';
import ProgressionChart from '../charts/ProgressionChart.jsx';
import { toProgression } from '../transforms/championship.js';
import Panel from './Panel.jsx';
import styles from './TitleFight.module.css';

const SLOTS = 5;

/**
 * Points progression for the top drivers. Colours are assigned by the latest standings and
 * stay with each driver while scrubbing, so a line never changes colour when ranks change.
 * @param {{
 *   rows: object[],
 *   scored: import('../transforms/championship.js').Round[],
 *   finalStandings: import('../transforms/championship.js').StandingRow[],
 *   currentIndex: number,
 *   onSelectRound: (sessionKey: number) => void,
 * }} props
 */
export default function TitleFight({ rows, scored, finalStandings, currentIndex, onSelectRound }) {
  const contenders = finalStandings.slice(0, SLOTS);
  const [hidden, setHidden] = useState(() => new Set());

  const series = useMemo(() => {
    const progression = toProgression(
      rows,
      scored,
      contenders.map((c) => c.driver.number),
    );
    return contenders.map((c, i) => ({
      id: c.id,
      label: c.label,
      name: c.name,
      colour: `var(--series-${i + 1})`,
      values: progression[i].values,
    }));
    // contenders derives from finalStandings
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, scored, finalStandings]);

  const visible = series.filter((s) => !hidden.has(s.id));
  const toggle = (id) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (visible.length > 1) next.add(id);
      return next;
    });
  const selectIndex = useCallback(
    (i) => scored[i] && onSelectRound(scored[i].sessionKey),
    [scored, onSelectRound],
  );

  return (
    <Panel kicker="Title fight" title="Points race, round by round" className={styles.panel}>
      <div className={styles.legend} role="group" aria-label="Show or hide drivers">
        {series.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={!hidden.has(s.id)}
            onClick={() => toggle(s.id)}
          >
            <i style={{ background: s.colour }} aria-hidden="true" />
            {s.name}
          </button>
        ))}
      </div>
      <ProgressionChart
        series={visible}
        rounds={scored}
        currentIndex={currentIndex}
        onSelectIndex={selectIndex}
      />
      <p className={styles.hint}>
        Tap the chart to jump to a round. The red line marks the selected round.
      </p>
    </Panel>
  );
}
