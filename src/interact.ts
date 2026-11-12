// Pure interaction helpers: picking, insertion position, inside test, auto-order.
import { bandPrimitives, distanceToPrim, normAngle, samplePrimitives, type Pt, type SCircle } from './band';
import type { CircleDoc } from './document';

export type PickAction = 'move' | 'resize';
export interface PickResult {
  id: string;
  action: PickAction;
}

/**
 * Which circle the pointer grabs, in priority order (all distances in document units):
 * 1. the selected circle's rim within `tol` → resize
 * 2. the nearest centre within `tol` → move
 * 3. the nearest rim within `tol` → move
 * 4. the smallest circle containing the point with r ≤ maxContainR → move
 */
export function pick(
  p: Pt, circles: CircleDoc[], selectedId: string | null, tol: number, maxContainR: number,
): PickResult | null {
  const dist = (c: CircleDoc) => Math.hypot(p.x - c.x, p.y - c.y);
  const sel = selectedId ? circles.find((c) => c.id === selectedId) : undefined;
  if (sel && Math.abs(dist(sel) - sel.r) <= tol) return { id: sel.id, action: 'resize' };

  let best: CircleDoc | undefined;
  let bestD = Infinity;
  for (const c of circles) {
    const d = dist(c);
    if (d <= tol && d < bestD) {
      best = c;
      bestD = d;
    }
  }
  if (best) return { id: best.id, action: 'move' };

  for (const c of circles) {
    const d = Math.abs(dist(c) - c.r);
    if (d <= tol && d < bestD) {
      best = c;
      bestD = d;
    }
  }
  if (best) return { id: best.id, action: 'move' };

  let smallest: CircleDoc | undefined;
  for (const c of circles) {
    if (c.r <= maxContainR && dist(c) <= c.r && (!smallest || c.r < smallest.r)) smallest = c;
  }
  return smallest ? { id: smallest.id, action: 'move' } : null;
}

/**
 * Index of the circle after which a new circle at `p` should be inserted: the
 * stretch of band (tangent line, or the nearer half of an arc) closest to `p`.
 * With fewer than two circles, returns the last index (append).
 */
export function nearestSegment(p: Pt, C: SCircle[]): number {
  const n = C.length;
  if (n < 2) return n - 1;
  const prims = bandPrimitives(C); // [arc0, line0, arc1, line1, …]
  let k = 0;
  let bestD = Infinity;
  prims.forEach((prim, i) => {
    const d = distanceToPrim(p, prim);
    if (d < bestD) {
      bestD = d;
      k = i;
    }
  });
  const i = Math.floor(k / 2);
  if (k % 2 === 1) return i; // tangent line i → i+1
  const arc = prims[k];
  if (arc.kind !== 'arc') return i;
  const delta = normAngle(arc.dir * (Math.atan2(p.y - arc.cy, p.x - arc.cx) - arc.a0));
  let firstHalf: boolean;
  if (delta <= arc.sweep) {
    firstHalf = delta < arc.sweep / 2;
  } else {
    // Outside the arc's range: whichever end is closer.
    firstHalf = delta - arc.sweep > 2 * Math.PI - delta;
  }
  return firstHalf ? (i - 1 + n) % n : i;
}

/** Whether `p` lies inside the filled band (non-zero winding on a sampled outline). */
export function insideBand(p: Pt, C: SCircle[]): boolean {
  if (C.length === 0) return false;
  const poly = samplePrimitives(bandPrimitives(C), 32);
  let winding = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cross = (b.x - a.x) * (p.y - a.y) - (p.x - a.x) * (b.y - a.y);
    if (a.y <= p.y) {
      if (b.y > p.y && cross > 0) winding++;
    } else if (b.y <= p.y && cross < 0) {
      winding--;
    }
  }
  return winding !== 0;
}

/**
 * Circles sorted clockwise (screen space, y down) by the angle of their centres
 * around the mean of all centres, rotated so the current first circle stays first.
 */
export function autoOrder(circles: CircleDoc[]): CircleDoc[] {
  if (circles.length < 3) return circles;
  const cx = circles.reduce((s, c) => s + c.x, 0) / circles.length;
  const cy = circles.reduce((s, c) => s + c.y, 0) / circles.length;
  const sorted = circles
    .map((c) => ({ c, a: Math.atan2(c.y - cy, c.x - cx) }))
    .sort((u, v) => u.a - v.a)
    .map((u) => u.c);
  const k = sorted.indexOf(circles[0]);
  return [...sorted.slice(k), ...sorted.slice(0, k)];
}
