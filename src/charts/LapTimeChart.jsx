import { useEffect, useRef } from 'react';
import { extent, max, min } from 'd3-array';
import { axisBottom, axisLeft } from 'd3-axis';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { line } from 'd3-shape';
import { formatLapTime } from '../transforms/format.js';
import { useResponsiveSvg } from './useResponsiveSvg.js';
import styles from './LapTimeChart.module.css';

const HEIGHT = 300;
const MARGIN = { top: 16, right: 16, bottom: 32, left: 64 };

/**
 * Lap-time line for one driver, sized to its container. D3 owns everything inside the <svg>.
 * @param {{ data: import('../transforms/lapTimes.js').LapTime[], driverName: string, colour: string }} props
 */
export default function LapTimeChart({ data, driverName, colour }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const width = useResponsiveSvg(wrapRef, 720);

  useEffect(() => {
    if (!data.length) return;
    const svg = select(svgRef.current);

    const x = scaleLinear()
      .domain(extent(data, (d) => d.lap))
      .range([MARGIN.left, width - MARGIN.right]);
    // Pad the y domain so the dots don't sit on the axes.
    const lo = min(data, (d) => d.seconds);
    const hi = max(data, (d) => d.seconds);
    const pad = Math.max((hi - lo) * 0.05, 0.5);
    const y = scaleLinear()
      .domain([lo - pad, hi + pad])
      .nice()
      .range([HEIGHT - MARGIN.bottom, MARGIN.top]);

    svg
      .selectAll('g.x-axis')
      .data([null])
      .join('g')
      .attr('class', `x-axis ${styles.axis}`)
      .attr('transform', `translate(0,${HEIGHT - MARGIN.bottom})`)
      .call(
        axisBottom(x)
          .ticks(Math.min(data.length, Math.max(3, Math.floor(width / 70))))
          .tickFormat((d) => `L${d}`),
      );

    svg
      .selectAll('g.y-axis')
      .data([null])
      .join('g')
      .attr('class', `y-axis ${styles.axis}`)
      .attr('transform', `translate(${MARGIN.left},0)`)
      .call(
        axisLeft(y)
          .ticks(6)
          .tickFormat(formatLapTime)
          .tickSize(-(width - MARGIN.left - MARGIN.right)),
      );

    svg
      .selectAll('path.lap-line')
      .data([data])
      .join('path')
      .attr('class', `lap-line ${styles.line}`)
      .style('stroke', colour)
      .attr(
        'd',
        line()
          .x((d) => x(d.lap))
          .y((d) => y(d.seconds)),
      );

    svg
      .selectAll('circle.lap-dot')
      .data(data, (d) => d.lap)
      .join('circle')
      .attr('class', (d) => `lap-dot ${styles.dot} ${d.isPitOutLap ? styles.pitOut : ''}`)
      .attr('cx', (d) => x(d.lap))
      .attr('cy', (d) => y(d.seconds))
      .attr('r', 4)
      .style('fill', colour)
      .selectAll('title')
      .data((d) => [d])
      .join('title')
      .text((d) => `Lap ${d.lap}: ${formatLapTime(d.seconds)}${d.isPitOutLap ? ' (pit out)' : ''}`);

    return () => {
      // No transitions yet; add .interrupt() here once d3-transition is in use.
      svg.selectAll('*').remove();
    };
  }, [data, colour, width]);

  if (!data.length) {
    return <p className={styles.empty}>No lap times for {driverName} in this session.</p>;
  }

  return (
    <div ref={wrapRef}>
      <svg
        ref={svgRef}
        className={styles.chart}
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label={`Lap times for ${driverName}, ${data.length} laps`}
        tabIndex={0}
      />
    </div>
  );
}
