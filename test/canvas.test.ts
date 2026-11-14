import { describe, expect, it } from 'vitest';
import { newDocument, parseDocument, presetShape, serialize } from '../src/document';
import { loadPreset, resizeCanvas, setSymmetry } from '../src/ops';
import { suitShape } from './fixtures';

describe('canvas size bounds', () => {
  it('round trips a 24×32 canvas', () => {
    const doc = { ...newDocument(), canvas: { width: 24, height: 32 } };
    const res = parseDocument(serialize(doc));
    expect(res.ok && res.doc.canvas).toEqual({ width: 24, height: 32 });
  });

  it('rejects an oversized canvas', () => {
    const doc = { ...newDocument(), canvas: { width: 10000, height: 100 } };
    const res = parseDocument(serialize(doc));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/between 1 and 4096/);
  });
});

describe('resizeCanvas', () => {
  it('shrinks the circle preset to icon size', () => {
    const out = resizeCanvas(newDocument(presetShape('circle')), 24, 24);
    expect(out.canvas).toEqual({ width: 24, height: 24 });
    expect(out.shapes[0].circles[0]).toMatchObject({ x: 12, y: 12, r: 7.2 });
  });

  it('widening keeps radii and centres horizontally', () => {
    const doc = newDocument(suitShape('heart'));
    const out = resizeCanvas(doc, 200, 100);
    expect(out.canvas).toEqual({ width: 200, height: 100 });
    out.shapes[0].circles.forEach((c, i) => {
      const o = doc.shapes[0].circles[i];
      expect(c.r).toBe(o.r);
      expect(c.x).toBe(o.x + 50);
      expect(c.y).toBe(o.y);
    });
  });

  it('clamps sizes', () => {
    expect(resizeCanvas(newDocument(), 0, 5000).canvas).toEqual({ width: 1, height: 4096 });
  });

  it('is a no-op for the same size', () => {
    const doc = newDocument();
    expect(resizeCanvas(doc, 100, 100)).toBe(doc);
  });

  it('keeps symmetric twins mirrored about the new axis', () => {
    const doc = newDocument(setSymmetry(suitShape('heart'), 100, true));
    const out = resizeCanvas(doc, 60, 40);
    const cs = out.shapes[0].circles;
    for (const c of cs) {
      if (!c.twinId) continue;
      const t = cs.find((o) => o.id === c.twinId)!;
      expect(c.x + t.x).toBeCloseTo(60, 9);
      expect(c.y).toBeCloseTo(t.y, 9);
    }
  });
});

describe('loadPreset fitting', () => {
  it('is the identity on 100×100', () => {
    const p = loadPreset(presetShape('circle'), { width: 100, height: 100 }, 'hand');
    expect(p.circles.map((c) => [c.x, c.y, c.r])).toEqual(presetShape('hand').circles.map((c) => [c.x, c.y, c.r]));
  });

  it('fits the circle onto a 24×24 canvas', () => {
    const p = loadPreset(presetShape('circle'), { width: 24, height: 24 }, 'circle');
    expect(p.circles[0]).toMatchObject({ x: 12, y: 12, r: 7.2 });
  });
});
