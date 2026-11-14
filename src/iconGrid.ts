// twostu icon grid: keylines from the Figma "Icon grid" component
// (file orrEBTSjd4MJu0xIAfkrxs, node 2495:144), defined on a 24×24 layout.

export const ICON_GRID_SIZE = 24;

export type GridPrim =
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx: number }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number };

const LINES = [4, 8, 12, 16, 20];

/** Keylines in 24-unit space. */
export const ICON_GRID: GridPrim[] = [
  { kind: 'circle', cx: 12, cy: 12, r: 10 },
  { kind: 'circle', cx: 12, cy: 12, r: 5 },
  { kind: 'rect', x: 3, y: 3, w: 18, h: 18, rx: 1 },
  { kind: 'rect', x: 4, y: 2, w: 16, h: 20, rx: 1 },
  { kind: 'rect', x: 2, y: 4, w: 20, h: 16, rx: 1 },
  { kind: 'line', x1: 0, y1: 0, x2: 24, y2: 24 },
  { kind: 'line', x1: 24, y1: 0, x2: 0, y2: 24 },
  ...LINES.map((v): GridPrim => ({ kind: 'line', x1: v, y1: 0, x2: v, y2: 24 })),
  ...LINES.map((v): GridPrim => ({ kind: 'line', x1: 0, y1: v, x2: 24, y2: v })),
];

/** The icon grid scaled by min(W, H) / 24 and centred on a W×H canvas. */
export function iconGridPrimitives(width: number, height: number): GridPrim[] {
  const k = Math.min(width, height) / ICON_GRID_SIZE;
  const ox = (width - ICON_GRID_SIZE * k) / 2;
  const oy = (height - ICON_GRID_SIZE * k) / 2;
  const X = (v: number) => ox + v * k;
  const Y = (v: number) => oy + v * k;
  return ICON_GRID.map((p): GridPrim => {
    if (p.kind === 'circle') return { kind: 'circle', cx: X(p.cx), cy: Y(p.cy), r: p.r * k };
    if (p.kind === 'rect') return { kind: 'rect', x: X(p.x), y: Y(p.y), w: p.w * k, h: p.h * k, rx: p.rx * k };
    return { kind: 'line', x1: X(p.x1), y1: Y(p.y1), x2: X(p.x2), y2: Y(p.y2) };
  });
}
