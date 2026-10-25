// F1 icon set generated with d3-shape on a 24×24 grid. Pure data: each icon is a list of
// parts { d, mode, part, at? }, where `mode` is 'stroke' or 'fill', `part` names the piece the
// stylesheet animates (needle, flag, trace…), and `at` = [cx, cy] places an origin-centred
// d3 arc on the grid (applied as an SVG translate; arc paths can't be shifted textually).
import { arc, curveBasis, curveCatmullRomClosed, line } from 'd3-shape';

const TAU = Math.PI * 2;
const r2 = (n) => Math.round(n * 100) / 100;
const at = (cx, cy, r, a) => [r2(cx + r * Math.sin(a)), r2(cy - r * Math.cos(a))];
const poly = (pts, close = false) => `M${pts.map((p) => p.join(',')).join('L')}${close ? 'Z' : ''}`;
const ringArc = (r, a0, a1) =>
  arc()({ innerRadius: r, outerRadius: r, startAngle: a0, endAngle: a1 });
const disc = (r) => arc()({ innerRadius: 0, outerRadius: r, startAngle: 0, endAngle: TAU });

/** Speedometer: 270° dial, tick marks, redline, needle. */
function gauge() {
  const cx = 12;
  const cy = 13;
  const start = -0.75 * Math.PI;
  const end = 0.75 * Math.PI;
  const ticks = Array.from({ length: 7 }, (_, i) => {
    const a = start + ((end - start) * i) / 6;
    return poly([at(cx, cy, 8.6, a), at(cx, cy, i % 3 === 0 ? 6.4 : 7.3, a)]);
  }).join('');
  return [
    { mode: 'stroke', part: 'dial', d: ringArc(9.5, start, end), at: [cx, cy] },
    { mode: 'stroke', part: 'ticks', d: ticks },
    {
      mode: 'fill',
      part: 'redline',
      d: arc()({ innerRadius: 8.4, outerRadius: 9.6, startAngle: 0.45 * Math.PI, endAngle: end }),
      at: [cx, cy],
    },
    { mode: 'stroke', part: 'needle', d: poly([[cx, cy], at(cx, cy, 6.8, 0.15 * Math.PI)]) },
    { mode: 'fill', part: 'hub', d: disc(1.6), at: [cx, cy] },
  ];
}

/** Chequered flag on a pole; the flag edges are d3 basis curves so it looks like it waves. */
function chequeredFlag() {
  const x0 = 6;
  const y0 = 3.5;
  const w = 14;
  const h = 10;
  const cols = 4;
  const rows = 3;
  const wave = (t) => Math.sin(t * Math.PI * 1.6) * 1.1;
  const edge = (y) => Array.from({ length: 9 }, (_, i) => [x0 + (w * i) / 8, y + wave(i / 8)]);
  const curve = line().curve(curveBasis);
  const outline = `${curve(edge(y0))}L${curve(edge(y0 + h).reverse()).slice(1)}Z`;
  const squares = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 2) continue;
      const xa = x0 + (w * c) / cols;
      const xb = x0 + (w * (c + 1)) / cols;
      const ya = y0 + (h * r) / rows;
      const yb = y0 + (h * (r + 1)) / rows;
      const ta = c / cols;
      const tb = (c + 1) / cols;
      squares.push(
        poly(
          [
            [r2(xa), r2(ya + wave(ta))],
            [r2(xb), r2(ya + wave(tb))],
            [r2(xb), r2(yb + wave(tb))],
            [r2(xa), r2(yb + wave(ta))],
          ],
          true,
        ),
      );
    }
  }
  return [
    {
      mode: 'stroke',
      part: 'pole',
      d: poly([
        [x0, 2.5],
        [x0, 21.5],
      ]),
    },
    { mode: 'stroke', part: 'flag', d: outline },
    { mode: 'fill', part: 'flag', d: squares.join('') },
  ];
}

/** A race track: closed Catmull-Rom loop with a start/finish line. */
function track() {
  const pts = [
    [4.5, 15],
    [4, 9],
    [7, 5],
    [11, 6.5],
    [12.5, 10],
    [16, 6],
    [20, 7.5],
    [19.5, 12],
    [15.5, 14],
    [18.5, 18],
    [13, 19.5],
    [8, 18.5],
  ];
  return [
    { mode: 'stroke', part: 'trace', d: line().curve(curveCatmullRomClosed.alpha(0.5))(pts) },
    {
      mode: 'stroke',
      part: 'start',
      d: poly([
        [3.2, 13.2],
        [6.2, 12.6],
      ]),
    },
  ];
}

