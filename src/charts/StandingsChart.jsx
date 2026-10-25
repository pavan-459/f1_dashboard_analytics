import { useEffect, useRef, useState } from 'react';
import { max } from 'd3-array';
import { easeCubicInOut } from 'd3-ease';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import 'd3-transition';
import { formatPoints, formatSigned, ordinal } from '../transforms/format.js';
import { barPath } from './barPath.js';
import { prefersReducedMotion, useResponsiveSvg } from './useResponsiveSvg.js';
import styles from './StandingsChart.module.css';

const ROW = 28;
const BAR = 20;
const RADIUS = 4;
const GAP = 2;
const MARGIN = { top: 4, right: 48, bottom: 4 };

/**
 * Championship standings as horizontal stacked bars: points before this round + points gained.
 * Rows are keyed by id, so when the round changes bars slide to their new rank.
 * @param {{
 *   rows: import('../transforms/championship.js').StandingRow[],
 *   ariaLabel: string,
 *   labelWidth?: number,
 *   duration?: number,
 * }} props
 */
export default function StandingsChart({ rows, ariaLabel, labelWidth = 76, duration = 650 }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const width = useResponsiveSvg(wrapRef);
  const [tip, setTip] = useState(null);
  const height = MARGIN.top + rows.length * ROW + MARGIN.bottom;

  useEffect(() => {
    const svg = select(svgRef.current);
    const ms = prefersReducedMotion() ? 0 : duration;
    const left = labelWidth;
    const x = scaleLinear()
      .domain([0, Math.max(1, max(rows, (d) => d.points) ?? 1)])
      .range([left, Math.max(left + 40, width - MARGIN.right)]);
    const yOf = (i) => MARGIN.top + i * ROW;
    const barY = (ROW - BAR) / 2;
    const startEnd = (d) => (d.gained > 0 ? x(d.pointsStart) - GAP / 2 : x(d.points));
    const gainStart = (d) => (d.gained > 0 ? x(d.pointsStart) + GAP / 2 : x(d.points));

    const showTip = (event, d) => {
      const box = wrapRef.current.getBoundingClientRect();
      setTip({
        row: d,
        left: Math.min(Math.max(event.clientX - box.left, 90), box.width - 90 || 90),
        top: yOf(rows.indexOf(d)),
      });
    };

    const t = svg.transition().duration(ms).ease(easeCubicInOut);
    // Without animation (reduced motion, tests) apply changes directly, not on a timer.
    const tr = (sel) => (ms ? sel.transition(t) : sel);

    svg
      .selectAll('g.row')
      .data(rows, (d) => d.id)
      .join(
        (enter) => {
          const g = enter
            .append('g')
            .attr('class', `row ${styles.row}`)
            .attr('transform', (d, i) => `translate(0,${yOf(i)})`)
            .style('opacity', 0);
          g.append('rect').attr('class', `hit ${styles.hit}`).attr('height', ROW);
          g.append('text')
            .attr('class', `pos ${styles.pos}`)
            .attr('x', 22)
            .attr('y', ROW / 2)
            .attr('dy', '0.35em');
          g.append('rect')
            .attr('class', `swatch ${styles.swatch}`)
            .attr('x', 28)
            .attr('y', (ROW - 14) / 2)
            .attr('width', 3)
            .attr('height', 14)
            .attr('rx', 1.5);
          g.append('text')
            .attr('class', `name ${styles.name}`)
            .attr('x', 36)
            .attr('y', ROW / 2)
            .attr('dy', '0.35em');
          g.append('path').attr('class', `bar-start ${styles.barStart}`);
          g.append('path').attr('class', `bar-gain ${styles.barGain}`);
          g.append('text')
            .attr('class', `value ${styles.value}`)
            .attr('y', ROW / 2)
            .attr('dy', '0.35em');
          return g;
        },
        (update) => update,
        (exit) => tr(exit).style('opacity', 0).remove(),
      )
      .on('pointerenter pointermove', showTip)
      .on('pointerleave', () => setTip(null))
      .call((g) => {
        g.select('rect.hit').attr('width', width);
        g.select('text.pos').text((d) => d.position);
        g.select('rect.swatch').style('fill', (d) => d.colour ?? 'var(--color-series-default)');
        g.select('text.name').text((d) => d.label);
        tr(g)
          .style('opacity', 1)
          .attr('transform', (d, i) => `translate(0,${yOf(i)})`);
        tr(g.select('path.bar-start')).attr('d', (d) =>
          barPath(left, startEnd(d), barY, BAR, d.gained > 0 ? 0 : RADIUS),
        );
        tr(g.select('path.bar-gain')).attr('d', (d) =>
          barPath(gainStart(d), x(d.points), barY, BAR, RADIUS),
        );
        tr(g.select('text.value').text((d) => formatPoints(d.points))).attr(
          'x',
          (d) => x(d.points) + 6,
        );
      });

    return () => {
      svg.interrupt();
      svg.selectAll('*').interrupt();
    };
  }, [rows, width, labelWidth, duration]);

  // Unmount: drop everything D3 drew.
  useEffect(() => {
    const svg = svgRef.current;
    return () => select(svg).selectAll('*').interrupt().remove();
  }, []);

  return (
    <div className={styles.wrap}>
      <div className={styles.legend} aria-hidden="true">
        <span>
          <i className={styles.keyStart} /> Before this round
        </span>
        <span>
          <i className={styles.keyGain} /> Gained this round
        </span>
      </div>
      <div ref={wrapRef} className={styles.plot} onPointerLeave={() => setTip(null)}>
        <svg
          ref={svgRef}
          className={styles.chart}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={ariaLabel}
        />
        {tip && (
          <div className={styles.tip} style={{ left: tip.left, top: tip.top }} role="status">
            <strong>
              {ordinal(tip.row.position)} · {tip.row.name}
            </strong>
            {tip.row.team && tip.row.team !== tip.row.name && <span>{tip.row.team}</span>}
            <span>
              {formatPoints(tip.row.points)} pts · {formatSigned(tip.row.gained)} this round
            </span>
            {tip.row.change !== 0 && (
              <span>
                {tip.row.change > 0 ? '▲' : '▼'} {Math.abs(tip.row.change)}{' '}
                {Math.abs(tip.row.change) === 1 ? 'place' : 'places'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
