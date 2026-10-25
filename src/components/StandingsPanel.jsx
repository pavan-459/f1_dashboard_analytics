import { useState } from 'react';
import StandingsChart from '../charts/StandingsChart.jsx';
import Panel, { Segmented } from './Panel.jsx';
import StandingsTable from './StandingsTable.jsx';

/**
 * Drivers' or constructors' standings after the selected round, as a chart or a table.
 * @param {{ drivers: import('../transforms/championship.js').StandingRow[], teams: import('../transforms/championship.js').StandingRow[], roundLabel: string }} props
 */
export default function StandingsPanel({ drivers, teams, roundLabel }) {
  const [kind, setKind] = useState('drivers');
  const [view, setView] = useState('chart');
  const rows = kind === 'drivers' ? drivers : teams;
  const what = kind === 'drivers' ? "Drivers' standings" : "Constructors' standings";

  return (
    <Panel
      kicker="Championship"
      title={what}
      actions={
        <>
          <Segmented
            label="Championship"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'drivers', label: 'Drivers' },
              { value: 'teams', label: 'Teams' },
            ]}
          />
          <Segmented
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: 'chart', label: 'Chart' },
              { value: 'table', label: 'Table' },
            ]}
          />
        </>
      }
    >
      {view === 'chart' ? (
        <StandingsChart
          rows={rows}
          labelWidth={kind === 'drivers' ? 76 : 150}
          ariaLabel={`${what} after ${roundLabel}. Leader ${rows[0]?.name ?? 'none'} on ${rows[0]?.points ?? 0} points. Switch to the table view for every value.`}
        />
      ) : (
        <StandingsTable rows={rows} kind={kind} caption={`${what} after ${roundLabel}`} />
      )}
    </Panel>
  );
}
