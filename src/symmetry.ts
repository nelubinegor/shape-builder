// Vertical mirror symmetry: circles are paired with a twin across x = width / 2.
import { newId, type CircleDoc } from './document';

export const PAIR_TOLERANCE = 0.5;

const AXIS_EPS = 1e-9;

export function axisX(width: number): number {
  return width / 2;
}

export function isAxisCircle(c: CircleDoc, width: number): boolean {
  return !c.twinId && Math.abs(c.x - axisX(width)) < AXIS_EPS;
}

/** The circle's mirror: its twin, itself if on the axis, otherwise undefined. */
export function mirrorOf(circles: CircleDoc[], c: CircleDoc, width: number): CircleDoc | undefined {
  if (c.twinId) return circles.find((o) => o.id === c.twinId);
  return isAxisCircle(c, width) ? c : undefined;
}

export function mirrorValues(c: Pick<CircleDoc, 'x' | 'y' | 'r' | 'mode'>, width: number) {
  return { x: width - c.x, y: c.y, r: c.r, mode: c.mode };
}

/** Pairs circles whose mirrored positions match within tolerance; snaps near-axis circles to the axis. */
export function pairCircles(circles: CircleDoc[], width: number, tol = PAIR_TOLERANCE): CircleDoc[] {
  const ax = axisX(width);
  const out = circles.map((c): CircleDoc => {
    const { twinId: _drop, ...rest } = c;
    void _drop;
    return Math.abs(c.x - ax) <= tol ? { ...rest, x: ax } : { ...rest };
  });
  const taken = new Set<number>();
  for (let i = 0; i < out.length; i++) {
    const c = out[i];
    if (c.x === ax || taken.has(i)) continue;
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < out.length; j++) {
      if (j === i || taken.has(j) || out[j].x === ax) continue;
      const o = out[j];
      if (Math.sign(o.x - ax) === Math.sign(c.x - ax)) continue;
      const d = Math.hypot(width - o.x - c.x, o.y - c.y);
      if (d <= tol && d < bestD) {
        best = j;
        bestD = d;
      }
    }
    if (best >= 0) {
      taken.add(i);
      taken.add(best);
      out[i] = { ...c, twinId: out[best].id };
      out[best] = { ...out[best], twinId: c.id };
    }
  }
  return out;
}

export function clearPairs(circles: CircleDoc[]): CircleDoc[] {
  return circles.map((c) => {
    if (!c.twinId) return c;
    const { twinId: _drop, ...rest } = c;
    void _drop;
    return rest;
  });
}

export type CirclePatch = Partial<Pick<CircleDoc, 'x' | 'y' | 'r' | 'mode'>>;

/** Applies a patch to a circle and mirrors it onto its twin; axis circles stay on the axis. */
export function editMirrored(circles: CircleDoc[], id: string, patch: CirclePatch, width: number): CircleDoc[] {
  const c = circles.find((o) => o.id === id);
  if (!c) return circles;
  const onAxis = isAxisCircle(c, width);
  const updated = { ...c, ...patch };
  if (onAxis) updated.x = axisX(width);
  const twin = c.twinId ? circles.find((o) => o.id === c.twinId) : undefined;
  const twinUpdated = twin ? { ...twin, ...mirrorValues(updated, width) } : undefined;
  return circles.map((o) => (o.id === id ? updated : twin && o.id === twin.id ? twinUpdated! : o));
}

/**
 * Inserts `circle` after `afterId` (or at the end) and, unless it lies on the axis,
 * a mirrored twin at the mirrored position in the loop. Mirroring reverses the
 * clockwise order, so the twin goes just before the mirror of the anchor circle.
 * Returns the new list and the inserted circle's id.
 */
export function insertMirrored(
  circles: CircleDoc[], afterId: string | null, circle: Omit<CircleDoc, 'id' | 'twinId'>, width: number,
): { circles: CircleDoc[]; id: string } {
  const ax = axisX(width);
  const id = newId();
  const anchorIdx = afterId ? circles.findIndex((c) => c.id === afterId) : circles.length - 1;
  const insertAt = anchorIdx < 0 ? circles.length : anchorIdx + 1;
  if (Math.abs(circle.x - ax) <= PAIR_TOLERANCE) {
    const out = [...circles];
    out.splice(insertAt, 0, { ...circle, x: ax, id });
    return { circles: out, id };
  }
  const twinId = newId();
  const main: CircleDoc = { ...circle, id, twinId };
  const twin: CircleDoc = { ...mirrorValues(circle, width), id: twinId, twinId: id };
  const out = [...circles];
  out.splice(insertAt, 0, main);
  if (circles.length === 0) {
    out.push(twin);
    return { circles: out, id };
  }
  const anchor = circles[anchorIdx < 0 ? circles.length - 1 : anchorIdx];
  const next = circles[(anchorIdx + 1) % circles.length];
  const anchorMirror = mirrorOf(circles, anchor, width);
  const nextMirror = mirrorOf(circles, next, width);
  if (anchorMirror) {
    out.splice(out.findIndex((c) => c.id === anchorMirror.id), 0, twin);
  } else if (nextMirror) {
    out.splice(out.findIndex((c) => c.id === nextMirror.id) + 1, 0, twin);
  } else {
    out.push(twin);
  }
  return { circles: out, id };
}

/** Removes a circle together with its twin. */
export function deleteMirrored(circles: CircleDoc[], id: string): CircleDoc[] {
  const c = circles.find((o) => o.id === id);
  if (!c) return circles;
  return circles.filter((o) => o.id !== id && o.id !== c.twinId);
}
