// "My shapes": a library of documents kept in localStorage. Pure operations + persistence.
import { newDocument, newId, parseDocument, STORAGE_KEY, type Doc } from './document';
import { loadPreset } from './ops';

export const LIBRARY_KEY = 'shape-builder.library';

export interface LibraryEntry {
  id: string;
  doc: Doc;
  updatedAt: number;
}

export interface Library {
  version: 1;
  openId: string;
  /** Never empty; insertion order (newest last). */
  entries: LibraryEntry[];
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const entryId = () => `s${newId()}`;
const now = () => Date.now();

export const docName = (doc: Doc) => doc.shapes[0].name;

/** `base`, or `base 2`, `base 3`… — the first name not already taken. */
export function uniqueName(base: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  if (!set.has(base)) return base;
  for (let i = 2; ; i++) if (!set.has(`${base} ${i}`)) return `${base} ${i}`;
}

const withName = (doc: Doc, name: string): Doc => ({ ...doc, shapes: [{ ...doc.shapes[0], name }, ...doc.shapes.slice(1)] });

/** A single circle on a canvas of the given size, named "shape" (numbered if taken). */
export function blankDoc(canvas: { width: number; height: number }, taken: Iterable<string> = []): Doc {
  const base = newDocument();
  const shape = loadPreset(base.shapes[0], canvas, 'circle');
  return { ...base, canvas: { ...canvas }, shapes: [{ ...shape, name: uniqueName('shape', taken) }] };
}

export function newLibrary(doc: Doc = newDocument()): Library {
  const id = entryId();
  return { version: 1, openId: id, entries: [{ id, doc, updatedAt: now() }] };
}

export const openDoc = (lib: Library): Doc => lib.entries.find((e) => e.id === lib.openId)!.doc;
const names = (lib: Library) => lib.entries.map((e) => docName(e.doc));

/** Adds a document (renamed if its name is taken) and opens it. */
export function addEntry(lib: Library, doc: Doc): { lib: Library; id: string } {
  const id = entryId();
  const named = withName(doc, uniqueName(docName(doc), names(lib)));
  return { lib: { ...lib, openId: id, entries: [...lib.entries, { id, doc: named, updatedAt: now() }] }, id };
}

export function updateEntry(lib: Library, id: string, doc: Doc): Library {
  const e = lib.entries.find((x) => x.id === id);
  if (!e || e.doc === doc) return lib;
  return { ...lib, entries: lib.entries.map((x) => (x.id === id ? { ...x, doc, updatedAt: now() } : x)) };
}

export function openEntry(lib: Library, id: string): Library {
  return lib.entries.some((e) => e.id === id) ? { ...lib, openId: id } : lib;
}

/** Removes an entry; opens its neighbour (next, else previous); the last one is replaced by a blank shape. */
export function removeEntry(lib: Library, id: string): Library {
  const i = lib.entries.findIndex((e) => e.id === id);
  if (i < 0) return lib;
  const entries = lib.entries.filter((e) => e.id !== id);
  if (entries.length === 0) return newLibrary(blankDoc(lib.entries[i].doc.canvas));
  const openId = lib.openId === id ? entries[Math.min(i, entries.length - 1)].id : lib.openId;
  return { ...lib, openId, entries };
}

/** Copies an entry with fresh circle ids (twin links remapped) and a " copy" name, and opens it. */
export function duplicateEntry(lib: Library, id: string): { lib: Library; id: string } {
  const src = lib.entries.find((e) => e.id === id);
  if (!src) return { lib, id: lib.openId };
  const doc: Doc = structuredClone(src.doc);
  for (const shape of doc.shapes) {
    const map = new Map(shape.circles.map((c) => [c.id, newId()]));
    shape.circles = shape.circles.map((c) => ({ ...c, id: map.get(c.id)!, ...(c.twinId ? { twinId: map.get(c.twinId) } : {}) }));
  }
  return addEntry(lib, withName(doc, `${docName(src.doc)} copy`));
}

/** What the UI needs from the library (implemented in main.ts). */
export interface LibraryApi {
  list(): LibraryEntry[];
  readonly openId: string;
  open(id: string): void;
  /** Adds a document as a new shape and opens it. */
  create(doc: Doc): void;
  duplicateOpen(): void;
  deleteOpen(): void;
}

// ---- Persistence ----

export interface LoadResult {
  lib: Library;
  warning?: string;
}

/** Loads the library; migrates the old single autosave; falls back to one circle. */
export function loadLibrary(storage: StorageLike | undefined): LoadResult {
  const read = (key: string) => {
    try {
      return storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  };
  const raw = read(LIBRARY_KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw) as { openId?: unknown; entries?: unknown };
      const entries: LibraryEntry[] = [];
      let dropped = 0;
      for (const e of Array.isArray(data.entries) ? data.entries : []) {
        const res = parseDocument(e?.doc);
        if (res.ok && typeof e.id === 'string') entries.push({ id: e.id, doc: res.doc, updatedAt: Number(e.updatedAt) || 0 });
        else dropped++;
      }
      if (entries.length) {
        const openId = entries.some((e) => e.id === data.openId) ? (data.openId as string) : entries[entries.length - 1].id;
        return {
          lib: { version: 1, openId, entries },
          warning: dropped ? `${dropped} saved shape(s) could not be read and were skipped.` : undefined,
        };
      }
    } catch {
      // fall through to migration / default
    }
  }
  const old = read(STORAGE_KEY);
  if (old) {
    const res = parseDocument(old);
    if (res.ok) return { lib: newLibrary(res.doc) };
  }
  return { lib: newLibrary() };
}

/** Saves the library; returns false when storage is full or blocked. */
export function saveLibrary(storage: StorageLike | undefined, lib: Library): boolean {
  try {
    storage?.setItem(LIBRARY_KEY, JSON.stringify(lib));
    return true;
  } catch {
    return false;
  }
}
