// Pure band geometry: no DOM. See openspec/specs/band-geometry.

export type Mode = 'convex' | 'concave';

export interface Pt {
  x: number;
  y: number;
}

/** A circle with signed radius: s > 0 convex, s < 0 concave. */
export interface SCircle {
  x: number;
  y: number;
  s: number;
}

export interface Tangent {
  /** Tangent point on the first circle of the pair. */
  a: Pt;
  /** Tangent point on the second circle of the pair. */
  b: Pt;
  k: number;
  valid: boolean;
}

export interface Arc {
  index: number;
  cx: number;
  cy: number;
  /** Absolute radius. */
  R: number;
  /** +1 convex (clockwise on screen), -1 concave. */
  sg: 1 | -1;
  start: Pt;
  end: Pt;
  /** Angle of start point around the centre. */
  ain: number;
  /** Sweep angle in [0, 2π), measured in direction sg. */
  sweep: number;
  largeArc: 0 | 1;
  sweepFlag: 0 | 1;
}

export interface CornerVertex {
  x: number;
  y: number;
  cornerRadius: number;
  circleIndex: number;
}

export interface Validation {
  /** Consecutive index pairs [i, j] with no tangent (|k| >= 1 or coincident centres). */
  invalidPairs: [number, number][];
  /** Circles lying entirely inside a neighbour. */
  nested: { inner: number; outer: number }[];
}

const TAU = Math.PI * 2;
export const SPLIT_SWEEP = 2.2;
export const SKIP_SWEEP = 0.02;

export function signedRadius(r: number, mode: Mode): number {
  return mode === 'convex' ? r : -r;
}

export function normAngle(a: number): number {
  return ((a % TAU) + TAU) % TAU;
}

/** Tangent for each consecutive pair i → i+1 (closing pair last → first). */
export function tangents(C: SCircle[]): Tangent[] {
  const n = C.length;
  const T: Tangent[] = [];
  for (let i = 0; i < n; i++) {
    const A = C[i];
    const B = C[(i + 1) % n];
    const vx = B.x - A.x;
    const vy = B.y - A.y;
    const L = Math.hypot(vx, vy);
    if (L === 0) {
      T.push({ a: { x: A.x, y: A.y - A.s }, b: { x: B.x, y: B.y - B.s }, k: Infinity, valid: false });
      continue;
    }
    const ux = vx / L;
    const uy = vy / L;
    const wx = uy;
    const wy = -ux;
    const k = (A.s - B.s) / L;
    const h = Math.sqrt(Math.max(0, 1 - k * k));
    const nx = k * ux + h * wx;
    const ny = k * uy + h * wy;
    T.push({
      a: { x: A.x + A.s * nx, y: A.y + A.s * ny },
      b: { x: B.x + B.s * nx, y: B.y + B.s * ny },
      k,
      valid: Math.abs(k) < 1,
    });
  }
  return T;
}

export function validate(C: SCircle[], T: Tangent[] = tangents(C)): Validation {
  const n = C.length;
  const invalidPairs: [number, number][] = [];
  const nested: { inner: number; outer: number }[] = [];
  if (n < 2) return { invalidPairs, nested };
  const pairs = n === 2 ? 1 : n; // with two circles both pairs are the same pair
  for (let i = 0; i < pairs; i++) {
    const j = (i + 1) % n;
    const A = C[i];
    const B = C[j];
    const L = Math.hypot(B.x - A.x, B.y - A.y);
    const ra = Math.abs(A.s);
    const rb = Math.abs(B.s);
    if (L + Math.min(ra, rb) <= Math.max(ra, rb)) {
      nested.push(ra < rb ? { inner: i, outer: j } : { inner: j, outer: i });
    }
  }
  for (let i = 0; i < n; i++) {
    if (!T[i].valid) {
      const j = (i + 1) % n;
      if (n === 2 && i === 1 && !T[0].valid) continue;
      invalidPairs.push([i, j]);
    }
  }
  return { invalidPairs, nested };
}

