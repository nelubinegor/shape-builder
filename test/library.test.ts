import { describe, expect, it } from 'vitest';
import { newDocument, presetShape, serialize, STORAGE_KEY } from '../src/document';
import {
  addEntry, docName, duplicateEntry, LIBRARY_KEY, loadLibrary, newLibrary, openDoc, openEntry, removeEntry,
  saveLibrary, uniqueName, updateEntry,
} from '../src/library';
import { setSymmetry } from '../src/ops';
import { suitShape } from './fixtures';

const docOf = (name: Parameters<typeof suitShape>[0]) => newDocument(suitShape(name));

describe('library operations', () => {
  it('add opens the new entry and keeps the old one', () => {
    const lib0 = newLibrary(docOf('heart'));
    const { lib, id } = addEntry(lib0, docOf('club'));
    expect(lib.entries).toHaveLength(2);
    expect(lib.openId).toBe(id);
    expect(docName(lib.entries[0].doc)).toBe('heart');
  });

  it('numbers taken names', () => {
    expect(uniqueName('heart', ['heart', 'heart 2'])).toBe('heart 3');
    let lib = newLibrary(docOf('heart'));
    lib = addEntry(lib, docOf('heart')).lib;
    expect(docName(openDoc(lib))).toBe('heart 2');
  });

  it('update writes to one entry', () => {
    let lib = newLibrary(docOf('heart'));
    const first = lib.openId;
    lib = addEntry(lib, docOf('club')).lib;
    const edited = { ...docOf('spade') };
    lib = updateEntry(lib, first, edited);
    expect(lib.entries[0].doc).toBe(edited);
    expect(docName(lib.entries[1].doc)).toBe('club');
  });

  it('removing the open entry opens its neighbour', () => {
    let lib = newLibrary(docOf('heart'));
    const a = lib.openId;
    const b = addEntry(lib, docOf('club'));
    const c = addEntry(b.lib, docOf('spade'));
    lib = openEntry(c.lib, b.id);
    lib = removeEntry(lib, b.id);
    expect(lib.openId).toBe(c.id); // next one
    lib = removeEntry(lib, c.id);
    expect(lib.openId).toBe(a); // previous when it was the last
  });

  it('removing the last entry leaves one blank shape on the same canvas', () => {
    const doc = { ...newDocument(presetShape('hand')), canvas: { width: 24, height: 24 } };
    const only = newLibrary(doc);
    const out = removeEntry(only, only.openId);
    expect(out.entries).toHaveLength(1);
    expect(openDoc(out).canvas).toEqual({ width: 24, height: 24 });
    expect(openDoc(out).shapes[0].circles).toHaveLength(1);
    expect(openDoc(out).shapes[0].circles[0]).toMatchObject({ x: 12, y: 12 });
  });

  it('duplicate copies circles with new ids, remapped twins and a copy name', () => {
    const src = newDocument(setSymmetry(suitShape('heart'), 100, true));
    const lib0 = newLibrary(src);
    const { lib, id } = duplicateEntry(lib0, lib0.openId);
    const dup = lib.entries.find((e) => e.id === id)!.doc.shapes[0];
    const orig = src.shapes[0];
    expect(docName(openDoc(lib))).toBe('heart copy');
    expect(dup.circles.map((c) => [c.x, c.y, c.r, c.mode])).toEqual(orig.circles.map((c) => [c.x, c.y, c.r, c.mode]));
    const origIds = new Set(orig.circles.map((c) => c.id));
    expect(dup.circles.every((c) => !origIds.has(c.id))).toBe(true);
    for (const c of dup.circles) if (c.twinId) expect(dup.circles.some((o) => o.id === c.twinId)).toBe(true);
  });
});

describe('library persistence', () => {
  const stub = (init: Record<string, string> = {}) => {
    const m = new Map(Object.entries(init));
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
  };

  it('round trips with the open shape', () => {
    let lib = newLibrary(docOf('heart'));
    const a = lib.openId;
    lib = addEntry(lib, docOf('club')).lib;
    lib = openEntry(lib, a);
    const s = stub();
    expect(saveLibrary(s, lib)).toBe(true);
    const back = loadLibrary(s).lib;
    expect(back.openId).toBe(a);
    expect(back.entries.map((e) => docName(e.doc))).toEqual(['heart', 'club']);
  });

  it('migrates the old single autosave', () => {
    const s = stub({ [STORAGE_KEY]: serialize(docOf('spade')) });
    const { lib } = loadLibrary(s);
    expect(lib.entries).toHaveLength(1);
    expect(docName(openDoc(lib))).toBe('spade');
  });

  it('starts with one circle when nothing is stored', () => {
    const { lib } = loadLibrary(stub());
    expect(lib.entries).toHaveLength(1);
    expect(openDoc(lib).shapes[0].circles).toHaveLength(1);
  });

  it('drops invalid entries with a warning', () => {
    const good = newLibrary(docOf('heart'));
    const raw = { ...good, entries: [...good.entries, { id: 'bad', doc: { version: 7 }, updatedAt: 0 }] };
    const res = loadLibrary(stub({ [LIBRARY_KEY]: JSON.stringify(raw) }));
    expect(res.lib.entries).toHaveLength(1);
    expect(res.warning).toMatch(/1 saved shape/);
  });

  it('reports a failed write', () => {
    const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(saveLibrary(full, newLibrary())).toBe(false);
  });
});
