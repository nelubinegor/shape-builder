// High-level shape edits used by the UI. Pure: (shape, …) → shape. Symmetry-aware.
import type { Mode } from './band';
import { newId, presetShape, toSigned, type CircleDoc, type ShapeDoc } from './document';
import { autoOrder, insideBand, nearestSegment } from './interact';
import type { PresetName } from './presets';
import {
  clearPairs, deleteMirrored, editMirrored, insertMirrored, pairCircles, type CirclePatch,
} from './symmetry';

export const MIN_RADIUS = 0.5;
export const DEFAULT_RADIUS = 5;
export const DUPLICATE_OFFSET = 2;

const withCircles = (s: ShapeDoc, circles: CircleDoc[]): ShapeDoc => ({ ...s, circles });

export interface AddOptions {
  r?: number;
  mode?: Mode;
}

/** Inserts a circle after `afterId` (or at the end). Symmetry adds a mirrored twin. */
export function addCircle(
  s: ShapeDoc, width: number, at: { x: number; y: number }, afterId: string | null, opts: AddOptions = {},
): { shape: ShapeDoc; id: string } {
  const base = { x: at.x, y: at.y, r: opts.r ?? DEFAULT_RADIUS, mode: opts.mode ?? ('convex' as Mode) };
  if (s.symmetry) {
    const res = insertMirrored(s.circles, afterId, base, width);
    return { shape: withCircles(s, res.circles), id: res.id };
  }
  const id = newId();
  const idx = afterId ? s.circles.findIndex((c) => c.id === afterId) : -1;
  const circles = [...s.circles];
  circles.splice(idx < 0 ? circles.length : idx + 1, 0, { ...base, id });
  return { shape: withCircles(s, circles), id };
}

/** Default mode for a new circle at `p`: convex inside the fill, concave outside. */
export function modeAt(s: ShapeDoc, p: { x: number; y: number }): Mode {
  if (s.circles.length < 2) return 'convex';
  return insideBand(p, toSigned(s.circles)) ? 'convex' : 'concave';
}

/** Adds a circle at `p`, inserted at the nearest band segment, with the mode from its position. */
export function addCircleAt(s: ShapeDoc, width: number, p: { x: number; y: number }): { shape: ShapeDoc; id: string } {
  const idx = nearestSegment(p, toSigned(s.circles));
  const afterId = idx >= 0 ? s.circles[idx].id : null;
  return addCircle(s, width, p, afterId, { mode: modeAt(s, p) });
}

/** "Add circle" with a selection: midway between the selected circle and the next one. */
export function addCircleAfter(s: ShapeDoc, width: number, id: string): { shape: ShapeDoc; id: string } | null {
  const i = s.circles.findIndex((c) => c.id === id);
  if (i < 0) return null;
  const c = s.circles[i];
  const next = s.circles[(i + 1) % s.circles.length];
  const p = next === c
    ? { x: c.x + c.r + DEFAULT_RADIUS * 2, y: c.y }
    : { x: (c.x + next.x) / 2, y: (c.y + next.y) / 2 };
  return addCircle(s, width, p, id, { mode: modeAt(s, p) });
}

/** Reorders circles clockwise around their mean centre (first circle stays first). */
export function autoOrderShape(s: ShapeDoc): ShapeDoc {
  const circles = autoOrder(s.circles);
  return circles.every((c, i) => c === s.circles[i]) ? s : withCircles(s, circles);
}

export function editCircle(s: ShapeDoc, width: number, id: string, patch: CirclePatch): ShapeDoc {
  const p = { ...patch };
  if (p.r !== undefined) p.r = Math.max(MIN_RADIUS, p.r);
  if (s.symmetry) return withCircles(s, editMirrored(s.circles, id, p, width));
  return withCircles(s, s.circles.map((c) => (c.id === id ? { ...c, ...p } : c)));
}

export function toggleMode(s: ShapeDoc, width: number, id: string): ShapeDoc {
  const c = s.circles.find((o) => o.id === id);
  if (!c) return s;
  return editCircle(s, width, id, { mode: c.mode === 'convex' ? 'concave' : 'convex' });
}

export function deleteCircle(s: ShapeDoc, id: string): ShapeDoc {
  if (s.symmetry) return withCircles(s, deleteMirrored(s.circles, id));
  return withCircles(s, s.circles.filter((c) => c.id !== id));
}

export function duplicateCircle(s: ShapeDoc, width: number, id: string): { shape: ShapeDoc; id: string } | null {
  const c = s.circles.find((o) => o.id === id);
  if (!c) return null;
  const at = { x: c.x + DUPLICATE_OFFSET, y: c.y + DUPLICATE_OFFSET };
  return addCircle(s, width, at, id, { r: c.r, mode: c.mode });
}

/** Moves the circle at index `from` so it ends up at index `to`. */
export function moveCircle(s: ShapeDoc, from: number, to: number): ShapeDoc {
  const n = s.circles.length;
  if (from === to || from < 0 || from >= n || to < 0 || to >= n) return s;
  const circles = [...s.circles];
  const [c] = circles.splice(from, 1);
  circles.splice(to, 0, c);
  return withCircles(s, circles);
}

export function setSymmetry(s: ShapeDoc, width: number, on: boolean): ShapeDoc {
  return { ...s, symmetry: on, circles: on ? pairCircles(s.circles, width) : clearPairs(s.circles) };
}

export function loadPreset(current: ShapeDoc, width: number, name: PresetName): ShapeDoc {
  const p = presetShape(name);
  const shape = { ...p, fill: current.fill };
  return current.symmetry ? setSymmetry(shape, width, true) : shape;
}