/** Podium with a star over P1. */
function podium() {
  const star = Array.from({ length: 10 }, (_, i) => at(12, 6, i % 2 ? 1.4 : 3.3, (i * TAU) / 10));
  return [
    { mode: 'fill', part: 'star', d: poly(star, true) },
    {
      mode: 'stroke',
      part: 'blocks',
      d: poly(
        [
          [2.5, 21],
          [2.5, 15],
          [8.5, 15],
          [8.5, 11.5],
          [15.5, 11.5],
          [15.5, 17],
          [21.5, 17],
          [21.5, 21],
        ],
        true,
      ),
    },
    {
      mode: 'stroke',
      part: 'dividers',
      d: `${poly([
        [8.5, 15],
        [8.5, 21],
      ])}${poly([
        [15.5, 17],
        [15.5, 21],
      ])}`,
    },
  ];
}

/** Calendar page with binder rings and a highlighted race day. */
function calendar() {
  const dots = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      if (r === 1 && c === 2) continue;
      dots.push({
        mode: 'fill',
        part: 'days',
        d: disc(0.75),
        at: [r2(6.5 + c * 3.7), r2(12.5 + r * 3.8)],
      });
    }
  }
  return [
    {
      mode: 'stroke',
      part: 'frame',
      d: 'M4,5.5H20Q21,5.5 21,6.5V19.5Q21,20.5 20,20.5H4Q3,20.5 3,19.5V6.5Q3,5.5 4,5.5Z',
    },
    { mode: 'stroke', part: 'rings', d: 'M8,3.5L8,7M16,3.5L16,7M3,9.5L21,9.5' },
    ...dots,
    { mode: 'fill', part: 'raceday', d: 'M12.3,14.7H16.3V18.7H12.3Z' },
  ];
}

/** Steering wheel: rim, spokes, hub and shift paddles — for teams. */
function steeringWheel() {
  return [
    {
      mode: 'stroke',
      part: 'rim',
      d: ringArc(9, -0.62 * Math.PI, 0.62 * Math.PI) + ringArc(9, 0.78 * Math.PI, 1.22 * Math.PI),
      at: [12, 12],
    },
    { mode: 'stroke', part: 'spokes', d: 'M3.5,11L9,12.5M20.5,11L15,12.5M12,15L12,20.6' },
    { mode: 'stroke', part: 'hub', d: ringArc(3, 0, TAU), at: [12, 12] },
    { mode: 'fill', part: 'shift', d: 'M7.4,3.2L9.2,2.4L9.6,4.2ZM16.6,3.2L14.8,2.4L14.4,4.2Z' },
  ];
}

/** Lap replay: a circular arrow around a play triangle. */
function replay() {
  const a0 = -0.15 * Math.PI;
  const [tx, ty] = at(12, 12, 9, a0);
  return [
    { mode: 'stroke', part: 'loop', d: ringArc(9, a0, 1.6 * Math.PI), at: [12, 12] },
    {
      mode: 'fill',
      part: 'arrow',
      d: poly(
        [
          [r2(tx - 2.6), r2(ty - 1.2)],
          [r2(tx + 1.4), r2(ty - 2.8)],
          [r2(tx + 0.6), r2(ty + 1.6)],
        ],
        true,
      ),
    },
    { mode: 'fill', part: 'play', d: 'M10,8.5L15.5,12L10,15.5Z' },
  ];
}

const chevrons = (dir) => {
  const s = dir === 'left' ? -1 : 1;
  const c = (x) =>
    poly([
      [x - 2.5 * s, 7],
      [x + 2.5 * s, 12],
      [x - 2.5 * s, 17],
    ]);
  return [{ mode: 'stroke', part: 'chevrons', d: c(9) + c(15) }];
};

export const ICONS = {
  dashboard: gauge(),
  results: chequeredFlag(),
  standings: podium(),
  calendar: calendar(),
  circuits: track(),
  teams: steeringWheel(),
  replay: replay(),
  collapse: chevrons('left'),
  expand: chevrons('right'),
  menu: [{ mode: 'stroke', part: 'bars', d: 'M4,7L20,7M4,12L20,12M4,17L14,17' }],
  close: [{ mode: 'stroke', part: 'cross', d: 'M6,6L18,18M18,6L6,18' }],
};
