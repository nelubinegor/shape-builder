import { describe, expect, it } from 'vitest';
import {
  arcs, arcVertices, bandPath, bandPrimitives, cornerForm, distanceToPrimitives,
  filletPrimitives, samplePrimitives, tangents, validate, type Arc, type SCircle,
} from '../src/band';
import { presets } from '../src/presets';

const sc = (x: number, y: number, s: number): SCircle => ({ x, y, s });
const fromTriples = (t: [number, number, number][]) => t.map(([x, y, s]) => sc(x, y, s));

// Reference implementation from the brief, verbatim.
function refBandPath(C: number[][]) {
  const n = C.length, T: number[][][] = [];
  for (let i = 0; i < n; i++) { const [ax, ay, ar] = C[i], [bx, by, br] = C[(i + 1) % n];
    const vx = bx - ax, vy = by - ay, L = Math.hypot(vx, vy), ux = vx / L, uy = vy / L, wx = uy, wy = -ux;
    const k = (ar - br) / L, h = Math.sqrt(Math.max(0, 1 - k * k)), nx = k * ux + h * wx, ny = k * uy + h * wy;
    T.push([[ax + ar * nx, ay + ar * ny], [bx + br * nx, by + br * ny]]); }
  let d = `M${T[n - 1][1][0]} ${T[n - 1][1][1]}`;
  for (let i = 0; i < n; i++) { const [cx, cy, r] = C[i]; const pin = T[(i - 1 + n) % n][1], pout = T[i][0];
    const ain = Math.atan2(pin[1] - cy, pin[0] - cx), aout = Math.atan2(pout[1] - cy, pout[0] - cx);
    let sw = r > 0 ? aout - ain : ain - aout; sw = ((sw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const R = Math.abs(r);
    d += `A${R} ${R} 0 ${sw > Math.PI ? 1 : 0} ${r > 0 ? 1 : 0} ${pout[0]} ${pout[1]}L${T[i][1][0]} ${T[i][1][1]}`; }
  return d + 'Z';
}

const nums = (d: string) => (d.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []).map(Number);
const cmds = (d: string) => d.replace(/[^MALZ]/g, '');

describe('tangents', () => {
  it('equal convex circles', () => {
    const [t] = tangents([sc(0, 0, 10), sc(50, 0, 10)]);
    expect(t.a.x).toBeCloseTo(0, 12);
    expect(t.a.y).toBeCloseTo(-10, 12);
    expect(t.b.x).toBeCloseTo(50, 12);
    expect(t.b.y).toBeCloseTo(-10, 12);
    expect(t.valid).toBe(true);
  });

  it('convex → concave pair', () => {
    const A = sc(0, 0, 10), B = sc(50, 0, -10);
    const [t] = tangents([A, B]);
    expect(t.k).toBeCloseTo(0.4, 12);
    expect(Math.hypot(t.a.x - A.x, t.a.y - A.y)).toBeCloseTo(10, 12);
    expect(Math.hypot(t.b.x - B.x, t.b.y - B.y)).toBeCloseTo(10, 12);
    // tangent line is perpendicular to both radii
    const dx = t.b.x - t.a.x, dy = t.b.y - t.a.y;
    expect(dx * (t.a.x - A.x) + dy * (t.a.y - A.y)).toBeCloseTo(0, 9);
    expect(dx * (t.b.x - B.x) + dy * (t.b.y - B.y)).toBeCloseTo(0, 9);
  });

  it('invalid pair does not throw', () => {
    const C = [sc(0, 0, 10), sc(15, 0, -10)];
    expect(() => tangents(C)).not.toThrow();
    const v = validate(C);
    expect(v.invalidPairs).toEqual([[0, 1]]);
    expect(bandPath(C)).not.toMatch(/NaN/);
  });

  it('coincident centres are invalid', () => {
    const C = [sc(10, 10, 5), sc(10, 10, 3), sc(40, 40, 5)];
    expect(validate(C).invalidPairs).toContainEqual([0, 1]);
    expect(bandPath(C)).not.toMatch(/NaN/);
  });
});

describe('validate', () => {
  it('detects nested neighbour', () => {
    const v = validate([sc(0, 0, 20), sc(5, 0, 4), sc(0, 60, 5)]);
    expect(v.nested).toContainEqual({ inner: 1, outer: 0 });
  });

  it('presets are valid', () => {
    for (const [name, t] of Object.entries(presets)) {
      const v = validate(fromTriples(t));
      expect(v.invalidPairs, name).toEqual([]);
      expect(v.nested, name).toEqual([]);
    }
  });
});

describe('arcs', () => {
  it('large-arc flag for a big convex circle', () => {
    const A = arcs([sc(0, 0, 20), sc(50, 0, 5)]);
    expect(A[0].sweepFlag).toBe(1);
    expect(A[0].largeArc).toBe(1);
    expect(A[1].largeArc).toBe(0);
  });

  it('heart lobes are just under half a turn', () => {
    const A = arcs(fromTriples(presets.heart));
    for (const i of [0, 2]) {
      expect(A[i].sweepFlag).toBe(1);
      expect(A[i].sweep).toBeCloseTo(2.862, 3);
      expect(A[i].largeArc).toBe(0);
    }
  });

  it('concave arcs sweep counter-clockwise', () => {
    const A = arcs(fromTriples(presets.heart));
    expect(A[3].sweepFlag).toBe(0);
  });
});

describe('bandPath', () => {
  it('matches the reference implementation on all presets', () => {
    for (const [name, t] of Object.entries(presets)) {
      const ours = bandPath(fromTriples(t));
      const ref = refBandPath(t);
      expect(cmds(ours), name).toBe(cmds(ref));
      const a = nums(ours), b = nums(ref);
      expect(a.length).toBe(b.length);
      a.forEach((v, i) => expect(Math.abs(v - b[i]), name).toBeLessThan(1e-9));
    }
  });

  it('starts with M, has A+L per circle, ends with Z', () => {
    const d = bandPath(fromTriples(presets.spade));
    expect(cmds(d)).toBe('M' + 'AL'.repeat(7) + 'Z');
  });
});

describe('corner form', () => {
  const arc = (sweep: number): Arc => ({
    index: 0, cx: 0, cy: 0, R: 10, sg: 1, start: { x: 10, y: 0 }, end: { x: 0, y: 0 },
    ain: 0, sweep, largeArc: sweep > Math.PI ? 1 : 0, sweepFlag: 1,
  });

  it('splits sweeps above 2.2 rad', () => {
    const V = arcVertices(arc(4.0));
    expect(V).toHaveLength(2);
    V.forEach((v) => expect(v.cornerRadius).toBe(10));
    // each part covers 2.0 rad, so vertex distance is R / cos(1.0)
    expect(Math.hypot(V[0].x, V[0].y)).toBeCloseTo(10 / Math.cos(1.0), 12);
    expect(Math.atan2(V[0].y, V[0].x)).toBeCloseTo(1.0, 12);
    expect(Math.atan2(V[1].y, V[1].x)).toBeCloseTo(3.0, 12);
  });

  it('skips negligible sweeps', () => {
    expect(arcVertices(arc(0.01))).toEqual([]);
  });

  it('keeps one vertex for moderate sweeps', () => {
    expect(arcVertices(arc(1.5))).toHaveLength(1);
  });
});

describe('flattened and corner forms describe the same outline', () => {
  for (const [name, t] of Object.entries(presets)) {
    it(name, () => {
      const C = fromTriples(t);
      const band = bandPrimitives(C);
      const fillet = filletPrimitives(cornerForm(C));
      let worst = 0;
      for (const p of samplePrimitives(band, 64)) worst = Math.max(worst, distanceToPrimitives(p, fillet));
      for (const p of samplePrimitives(fillet, 64)) worst = Math.max(worst, distanceToPrimitives(p, band));
      expect(worst).toBeLessThan(1e-6);
    });
  }
});
