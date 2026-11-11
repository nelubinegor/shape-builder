// SVG and Figma exports. See openspec/specs/svg-export.
import { bandPath, cornerForm, fmtNum, tangents, type SCircle } from './band';
import { safeFileName, toSigned, type Doc, type ShapeDoc } from './document';
import type { ExportOptions } from './store';

export type SvgFormat = 'flattened' | 'rounded';

export const CONSTRUCTION_BLUE = '#0D2DD7';

const fmt = fmtNum(4);

const escAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function scaled(shape: ShapeDoc, scale: number): SCircle[] {
  return toSigned(shape.circles).map((c) => ({ x: c.x * scale, y: c.y * scale, s: c.s * scale }));
}

/** Straight-segment path through the corner vertices. */
export function cornerPathData(C: SCircle[]): { d: string; radii: number[] } {
  const V = cornerForm(C);
  if (V.length === 0) return { d: '', radii: [] };
  const d = V.map((v, i) => `${i === 0 ? 'M' : 'L'}${fmt(v.x)} ${fmt(v.y)}`).join('') + 'Z';
  return { d, radii: V.map((v) => v.cornerRadius) };
}

function overlayGroup(C: SCircle[], scale: number): string {
  if (C.length === 0) return '';
  const sw = fmt(0.25 * scale);
  const dash = `${fmt(1 * scale)} ${fmt(0.75 * scale)}`;
  const circles = C.map(
    (c) =>
      `<circle cx="${fmt(c.x)}" cy="${fmt(c.y)}" r="${fmt(Math.abs(c.s))}"${c.s < 0 ? ` stroke-dasharray="${dash}"` : ''}/>`,
  ).join('');
  const dots = C.length > 1
    ? tangents(C)
        .flatMap((t) => [t.a, t.b])
        .map((p) => `<circle cx="${fmt(p.x)}" cy="${fmt(p.y)}" r="${fmt(0.6 * scale)}"/>`)
        .join('')
    : '';
  return `<g id="construction"><g fill="none" stroke="${CONSTRUCTION_BLUE}" stroke-width="${sw}">${circles}</g><g fill="${CONSTRUCTION_BLUE}">${dots}</g></g>`;
}

export function buildSvg(doc: Doc, format: SvgFormat, opts: ExportOptions): string {
  const shape = doc.shapes[0];
  const s = opts.scale > 0 ? opts.scale : 1;
  const w = fmt(doc.canvas.width * s);
  const h = fmt(doc.canvas.height * s);
  const C = scaled(shape, s);
  const fill = escAttr(opts.fill || shape.fill || '#000000');
  let path: string;
  if (format === 'flattened') {
    path = `<path fill="${fill}" d="${bandPath(C, fmt)}"/>`;
  } else {
    const { d, radii } = cornerPathData(C);
    path = `<path fill="${fill}" d="${d}" data-corner-radii="${radii.map(fmt).join(',')}"/>`;
  }
  const title = `<title>${escAttr(shape.name)}</title>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    title + path + (opts.overlay ? overlayGroup(C, s) : '') + `</svg>\n`
  );
}

export interface VectorNetwork {
  vertices: { x: number; y: number; cornerRadius: number }[];
  segments: { start: number; end: number }[];
  regions: { windingRule: 'NONZERO'; loops: number[][] }[];
}

/** Figma VectorNetwork for the corner-radius form. */
export function vectorNetwork(shape: ShapeDoc, scale = 1): VectorNetwork {
  const V = cornerForm(scaled(shape, scale));
  const round = (v: number) => Math.round(v * 1e4) / 1e4;
  const n = V.length;
  return {
    vertices: V.map((v) => ({ x: round(v.x), y: round(v.y), cornerRadius: round(v.cornerRadius) })),
    segments: V.map((_, i) => ({ start: i, end: (i + 1) % n })),
    regions: n ? [{ windingRule: 'NONZERO', loops: [V.map((_, i) => i)] }] : [],
  };
}

export function exportFileName(shape: ShapeDoc, format: SvgFormat): string {
  return `${safeFileName(shape.name)}-${format}.svg`;
}
