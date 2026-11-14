import { describe, expect, it } from 'vitest';
import { presetShape, toSigned, type CircleDoc } from '../src/document';
import { autoOrder, insideBand, nearestSegment, pick } from '../src/interact';
import { addCircleAfter, addCircleAt, autoOrderShape, setSymmetry } from '../src/ops';
import { suitShape } from './fixtures';

const W = 100;
const byXY = (cs: CircleDoc[], x: number, y: number) => cs.find((c) => c.x === x && c.y === y)!;

describe('pick', () => {
  const club = suitShape('club').circles;
  const tol = 1; // ~8 px at ~7 px/unit
  const maxR = 50; // half the 100-unit canvas

  it('grabs a small concave circle from anywhere inside it', () => {
    const notch = byXY(club, 78, 27); // r 7, overlapped by the r 19 lobes
    for (const [dx, dy] of [[0, 0], [3, 3], [-4, 2], [2, -5], [-5, -3]]) {
      expect(pick({ x: 78 + dx, y: 27 + dy }, club, null, tol, maxR)?.id).toBe(notch.id);
    }
  });

  it('resizes from any point on the selected circle rim', () => {
    const c = byXY(club, 50, 27); // r 19
    const a = Math.PI / 3;
    const p = { x: 50 + 19 * Math.cos(a), y: 27 + 19 * Math.sin(a) };
    expect(pick(p, club, c.id, tol, maxR)).toEqual({ id: c.id, action: 'resize' });
  });

  it('prefers a centre over a rim', () => {
    const big = { id: 'big', x: 0, y: 0, r: 10, mode: 'convex' as const };
    const small = { id: 'small', x: 10, y: 0, r: 2, mode: 'convex' as const };
    expect(pick({ x: 10.2, y: 0 }, [big, small], null, 1, 50)?.id).toBe('small');
  });

  it('ignores huge circles for interior clicks', () => {
    const diamond = suitShape('diamond').circles; // concave r 90 circles reach over the paper corners
    expect(pick({ x: 95, y: 5 }, diamond, null, tol, maxR)).toBeNull();
  });

  it('returns null over empty canvas', () => {
    expect(pick({ x: 2, y: 2 }, club, null, tol, maxR)).toBeNull();
  });
});

describe('nearestSegment and insideBand', () => {
  const heart = suitShape('heart');
  const C = toSigned(heart.circles);

  it('inserts beside the edge between the right lobe and the bottom tip', () => {
    expect(nearestSegment({ x: 85, y: 70 }, C)).toBe(0);
  });

  it('inserts at the closing edge for the top notch area', () => {
    // between top notch (index 3) and right lobe (index 0): after index 3
    expect(nearestSegment({ x: 58, y: 8 }, C)).toBe(3);
  });

  it('appends with fewer than two circles', () => {
    expect(nearestSegment({ x: 0, y: 0 }, [])).toBe(-1);
    expect(nearestSegment({ x: 0, y: 0 }, C.slice(0, 1))).toBe(0);
  });

  it('knows inside from outside', () => {
    expect(insideBand({ x: 50, y: 50 }, C)).toBe(true);
    expect(insideBand({ x: 85, y: 75 }, C)).toBe(false);
    expect(insideBand({ x: 50, y: 5 }, C)).toBe(false);
  });
});

describe('adding circles', () => {
  it('double-click inside adds convex, outside adds concave', () => {
    const heart = suitShape('heart');
    const inside = addCircleAt(heart, W, { x: 50, y: 50 });
    expect(inside.shape.circles.find((c) => c.id === inside.id)!.mode).toBe('convex');
    const outside = addCircleAt(heart, W, { x: 85, y: 75 });
    const added = outside.shape.circles.findIndex((c) => c.id === outside.id);
    expect(outside.shape.circles[added].mode).toBe('concave');
    expect(added).toBe(1); // between right lobe and bottom tip
  });

  it('first circles are convex', () => {
    const empty = { ...presetShape('circle'), circles: [] };
    const one = addCircleAt(empty, W, { x: 10, y: 10 });
    expect(one.shape.circles[0].mode).toBe('convex');
    const two = addCircleAt(one.shape, W, { x: 60, y: 60 });
    expect(two.shape.circles.map((c) => c.mode)).toEqual(['convex', 'convex']);
  });

  it('symmetric add mirrors position and mode', () => {
    const heart = setSymmetry(suitShape('heart'), W, true);
    const res = addCircleAt(heart, W, { x: 85, y: 75 });
    const main = res.shape.circles.find((c) => c.id === res.id)!;
    const twin = res.shape.circles.find((c) => c.id === main.twinId)!;
    expect(twin).toMatchObject({ x: 15, y: 75, mode: 'concave' });
  });

  it('Add button inserts midway after the selection', () => {
    const heart = suitShape('heart');
    const res = addCircleAfter(heart, W, heart.circles[1].id)!;
    const c = res.shape.circles[2];
    expect(c.id).toBe(res.id);
    expect([c.x, c.y]).toEqual([40, 62.5]); // midway between (50,90) and (30,35)
  });
});

describe('autoOrder', () => {
  it('restores a scrambled heart, keeping the first circle first', () => {
    const [r, b, l, t] = suitShape('heart').circles;
    expect(autoOrder([r, l, b, t])).toEqual([r, b, l, t]);
  });

  it('leaves an already ordered shape unchanged', () => {
    const s = presetShape('cross');
    expect(autoOrderShape(s)).toBe(s);
  });

  it('does not change positions, radii or modes', () => {
    const s = suitShape('club');
    const scrambled = { ...s, circles: [...s.circles].reverse() };
    const out = autoOrderShape(scrambled);
    expect([...out.circles].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...s.circles].sort((a, b) => a.id.localeCompare(b.id)),
    );
  });
});
