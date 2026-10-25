/**
 * Horizontal bar from x0 to x1 with a rounded data-end (right) and a square baseline (left).
 * Always emits the same command structure so D3 can interpolate between bars.
 * @param {number} x0
 * @param {number} x1
 * @param {number} y top
 * @param {number} h height
 * @param {number} r corner radius at the data-end (0 for a square end)
 */
export function barPath(x0, x1, y, h, r) {
  const w = Math.max(0, x1 - x0);
  const rr = Math.min(r, w, h / 2);
  return (
    `M${x0},${y}H${x0 + w - rr}Q${x0 + w},${y} ${x0 + w},${y + rr}` +
    `V${y + h - rr}Q${x0 + w},${y + h} ${x0 + w - rr},${y + h}H${x0}Z`
  );
}
