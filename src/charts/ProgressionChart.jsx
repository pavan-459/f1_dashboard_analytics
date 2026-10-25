import { useEffect, useRef, useState } from 'react';
import { bisectCenter, max } from 'd3-array';
import { axisBottom, axisLeft } from 'd3-axis';
import { scaleLinear } from 'd3-scale';
import { pointer, select } from 'd3-selection';
import { line } from 'd3-shape';
import 'd3-transition';
import { formatPoints } from '../transforms/format.js';
import { prefersReducedMotion, useResponsiveSvg } from './useResponsiveSvg.js';
import styles from './ProgressionChart.module.css';

const HEIGHT = 300;
const MARGIN = { top: 16, right: 44, bottom: 30, left: 40 };
const LABEL_MIN_GAP = 13;

/**
 * Championship points after each round, one line per driver, with a marker on the selected round.
 * @param {{
 *   series: { id: string, label: string, name: string, colour: string, values: { index: number, points: number }[] }[],
 *   rounds: import('../transforms/championship.js').Round[],
 *   currentIndex: number,
 *   onSelectIndex?: (index: number) => void,
 * }} props
 */
export default function ProgressionChart({ series, rounds, currentIndex, onSelectIndex }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const width = useResponsiveSvg(wrapRef);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const svg = select(svgRef.current);
    const ms = prefersReducedMotion() ? 0 : 400;
    const last = Math.max(rounds.length - 1, 1);
    const x = scaleLinear()
      .domain([0, last])
      .range([MARGIN.left, width - MARGIN.right]);
    const y = scaleLinear()
      .domain([0, Math.max(10, max(series, (s) => max(s.values, (v) => v.points)) ?? 10)])
      .nice()
      .range([HEIGHT - MARGIN.bottom, MARGIN.top]);

    // Roughly one tick label per 34px, so phones get fewer.
    const every = Math.max(1, Math.ceil(rounds.length / Math.max(1, (width - 80) / 34)));
    svg
      .selectAll('g.x-axis')
      .data([null])
      .join('g')
      .attr('class', `x-axis ${styles.axis}`)
      .attr('transform', `translate(0,${HEIGHT - MARGIN.bottom})`)
      .call(
        axisBottom(x)
          .tickValues(rounds.map((_, i) => i).filter((i) => i % every === 0 || i === last))
          .tickFormat((i) => {
            const r = rounds[i];
            return r ? `${r.countryCode ?? r.location.slice(0, 3)}${r.isSprint ? '·S' : ''}` : '';
          })
          .tickSizeOuter(0),
      );

    svg
      .selectAll('g.y-axis')
      .data([null])
      .join('g')
      .attr('class', `y-axis ${styles.axis} ${styles.grid}`)
      .attr('transform', `translate(${MARGIN.left},0)`)
      .call(
        axisLeft(y)
          .ticks(5)
          .tickSize(-(width - MARGIN.left - MARGIN.right)),
      )
      .call((g) => g.select('.domain').remove());

    svg
      .selectAll('line.now')
      .data([currentIndex])
      .join('line')
      .attr('class', `now ${styles.now}`)
      .attr('y1', MARGIN.top - 6)
      .attr('y2', HEIGHT - MARGIN.bottom)
      .transition()
      .duration(ms)
      .attr('x1', (i) => x(i))
      .attr('x2', (i) => x(i));

    const draw = line()
      .x((v) => x(v.index))
      .y((v) => y(v.points));

    svg
      .selectAll('path.series')
      .data(series, (s) => s.id)
      .join('path')
      .attr('class', `series ${styles.line}`)
      .style('stroke', (s) => s.colour)
      .attr('d', (s) => draw(s.values));

    // Points at the selected round, with a surface ring.
    const atNow = series
      .map((s) => ({ s, v: s.values.find((v) => v.index === currentIndex) }))
      .filter((d) => d.v);
    svg
      .selectAll('circle.dot')
      .data(atNow, (d) => d.s.id)
      .join('circle')
      .attr('class', `dot ${styles.dot}`)
      .attr('r', 4.5)
      .style('fill', (d) => d.s.colour)
      .transition()
      .duration(ms)
      .attr('cx', (d) => x(d.v.index))
      .attr('cy', (d) => y(d.v.points));

    // Direct end labels, skipped where they'd collide (the legend still names every line).
    const ends = series
      .map((s) => ({ s, v: s.values.at(-1) }))
      .filter((d) => d.v)
      .sort((a, b) => y(a.v.points) - y(b.v.points));
    let lastY = -Infinity;
    const labelled = ends.filter((d) => {
      const yy = y(d.v.points);
      if (yy - lastY < LABEL_MIN_GAP) return false;
      lastY = yy;
      return true;
    });
    svg
      .selectAll('text.end-label')
      .data(labelled, (d) => d.s.id)
      .join('text')
      .attr('class', `end-label ${styles.endLabel}`)
      .attr('x', (d) => x(d.v.index) + 6)
      .attr('y', (d) => y(d.v.points))
      .attr('dy', '0.35em')
      .text((d) => d.s.label);

    // Crosshair: nearest round under the pointer.
    const indices = rounds.map((_, i) => i);
    svg
      .selectAll('line.cross')
      .data([null])
      .join('line')
      .attr('class', `cross ${styles.cross}`)
      .attr('y1', MARGIN.top)
      .attr('y2', HEIGHT - MARGIN.bottom)
      .style('opacity', 0);
    svg
      .selectAll('rect.overlay')
      .data([null])
      .join('rect')
      .attr('class', `overlay ${styles.overlay}`)
      .attr('x', MARGIN.left - 8)
      .attr('y', 0)
      .attr('width', Math.max(0, width - MARGIN.left - MARGIN.right + 16))
      .attr('height', HEIGHT)
      .on('pointerenter pointermove', (event) => {
        const [px] = pointer(event);
        const i =
          indices[
            bisectCenter(
              indices.map((j) => x(j)),
              px,
            )
          ];
        if (i === undefined) return;
        svg.select('line.cross').attr('x1', x(i)).attr('x2', x(i)).style('opacity', 1);
        setHover({ index: i, left: x(i) });
      })
      .on('pointerleave', () => {
        svg.select('line.cross').style('opacity', 0);
        setHover(null);
      })
      .on('click', (event) => {
        const [px] = pointer(event);
        const i =
          indices[
            bisectCenter(
              indices.map((j) => x(j)),
              px,
            )
          ];
        if (i !== undefined) onSelectIndex?.(i);
      });

    return () => svg.selectAll('*').interrupt();
  }, [series, rounds, currentIndex, width, onSelectIndex]);

  useEffect(() => {
    const svg = svgRef.current;
    return () => select(svg).selectAll('*').interrupt().remove();
  }, []);

  const hoverRows =
    hover &&
    series
      .map((s) => ({ s, v: s.values.find((v) => v.index === hover.index) }))
      .filter((d) => d.v)
      .sort((a, b) => b.v.points - a.v.points);
  const hoverRound = hover && rounds[hover.index];

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <svg
        ref={svgRef}
        className={styles.chart}
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label={`Championship points after each round for ${series.map((s) => s.name).join(', ')}`}
      />
      {hover && hoverRound && (
        <div
          className={styles.tip}
          style={{ left: Math.min(Math.max(hover.left, 90), width - 90) }}
          role="status"
        >
          <strong>
            R{hoverRound.round} {hoverRound.location}
            {hoverRound.isSprint ? ' Sprint' : ''}
          </strong>
          {hoverRows.map(({ s, v }) => (
            <span key={s.id} className={styles.tipRow}>
              <i style={{ background: s.colour }} />
              {s.label}
              <b>{formatPoints(v.points)}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
