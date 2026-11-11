// Document format, parsing, persistence. See openspec/specs/shape-document.
import { signedRadius, type Mode, type SCircle } from './band';
import { presets, type PresetName, type Triple } from './presets';

export interface CircleDoc {
  id: string;
  x: number;
  y: number;
  r: number;
  mode: Mode;
  /** Mirror twin when symmetry is on. */
  twinId?: string;
}

export interface ShapeDoc {
  name: string;
  fill: string;
  symmetry: boolean;
  circles: CircleDoc[];
}

export interface Doc {
  version: 1;
  canvas: { width: number; height: number };
  shapes: ShapeDoc[];
}

export const STORAGE_KEY = 'shape-builder.document';

let idCounter = 0;
export function newId(): string {
  idCounter += 1;
  return `c${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function circlesFromTriples(t: Triple[]): CircleDoc[] {
  return t.map(([x, y, s]) => ({ id: newId(), x, y, r: Math.abs(s), mode: s < 0 ? 'concave' : 'convex' }));
}

export function presetShape(name: PresetName): ShapeDoc {
  return { name, fill: '#000000', symmetry: false, circles: circlesFromTriples(presets[name]) };
}

export function newDocument(shape: ShapeDoc = presetShape('heart')): Doc {
  return { version: 1, canvas: { width: 100, height: 100 }, shapes: [shape] };
}

export function toSigned(circles: CircleDoc[]): SCircle[] {
  return circles.map((c) => ({ x: c.x, y: c.y, s: signedRadius(c.r, c.mode) }));
}

export function serialize(doc: Doc): string {
  return JSON.stringify(doc, null, 2);
}

export type ParseResult = { ok: true; doc: Doc } | { ok: false; error: string };

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function parseDocument(input: string | unknown): ParseResult {
  let data: unknown = input;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch {
      return { ok: false, error: 'The file is not valid JSON.' };
    }
  }
  if (!isObj(data)) return { ok: false, error: 'The document must be a JSON object.' };
  if (data.version !== 1) return { ok: false, error: `Unsupported document version: ${String(data.version)}.` };
  const canvas = data.canvas;
  if (!isObj(canvas) || !isNum(canvas.width) || !isNum(canvas.height) || canvas.width <= 0 || canvas.height <= 0) {
    return { ok: false, error: 'The document has no valid canvas size.' };
  }
  if (!Array.isArray(data.shapes) || data.shapes.length === 0) {
    return { ok: false, error: 'The document contains no shapes.' };
  }
  const shapes: ShapeDoc[] = [];
  for (const [si, s] of data.shapes.entries()) {
    if (!isObj(s) || !Array.isArray(s.circles)) return { ok: false, error: `Shape ${si + 1} has no circle list.` };
    const circles: CircleDoc[] = [];
    const ids = new Set<string>();
    for (const [ci, c] of s.circles.entries()) {
      const where = `Shape ${si + 1}, circle ${ci + 1}`;
      if (!isObj(c)) return { ok: false, error: `${where} is not an object.` };
      if (!isNum(c.x) || !isNum(c.y)) return { ok: false, error: `${where} has no valid position.` };
      if (!isNum(c.r) || c.r <= 0) return { ok: false, error: `${where} has no valid radius.` };
      if (c.mode !== 'convex' && c.mode !== 'concave') return { ok: false, error: `${where} has an unknown mode.` };
      let id = typeof c.id === 'string' && c.id ? c.id : newId();
      if (ids.has(id)) id = newId();
      ids.add(id);
      const circle: CircleDoc = { id, x: c.x, y: c.y, r: c.r, mode: c.mode };
      if (typeof c.twinId === 'string') circle.twinId = c.twinId;
      circles.push(circle);
    }
    shapes.push({
      name: typeof s.name === 'string' && s.name.trim() ? s.name : 'shape',
      fill: typeof s.fill === 'string' && s.fill ? s.fill : '#000000',
      symmetry: s.symmetry === true,
      circles,
    });
  }
  return { ok: true, doc: { version: 1, canvas: { width: canvas.width, height: canvas.height }, shapes } };
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/** Restores the stored document, or the heart preset if none (or invalid). */
export function loadStored(storage: StorageLike | undefined): { doc: Doc; error?: string } {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    raw = null;
  }
  if (!raw) return { doc: newDocument() };
  const res = parseDocument(raw);
  if (!res.ok) return { doc: newDocument(), error: `Saved document could not be restored. ${res.error}` };
  return { doc: res.doc };
}

export function saveStored(storage: StorageLike | undefined, doc: Doc): void {
  try {
    storage?.setItem(STORAGE_KEY, serialize(doc));
  } catch {
    // Storage full or blocked: autosave is a convenience, ignore.
  }
}

export function safeFileName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'shape';
}

export function downloadText(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens a file picker and resolves with the chosen file's text (null if cancelled). */
export function pickTextFile(accept = '.json,application/json'): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', async () => {
      const f = input.files?.[0];
      resolve(f ? await f.text() : null);
    });
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
