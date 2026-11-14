import { describe, expect, it } from 'vitest';
import { iconGridPrimitives, type GridPrim } from '../src/iconGrid';

const circles = (g: GridPrim[]) => g.filter((p) => p.kind === 'circle') as Extract<GridPrim, { kind: 'circle' }>[];
const rects = (g: GridPrim[]) => g.filter((p) => p.kind === 'rect') as Extract<GridPrim, { kind: 'rect' }>[];
const lines = (g: GridPrim[]) => g.filter((p) => p.kind === 'line') as Extract<GridPrim, { kind: 'line' }>[];

describe('icon grid', () => {
  it('matches the Figma component on 24×24', () => {
    const g = iconGridPrimitives(24, 24);
    expect(circles(g)).toEqual([{ kind: 'circle', cx: 12, cy: 12, r: 10 }, { kind: 'circle', cx: 12, cy: 12, r: 5 }]);
    expect(rects(g).map((r) => [r.x, r.y, r.w, r.h, r.rx])).toEqual([[3, 3, 18, 18, 1], [4, 2, 16, 20, 1], [2, 4, 20, 16, 1]]);
    const verticals = lines(g).filter((l) => l.x1 === l.x2).map((l) => l.x1);
    const horizontals = lines(g).filter((l) => l.y1 === l.y2).map((l) => l.y1);
    expect(verticals).toEqual([4, 8, 12, 16, 20]);
    expect(horizontals).toEqual([4, 8, 12, 16, 20]);
    expect(lines(g)).toHaveLength(12); // 2 diagonals + 10 lines
  });

  it('scales to the default 100×100 canvas', () => {
    const g = iconGridPrimitives(100, 100);
    expect(circles(g)[0].r).toBeCloseTo(41.67, 2);
    const sq = rects(g)[0];
    expect(sq.x).toBeCloseTo(12.5, 9);
    expect(sq.x + sq.w).toBeCloseTo(87.5, 9);
  });

  it('centres on a non-square canvas', () => {
    const g = iconGridPrimitives(200, 100);
    expect(circles(g)[0]).toMatchObject({ cx: 100, cy: 50 });
    const diag = lines(g)[0];
    expect([diag.x1, diag.y1, diag.x2, diag.y2]).toEqual([50, 0, 150, 100]);
  });
});
