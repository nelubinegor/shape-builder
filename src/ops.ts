// High-level shape edits used by the UI. Pure: (shape, …) → shape. Symmetry-aware.
import { newId, presetShape, type CircleDoc, type ShapeDoc } from './document';
import type { PresetName } from './presets';
import {
  clearPairs, deleteMirrored, editMirrored, insertMirrored, pairCircles, type CirclePatch,
} from './symmetry';

export const MIN_RADIUS = 0.5;
export const DEFAULT_RADIUS = 5;
export const DUPLICATE_OFFSET = 2;

const withCircles = (s: ShapeDoc, circles: CircleDoc[]): ShapeDoc => ({ ...s, circles });

export function addCircle(
  s: ShapeDoc, width: number, at: { x: number; y: number }, afterId: string | null, r = DEFAULT_RADIUS,
): { shape: ShapeDoc; id: string } {
  const base = { x: at.x, y: at.y, r, mode: 'convex' as const };
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
  const res = addCircle(s, width, at, id, c.r);
  return { shape: editCircle(res.shape, width, res.id, { mode: c.mode }), id: res.id };
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
