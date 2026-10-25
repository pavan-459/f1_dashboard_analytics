import { useEffect, useMemo, useRef } from 'react';
import { select } from 'd3-selection';
import { curveCatmullRomClosed, line } from 'd3-shape';
import { toTrackOutline } from '../transforms/circuits.js';
import { useResponsiveSvg } from './useResponsiveSvg.js';
import styles from './TrackMap.module.css';

/**
 * Circuit outline drawn from MultiViewer track data: a wide asphalt stroke, a racing line,
 * numbered corners and a start/finish marker. D3 owns everything inside the <svg>.
 * `top` reserves a band for overlaid badges (status pill, flag) so the track never sits under them.
 * @param {{ info: import('../transforms/circuits.js').CircuitInfo | null, name: string, height?: number, showCorners?: boolean, top?: number }} props
 */
export default function TrackMap({ info, name, height = 200, showCorners = true, top = 36 }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const width = useResponsiveSvg(wrapRef, 320);
  const outline = useMemo(() => {
    const o = toTrackOutline(info, { width, height: height - top, padding: 16 });
    const down = ([x, y]) => [x, y + top];
    return {
      points: o.points.map(down),
      corners: o.corners.map((c) => ({ ...c, y: c.y + top })),
      start: o.start && down(o.start),
    };
  }, [info, width, height, top]);

  useEffect(() => {
    const svg = select(svgRef.current);
    const d = outline.points.length ? line().curve(curveCatmullRomClosed)(outline.points) : null;

    svg
      .selectAll('path.asphalt')
      .data(d ? [d] : [])
      .join('path')
      .attr('class', `asphalt ${styles.asphalt}`)
      .attr('d', (v) => v);
    svg
      .selectAll('path.racing-line')
      .data(d ? [d] : [])
      .join('path')
      .attr('class', `racing-line ${styles.racingLine}`)
      .attr('d', (v) => v);

    // Start/finish: a short chequered bar across the track at the first outline point.
    const [p0, p1] = outline.points;
    const sf =
      p0 && p1 ? [{ p0, angle: (Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180) / Math.PI }] : [];
    svg
      .selectAll('g.start')
      .data(sf)
      .join((enter) => {
        const g = enter.append('g').attr('class', `start ${styles.start}`);
        g.append('rect').attr('x', -2).attr('y', -7).attr('width', 4).attr('height', 14);
        g.append('rect')
          .attr('class', styles.check)
          .attr('x', -2)
          .attr('y', -7)
          .attr('width', 2)
          .attr('height', 3.5);
        g.append('rect')
          .attr('class', styles.check)
          .attr('x', 0)
          .attr('y', -3.5)
          .attr('width', 2)
          .attr('height', 3.5);
        g.append('rect')
          .attr('class', styles.check)
          .attr('x', -2)
          .attr('y', 0)
          .attr('width', 2)
          .attr('height', 3.5);
        g.append('rect')
          .attr('class', styles.check)
          .attr('x', 0)
          .attr('y', 3.5)
          .attr('width', 2)
          .attr('height', 3.5);
        return g;
      })
      .attr('transform', (s) => `translate(${s.p0[0]},${s.p0[1]}) rotate(${s.angle})`);

    const corners = showCorners ? outline.corners : [];
    svg
      .selectAll('g.corner')
      .data(corners, (c) => c.number)
      .join((enter) => {
        const g = enter.append('g').attr('class', `corner ${styles.corner}`);
        g.append('circle').attr('r', 6.5);
        g.append('text').attr('dy', '0.35em');
        return g;
      })
      .attr('transform', (c) => `translate(${c.x},${c.y})`)
      .call((g) => g.select('text').text((c) => c.number));

    return () => svg.selectAll('*').interrupt();
  }, [outline, showCorners]);

  useEffect(() => {
    const svg = svgRef.current;
    return () => select(svg).selectAll('*').remove();
  }, []);

  const label = outline.points.length
    ? `Track map of ${name}${outline.corners.length ? ` with ${outline.corners.length} numbered corners` : ''}`
    : `Track map of ${name} unavailable`;

  return (
    <div ref={wrapRef} className={styles.wrap} data-empty={!outline.points.length || undefined}>
      <svg
        ref={svgRef}
        className={styles.map}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={label}
      />
    </div>
  );
}
