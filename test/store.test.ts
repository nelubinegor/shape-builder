import { describe, expect, it } from 'vitest';
import { newDocument, type ShapeDoc } from '../src/document';
import { suitShape } from './fixtures';
import {
  addCircle, deleteCircle, duplicateCircle, editCircle, loadPreset, moveCircle, setSymmetry, toggleMode,
} from '../src/ops';
import { HISTORY_LIMIT, Store } from '../src/store';

const W = 100;
const xs = (s: ShapeDoc) => s.circles.map((c) => c.x);

describe('store undo/redo', () => {
  it('a transaction is one undo step', () => {
    const st = new Store(newDocument());
    const id = st.shape.circles[0].id;
    const x0 = st.shape.circles[0].x;
    st.begin();
    for (let i = 1; i <= 10; i++) st.updateShape((s) => editCircle(s, W, id, { x: x0 + i }));
    st.commit();
    expect(st.shape.circles[0].x).toBe(x0 + 10);
    st.undo();
    expect(st.shape.circles[0].x).toBe(x0);
    st.redo();
    expect(st.shape.circles[0].x).toBe(x0 + 10);
  });

  it('a new edit clears redo', () => {
    const st = new Store(newDocument());
    const id = st.shape.circles[0].id;
    st.updateShape((s) => editCircle(s, W, id, { r: 10 }));
    st.undo();
    expect(st.canRedo).toBe(true);
    st.updateShape((s) => editCircle(s, W, id, { r: 11 }));
    expect(st.canRedo).toBe(false);
  });

  it('caps history', () => {
    const st = new Store(newDocument());
    const id = st.shape.circles[0].id;
    for (let i = 0; i < HISTORY_LIMIT + 50; i++) st.updateShape((s) => editCircle(s, W, id, { r: 1 + i }));
    let n = 0;
    while (st.canUndo) {
      st.undo();
      n++;
    }
    expect(n).toBe(HISTORY_LIMIT);
  });

  it('clears selection when the selected circle disappears on undo', () => {
    const st = new Store(newDocument());
    const res = addCircle(st.shape, W, { x: 10, y: 10 }, null);
    st.updateShape(() => res.shape);
    st.select(res.id);
    st.undo();
    expect(st.ui.selectedId).toBeNull();
  });
});

describe('ops', () => {
  it('adds after the selected circle', () => {
    const s = suitShape('heart');
    const { shape, id } = addCircle(s, W, { x: 10, y: 10 }, s.circles[1].id);
    expect(shape.circles[2].id).toBe(id);
    expect(shape.circles).toHaveLength(5);
  });

  it('clamps radius', () => {
    const s = suitShape('heart');
    expect(editCircle(s, W, s.circles[0].id, { r: 0.1 }).circles[0].r).toBe(0.5);
  });

  it('duplicates with offset after the original', () => {
    const s = suitShape('heart');
    const res = duplicateCircle(s, W, s.circles[3].id)!;
    const d = res.shape.circles[4];
    expect(d.id).toBe(res.id);
    expect([d.x, d.y, d.r, d.mode]).toEqual([52, 14, 3, 'concave']);
  });

  it('reorders', () => {
    const s = suitShape('heart');
    const m = moveCircle(s, 0, 2);
    expect(m.circles.map((c) => c.id)).toEqual([s.circles[1].id, s.circles[2].id, s.circles[0].id, s.circles[3].id]);
  });

  it('toggles mode', () => {
    const s = suitShape('heart');
    expect(toggleMode(s, W, s.circles[0].id).circles[0].mode).toBe('concave');
  });
});

describe('symmetry', () => {
  const sym = () => setSymmetry(suitShape('heart'), W, true);

  it('pairs the heart lobes and leaves axis circles alone', () => {
    const s = sym();
    const [r, b, l, t] = s.circles;
    expect(r.twinId).toBe(l.id);
    expect(l.twinId).toBe(r.id);
    expect(b.twinId).toBeUndefined();
    expect(t.twinId).toBeUndefined();
  });

  it('moving the right lobe moves the left lobe', () => {
    const s = sym();
    const out = editCircle(s, W, s.circles[0].id, { x: 72 });
    expect(out.circles[2].x).toBe(28);
  });

  it('mirrors radius and mode', () => {
    const s = sym();
    const out = toggleMode(editCircle(s, W, s.circles[2].id, { r: 20 }), W, s.circles[2].id);
    expect(out.circles[0].r).toBe(20);
    expect(out.circles[0].mode).toBe('concave');
  });

  it('axis circles stay on the axis', () => {
    const s = sym();
    const out = editCircle(s, W, s.circles[1].id, { x: 60, y: 88 });
    expect(out.circles[1].x).toBe(50);
    expect(out.circles[1].y).toBe(88);
  });

  it('adding right of the axis inserts a twin at the mirrored loop position', () => {
    const s = sym(); // [R(70), B(50), L(30), T(50)]
    const { shape, id } = addCircle(s, W, { x: 80, y: 60 }, s.circles[0].id);
    // R, N, B, N', L, T
    expect(xs(shape)).toEqual([70, 80, 50, 20, 30, 50]);
    expect(shape.circles[1].id).toBe(id);
    expect(shape.circles[3].twinId).toBe(id);
    expect(shape.circles[3].y).toBe(60);
  });

  it('adding after an axis circle puts the twin before it', () => {
    const s = sym(); // [R, B, L, T]
    const { shape } = addCircle(s, W, { x: 60, y: 8 }, s.circles[3].id);
    // after T (wraps to R): N goes after T, twin goes before T
    expect(xs(shape)).toEqual([70, 50, 30, 40, 50, 60]);
  });

  it('adding on the axis adds no twin', () => {
    const s = sym();
    const { shape } = addCircle(s, W, { x: 50.3, y: 60 }, s.circles[0].id);
    expect(shape.circles).toHaveLength(5);
    expect(shape.circles[1].x).toBe(50);
  });

  it('deleting removes both twins', () => {
    const s = sym();
    const out = deleteCircle(s, s.circles[0].id);
    expect(out.circles).toHaveLength(2);
    expect(xs(out)).toEqual([50, 50]);
  });

  it('turning symmetry off clears pairs', () => {
    const s = setSymmetry(sym(), W, false);
    expect(s.circles.every((c) => !c.twinId)).toBe(true);
  });

  it('preset keeps symmetry and fill', () => {
    const s = { ...sym(), fill: '#ff0000' };
    const p = loadPreset(s, { width: W, height: W }, 'cross');
    expect(p.symmetry).toBe(true);
    expect(p.fill).toBe('#ff0000');
    expect(p.circles.filter((c) => c.twinId)).toHaveLength(12);
  });
});
