import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import season from '../../fixtures/seasons/2026.json';
import StandingsChart from '../../src/charts/StandingsChart.jsx';
import { toDriverDirectory, toDriverStandings } from '../../src/transforms/championship.js';

const directory = toDriverDirectory(season.drivers);
const rows = toDriverStandings(season.driverStandings, 11388, directory);
const draw = (props) =>
  render(<StandingsChart rows={rows} ariaLabel="Drivers' standings" duration={0} {...props} />);

describe('StandingsChart', () => {
  it('labels the chart and shows a two-series legend', () => {
    draw();
    expect(screen.getByRole('img', { name: "Drivers' standings" })).toBeInTheDocument();
    expect(screen.getByText('Before this round')).toBeInTheDocument();
    expect(screen.getByText('Gained this round')).toBeInTheDocument();
  });

  it('draws one row per entry, with the value at the bar tip', () => {
    const { container } = draw();
    const groups = container.querySelectorAll('g.row');
    expect(groups).toHaveLength(rows.length);
    expect(groups[0].querySelector('text.name').textContent).toBe('ANT');
    expect(groups[0].querySelector('text.value').textContent).toBe('340');
    expect(container.querySelectorAll('path.bar-start')).toHaveLength(rows.length);
  });

  it('shows a tooltip with points gained and places moved on hover', async () => {
    const user = userEvent.setup();
    const { container } = draw();
    const hamilton = [...container.querySelectorAll('g.row')].find(
      (g) => g.querySelector('text.name').textContent === 'LEC',
    );
    await user.hover(hamilton);
    const tip = screen.getByRole('status');
    expect(tip).toHaveTextContent(/5th · Charles Leclerc/);
    expect(tip).toHaveTextContent(/▼ 1 place/);
    await user.unhover(hamilton);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('re-keys rows when standings change instead of duplicating them', () => {
    const { container, rerender } = draw();
    rerender(<StandingsChart rows={rows.slice(0, 5)} ariaLabel="x" duration={0} />);
    expect(container.querySelectorAll('g.row')).toHaveLength(5);
  });
});
