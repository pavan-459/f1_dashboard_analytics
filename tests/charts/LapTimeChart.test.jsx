import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import fixture from '../../fixtures/sessions/latest.json';
import LapTimeChart from '../../src/charts/LapTimeChart.jsx';
import { toLapTimes } from '../../src/transforms/lapTimes.js';

const data = toLapTimes(fixture.laps, { driverNumber: 1 });
const renderChart = (props) =>
  render(<LapTimeChart data={data} driverName="Max VERSTAPPEN" colour="red" {...props} />);

describe('LapTimeChart', () => {
  it('renders an accessible, focusable chart', () => {
    renderChart();
    const chart = screen.getByRole('img', { name: /lap times for max verstappen/i });
    expect(chart).toHaveAttribute(
      'aria-label',
      `Lap times for Max VERSTAPPEN, ${data.length} laps`,
    );
    expect(chart).toHaveAttribute('tabindex', '0');
  });

  it('draws one line and one dot per lap', () => {
    const { container } = renderChart();
    expect(container.querySelectorAll('path.lap-line')).toHaveLength(1);
    expect(container.querySelectorAll('circle.lap-dot')).toHaveLength(data.length);
    expect(container.querySelector('path.lap-line').getAttribute('d')).toMatch(/^M/);
  });

  it('marks pit-out laps and gives each dot a tooltip title', () => {
    const { container } = renderChart();
    const pitOut = data.find((d) => d.isPitOutLap);
    const titles = [...container.querySelectorAll('circle.lap-dot title')].map(
      (t) => t.textContent,
    );
    expect(titles).toHaveLength(data.length);
    expect(titles[0]).toMatch(/^Lap \d+: \d:\d{2}\.\d{3}$/);
    expect(titles.find((t) => t.startsWith(`Lap ${pitOut.lap}:`))).toMatch(/\(pit out\)$/);
    expect(container.querySelectorAll('circle.lap-dot.pitOut')).toHaveLength(1);
  });

  it('formats y-axis ticks as lap times', () => {
    const { container } = renderChart();
    const ticks = [...container.querySelectorAll('g.y-axis .tick text')].map((t) => t.textContent);
    expect(ticks.length).toBeGreaterThan(0);
    ticks.forEach((t) => expect(t).toMatch(/^\d:\d{2}\.\d{3}$/));
  });

  it('redraws without duplicating elements when data changes', () => {
    const { container, rerender } = renderChart();
    const fewer = data.slice(0, 5);
    rerender(<LapTimeChart data={fewer} driverName="Max VERSTAPPEN" colour="red" />);
    expect(container.querySelectorAll('path.lap-line')).toHaveLength(1);
    expect(container.querySelectorAll('circle.lap-dot')).toHaveLength(5);
    expect(container.querySelectorAll('g.x-axis')).toHaveLength(1);
  });

  it('shows an empty state instead of an svg when there are no laps', () => {
    renderChart({ data: [] });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText(/no lap times for max verstappen/i)).toBeInTheDocument();
  });
});
