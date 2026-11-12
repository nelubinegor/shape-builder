import { describe, expect, it } from 'vitest';
import { cornerForm } from '../src/band';
import { newDocument, toSigned } from '../src/document';
import { suitShape } from './fixtures';
import { buildSvg, exportFileName, vectorNetwork } from '../src/export';

const opts = { fill: '#000000', overlay: false, scale: 1 };
const shapePaths = (svg: string): string[] => svg.match(/<path [^>]*>/g) ?? [];
const attr = (el: string, name: string): string | undefined => el.match(new RegExp(`${name}="([^"]*)"`))?.[1];

describe('flattened SVG', () => {
  it('heart at scale 1', () => {
    const svg = buildSvg(newDocument(suitShape('heart')), 'flattened', opts);
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    expect(svg).toContain('viewBox="0 0 100 100"');
    const paths = shapePaths(svg);
    expect(paths).toHaveLength(1);
    const d = attr(paths[0], 'd')!;
    expect(d.replace(/[^MALZ]/g, '')).toBe('M' + 'AL'.repeat(4) + 'Z');
    expect(attr(paths[0], 'fill')).toBe('#000000');
  });

  it('scale 4 multiplies everything', () => {
    const doc = newDocument(suitShape('heart'));
    const one = attr(shapePaths(buildSvg(doc, 'flattened', opts))[0], 'd')!;
    const four = buildSvg(doc, 'flattened', { ...opts, scale: 4 });
    expect(four).toContain('viewBox="0 0 400 400"');
    const nums = (d: string) => d.split(/[MALZ ]+/).filter(Boolean).map(Number);
    const a = nums(one);
    const b = nums(attr(shapePaths(four)[0], 'd')!);
    // flags (0/1) and rotation stay; coordinates and radii scale. Compare per A-command layout.
    expect(b.length).toBe(a.length);
    const flagIdx = new Set<number>();
    // layout: M x y, then per circle: A R R rot large sweep x y, L x y
    let i = 2;
    while (i < a.length) {
      flagIdx.add(i + 2).add(i + 3).add(i + 4);
      i += 9;
    }
    a.forEach((v, k) => expect(b[k]).toBeCloseTo(flagIdx.has(k) ? v : v * 4, 2));
  });

  it('overlay is off by default and added when asked', () => {
    const doc = newDocument(suitShape('spade'));
    expect(buildSvg(doc, 'flattened', opts)).not.toContain('construction');
    const withOverlay = buildSvg(doc, 'flattened', { ...opts, overlay: true });
    expect(withOverlay).toContain('id="construction"');
    expect(withOverlay).toContain('stroke-dasharray'); // concave circles dashed
  });

  it('uses the chosen fill', () => {
    const svg = buildSvg(newDocument(), 'flattened', { ...opts, fill: '#0D2DD7' });
    expect(attr(shapePaths(svg)[0], 'fill')).toBe('#0D2DD7');
  });
});

describe('rounded-corner SVG', () => {
  it('straight segments with one radius per vertex', () => {
    const doc = newDocument(suitShape('club'));
    const n = cornerForm(toSigned(doc.shapes[0].circles)).length;
    const svg = buildSvg(doc, 'rounded', opts);
    const p = shapePaths(svg)[0];
    const d = attr(p, 'd')!;
    expect(d).toMatch(/^[MLZ0-9 .-]+$/);
    expect(d.match(/[ML]/g)).toHaveLength(n);
    expect(attr(p, 'data-corner-radii')!.split(',')).toHaveLength(n);
  });

  it('scales radii', () => {
    const doc = newDocument(suitShape('heart'));
    const r1 = attr(shapePaths(buildSvg(doc, 'rounded', opts))[0], 'data-corner-radii')!.split(',').map(Number);
    const r2 = attr(shapePaths(buildSvg(doc, 'rounded', { ...opts, scale: 2 }))[0], 'data-corner-radii')!
      .split(',').map(Number);
    r1.forEach((r, i) => expect(r2[i]).toBeCloseTo(r * 2, 6));
  });
});

describe('Figma vector network', () => {
  it('closed loop of N vertices', () => {
    const shape = suitShape('spade');
    const n = cornerForm(toSigned(shape.circles)).length;
    const vn = vectorNetwork(shape);
    expect(vn.vertices).toHaveLength(n);
    expect(vn.segments).toHaveLength(n);
    expect(vn.segments[n - 1]).toEqual({ start: n - 1, end: 0 });
    expect(vn.regions).toEqual([{ windingRule: 'NONZERO', loops: [Array.from({ length: n }, (_, i) => i)] }]);
    vn.vertices.forEach((v) => expect(v.cornerRadius).toBeGreaterThan(0));
  });
});

describe('file name', () => {
  it('is based on shape name and format', () => {
    expect(exportFileName({ ...suitShape('heart'), name: 'Big Heart!' }, 'rounded')).toBe('big-heart-rounded.svg');
  });
});
