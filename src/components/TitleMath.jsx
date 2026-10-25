import { useState } from 'react';
import { formatPoints } from '../transforms/format.js';
import Panel, { Segmented } from './Panel.jsx';
import styles from './TitleMath.module.css';

/**
 * "Who can still win it?" — each contender's deficit against the points still available.
 * @param {{
 *   drivers: ReturnType<typeof import('../transforms/championship.js').toTitleMath>,
 *   teams: ReturnType<typeof import('../transforms/championship.js').toTitleMath>,
 *   isFinal: boolean,
 * }} props
 */
export default function TitleMath({ drivers, teams, isFinal }) {
  const [kind, setKind] = useState('Drivers');
  const title = kind === 'Drivers' ? drivers : teams;
  const { contenders, available, decided, eliminatedCount } = title;
  const leader = contenders[0];

  let verdict;
  if (!leader) verdict = 'No standings yet.';
  else if (decided && isFinal) verdict = `${leader.name} won the title.`;
  else if (decided) verdict = `${leader.name} has the title sealed — nobody can catch them.`;
  else
    verdict = `${contenders.length} still in the hunt with ${formatPoints(available)} points on the table.`;

  return (
    <Panel
      kicker="Title math"
      title="Who can still win?"
      actions={
        <Segmented
          label="Championship"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'Drivers', label: 'Drivers' },
            { value: 'Teams', label: 'Teams' },
          ]}
        />
      }
    >
      <p className={styles.verdict}>{verdict}</p>
      <ul className={styles.list}>
        {contenders.map((c) => {
          const used = available ? Math.min(1, c.deficit / available) : 0;
          return (
            <li key={c.id} className={styles.item}>
              <div className={styles.head}>
                <span className={styles.name}>
                  <i
                    style={{ background: c.colour ?? 'var(--color-series-default)' }}
                    aria-hidden="true"
                  />
                  {c.name}
                </span>
                <span className={styles.figure}>
                  {c.deficit === 0 ? 'Leader' : `−${formatPoints(c.deficit)}`}
                </span>
              </div>
              {c.deficit > 0 && (
                <div
                  className={styles.meter}
                  role="meter"
                  aria-valuemin={0}
                  aria-valuemax={available}
                  aria-valuenow={c.deficit}
                  aria-label={`${c.name} is ${formatPoints(c.deficit)} points behind; ${formatPoints(available)} available`}
                  data-danger={used > 0.66 || undefined}
                >
                  <span style={{ width: `${Math.max(used * 100, 2)}%` }} />
                </div>
              )}
              {c.deficit > 0 && (
                <p className={styles.note}>
                  Needs {formatPoints(c.deficit)} of {formatPoints(available)} remaining points
                  {used > 0.66 ? ' · must win nearly everything' : ''}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {eliminatedCount > 0 && (
        <p className={styles.out}>
          {eliminatedCount} {eliminatedCount === 1 ? 'entry is' : 'entries are'} mathematically out.
        </p>
      )}
      <p className={styles.footnote}>
        Assumes the maximum haul per weekend (
        {kind === 'Drivers' ? '25 per race, 8 per sprint' : '43 per race, 15 per sprint'}).
        Count-back tie-breaks are ignored.
      </p>
    </Panel>
  );
}
