import { describe, expect, it } from 'vitest';
import { validate } from '../src/band';
import {
  loadStored, newDocument, parseDocument, presetShape, saveStored, serialize, STORAGE_KEY, toSigned,
} from '../src/document';
import { diamond, presetNames } from '../src/presets';

describe('presets', () => {
  it('load as valid shapes', () => {
    for (const name of presetNames) {
      const v = validate(toSigned(presetShape(name).circles));
      expect(v.invalidPairs, name).toEqual([]);
      expect(v.nested, name).toEqual([]);
    }
  });

  it('heart has the brief values in order', () => {
    const c = presetShape('heart').circles.map((c) => [c.x, c.y, c.mode === 'concave' ? -c.r : c.r]);
    expect(c).toEqual([[70, 35, 27], [50, 90, 4], [30, 35, 27], [50, 12, -3]]);
  });

  it('diamond concave centres sit on the side normals', () => {
    const concave = diamond.filter((t) => t[2] < 0);
    const expected = [[137.5, -31.69], [137.5, 131.69], [-37.5, 131.69], [-37.5, -31.69]];
    concave.forEach((t, i) => {
      expect(t[0]).toBeCloseTo(expected[i][0], 2);
      expect(t[1]).toBeCloseTo(expected[i][1], 2);
      expect(t[2]).toBe(-90);
    });
    // each concave circle clears its neighbouring tips by 0.5
    for (let i = 1; i < diamond.length; i += 2) {
      for (const j of [i - 1, (i + 1) % diamond.length]) {
        const d = Math.hypot(diamond[i][0] - diamond[j][0], diamond[i][1] - diamond[j][1]);
        expect(d).toBeCloseTo(94.5, 9);
      }
    }
  });
});

describe('document', () => {
  it('round trips', () => {
    const doc = newDocument(presetShape('club'));
    doc.shapes[0].name = 'My club';
    doc.shapes[0].fill = '#123456';
    doc.shapes[0].symmetry = true;
    const res = parseDocument(serialize(doc));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.doc).toEqual(doc);
  });

  it('rejects invalid JSON', () => {
    const res = parseDocument('{nope');
    expect(res.ok).toBe(false);
  });

  it('rejects unknown version', () => {
    const doc = { ...newDocument(), version: 2 };
    const res = parseDocument(JSON.stringify(doc));
    expect(res).toMatchObject({ ok: false });
    if (!res.ok) expect(res.error).toMatch(/version/);
  });

  it('rejects circles without a radius', () => {
    const doc = JSON.parse(serialize(newDocument())) as { shapes: { circles: Record<string, unknown>[] }[] };
    delete doc.shapes[0].circles[1].r;
    const res = parseDocument(JSON.stringify(doc));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/circle 2.*radius/);
  });

  it('rejects unknown mode', () => {
    const doc = JSON.parse(serialize(newDocument())) as { shapes: { circles: Record<string, unknown>[] }[] };
    doc.shapes[0].circles[0].mode = 'wobbly';
    expect(parseDocument(JSON.stringify(doc)).ok).toBe(false);
  });
});

describe('localStorage', () => {
  const stub = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
  };

  it('starts with the heart when empty', () => {
    const { doc } = loadStored(stub());
    expect(doc.shapes[0].name).toBe('heart');
    expect(doc.shapes[0].circles).toHaveLength(4);
  });

  it('restores a saved document', () => {
    const s = stub();
    const doc = newDocument(presetShape('spade'));
    saveStored(s, doc);
    expect(s.m.has(STORAGE_KEY)).toBe(true);
    expect(loadStored(s).doc).toEqual(doc);
  });

  it('falls back with an error when stored data is corrupt', () => {
    const s = stub();
    s.setItem(STORAGE_KEY, '{"version":9}');
    const res = loadStored(s);
    expect(res.error).toBeTruthy();
    expect(res.doc.shapes[0].name).toBe('heart');
  });
});