/** Arc on each circle from its incoming to its outgoing tangent point. */
export function arcs(C: SCircle[], T: Tangent[] = tangents(C)): Arc[] {
  const n = C.length;
  const out: Arc[] = [];
  for (let i = 0; i < n; i++) {
    const c = C[i];
    const pin = T[(i - 1 + n) % n].b;
    const pout = T[i].a;
    const ain = Math.atan2(pin.y - c.y, pin.x - c.x);
    const aout = Math.atan2(pout.y - c.y, pout.x - c.x);
    const sg: 1 | -1 = c.s > 0 ? 1 : -1;
    const sweep = normAngle(sg === 1 ? aout - ain : ain - aout);
    out.push({
      index: i,
      cx: c.x,
      cy: c.y,
      R: Math.abs(c.s),
      sg,
      start: pin,
      end: pout,
      ain,
      sweep,
      largeArc: sweep > Math.PI ? 1 : 0,
      sweepFlag: sg === 1 ? 1 : 0,
    });
  }
  return out;
}

export type NumFmt = (n: number) => string;

/** Formats with up to `digits` decimals, trimming trailing zeros. */
export function fmtNum(digits = 4): NumFmt {
  return (v: number) => {
    const s = v.toFixed(digits);
    const t = s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
    return t === '-0' ? '0' : t;
  };
}

/** Flattened SVG path data: M, then A + L per circle, then Z. */
export function bandPath(C: SCircle[], fmt: NumFmt = String): string {
  const n = C.length;
  if (n === 0) return '';
  if (n === 1) {
    const { x, y, s } = C[0];
    const R = Math.abs(s);
    return `M${fmt(x)} ${fmt(y - R)}A${fmt(R)} ${fmt(R)} 0 1 1 ${fmt(x)} ${fmt(y + R)}A${fmt(R)} ${fmt(R)} 0 1 1 ${fmt(x)} ${fmt(y - R)}Z`;
  }
  const T = tangents(C);
  const A = arcs(C, T);
  let d = `M${fmt(T[n - 1].b.x)} ${fmt(T[n - 1].b.y)}`;
  for (let i = 0; i < n; i++) {
    const a = A[i];
    d += `A${fmt(a.R)} ${fmt(a.R)} 0 ${a.largeArc} ${a.sweepFlag} ${fmt(a.end.x)} ${fmt(a.end.y)}`;
    d += `L${fmt(T[i].b.x)} ${fmt(T[i].b.y)}`;
  }
  return d + 'Z';
}

/** Splits an arc into corner vertices (one per part), or none if negligible. */
export function arcVertices(a: Arc): CornerVertex[] {
  if (a.sweep < SKIP_SWEEP) return [];
  const m = Math.ceil(a.sweep / SPLIT_SWEEP);
  const sub = a.sweep / m;
  const dist = a.R / Math.cos(sub / 2);
  const out: CornerVertex[] = [];
  for (let j = 0; j < m; j++) {
    const mid = a.ain + a.sg * (j * sub + sub / 2);
    out.push({ x: a.cx + dist * Math.cos(mid), y: a.cy + dist * Math.sin(mid), cornerRadius: a.R, circleIndex: a.index });
  }
  return out;
}

/** Straight-edge polygon with a corner radius per vertex; same outline as bandPath. */
export function cornerForm(C: SCircle[]): CornerVertex[] {
  if (C.length < 2) return [];
  return arcs(C).flatMap(arcVertices);
}

// ---------------------------------------------------------------------------
// Outline primitives: used to sample and compare outlines (tests, smoke checks).

export type Prim =
  | { kind: 'line'; p: Pt; q: Pt }
  | { kind: 'arc'; cx: number; cy: number; R: number; a0: number; sweep: number; dir: 1 | -1 };

