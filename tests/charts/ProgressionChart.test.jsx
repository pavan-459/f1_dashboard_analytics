import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import season from '../../fixtures/seasons/2026.json';
import ProgressionChart from '../../src/charts/ProgressionChart.jsx';
import { toProgression, toRounds } from '../../src/transforms/championship.js';

const scored = toRounds(season.sessions, season.meetings, season.driverStandings).filter(
  (r) => r.hasStandings,
);
const series = toProgression(season.driverStandings, scored, [12, 63, 44]).map((p, i) => ({
  id: String(p.driverNumber),
  label: ['ANT', 'RUS', 'HAM'][i],
  name: ['Kimi Antonelli', 'George Russell', 'Lewis Hamilton'][i],
  colour: `var(--series-${i + 1})`,
  values: p.values,
}));

describe('ProgressionChart', () => {
  it('draws a line per driver and a marker for the selected round', () => {
    const { container, getByRole } = render(
      <ProgressionChart series={series} rounds={scored} currentIndex={4} />,
    );
    expect(
      getByRole('img', { name: /Kimi Antonelli, George Russell, Lewis Hamilton/ }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll('path.series')).toHaveLength(3);
    expect(container.querySelectorAll('circle.dot')).toHaveLength(3);
    expect(container.querySelectorAll('line.now')).toHaveLength(1);
    expect(container.querySelectorAll('text.end-label').length).toBeGreaterThan(0);
  });

  it('labels x ticks with country codes and marks sprints', () => {
    const { container } = render(
      <ProgressionChart series={series} rounds={scored} currentIndex={0} />,
    );
    const ticks = [...container.querySelectorAll('g.x-axis .tick text')].map((t) => t.textContent);
    expect(ticks[0]).toBe(scored[0].countryCode);
    expect(ticks.length).toBeLessThanOrEqual(scored.length);
  });

  it('reports a round when the plot is clicked', () => {
    const onSelectIndex = vi.fn();
    const { container } = render(
      <ProgressionChart
        series={series}
        rounds={scored}
        currentIndex={0}
        onSelectIndex={onSelectIndex}
      />,
    );
    fireEvent.click(container.querySelector('rect.overlay'), { clientX: 0, clientY: 10 });
    expect(onSelectIndex).toHaveBeenCalledWith(expect.any(Number));
  });
});