/** Primitives of the flattened band outline. */
export function bandPrimitives(C: SCircle[]): Prim[] {
  const T = tangents(C);
  const A = arcs(C, T);
  const out: Prim[] = [];
  A.forEach((a, i) => {
    out.push({ kind: 'arc', cx: a.cx, cy: a.cy, R: a.R, a0: a.ain, sweep: a.sweep, dir: a.sg });
    out.push({ kind: 'line', p: T[i].a, q: T[i].b });
  });
  return out;
}

/** Primitives of a corner polygon with each corner filleted by its radius. */
export function filletPrimitives(V: CornerVertex[]): Prim[] {
  const n = V.length;
  const fil = V.map((v, i) => {
    const p = V[(i - 1 + n) % n];
    const q = V[(i + 1) % n];
    const d1 = unit(p.x - v.x, p.y - v.y);
    const d2 = unit(q.x - v.x, q.y - v.y);
    const cos = Math.max(-1, Math.min(1, d1.x * d2.x + d1.y * d2.y));
    const beta = Math.acos(cos) / 2; // half the interior angle
    const t = v.cornerRadius / Math.tan(beta);
    const b = unit(d1.x + d2.x, d1.y + d2.y);
    const off = v.cornerRadius / Math.sin(beta);
    const c = { x: v.x + b.x * off, y: v.y + b.y * off };
    const t1 = { x: v.x + d1.x * t, y: v.y + d1.y * t };
    const t2 = { x: v.x + d2.x * t, y: v.y + d2.y * t };
    const a0 = Math.atan2(t1.y - c.y, t1.x - c.x);
    const a1 = Math.atan2(t2.y - c.y, t2.x - c.x);
    const ccw = normAngle(a1 - a0);
    const dir: 1 | -1 = ccw <= Math.PI ? 1 : -1;
    const sweep = dir === 1 ? ccw : TAU - ccw;
    return { t1, t2, arc: { kind: 'arc', cx: c.x, cy: c.y, R: v.cornerRadius, a0, sweep, dir } as Prim };
  });
  const out: Prim[] = [];
  fil.forEach((f, i) => {
    out.push(f.arc);
    out.push({ kind: 'line', p: f.t2, q: fil[(i + 1) % n].t1 });
  });
  return out;
}

function unit(x: number, y: number): Pt {
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
}

export function samplePrim(p: Prim, t: number): Pt {
  if (p.kind === 'line') return { x: p.p.x + (p.q.x - p.p.x) * t, y: p.p.y + (p.q.y - p.p.y) * t };
  const a = p.a0 + p.dir * p.sweep * t;
  return { x: p.cx + p.R * Math.cos(a), y: p.cy + p.R * Math.sin(a) };
}

export function samplePrimitives(P: Prim[], perPrim = 16): Pt[] {
  const out: Pt[] = [];
  for (const p of P) for (let i = 0; i < perPrim; i++) out.push(samplePrim(p, i / perPrim));
  return out;
}

export function distanceToPrim(pt: Pt, p: Prim): number {
  if (p.kind === 'line') {
    const dx = p.q.x - p.p.x;
    const dy = p.q.y - p.p.y;
    const l2 = dx * dx + dy * dy;
    const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((pt.x - p.p.x) * dx + (pt.y - p.p.y) * dy) / l2));
    return Math.hypot(pt.x - (p.p.x + t * dx), pt.y - (p.p.y + t * dy));
  }
  const ang = Math.atan2(pt.y - p.cy, pt.x - p.cx);
  const delta = normAngle(p.dir * (ang - p.a0));
  if (delta <= p.sweep) return Math.abs(Math.hypot(pt.x - p.cx, pt.y - p.cy) - p.R);
  const s = samplePrim(p, 0);
  const e = samplePrim(p, 1);
  return Math.min(Math.hypot(pt.x - s.x, pt.y - s.y), Math.hypot(pt.x - e.x, pt.y - e.y));
}

export function distanceToPrimitives(pt: Pt, P: Prim[]): number {
  let m = Infinity;
  for (const p of P) m = Math.min(m, distanceToPrim(pt, p));
  return m;
}
