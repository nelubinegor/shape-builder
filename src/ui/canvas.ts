// SVG canvas: rendering and pointer/keyboard interaction.
import { bandPath, cornerForm, tangents, validate, type Validation } from '../band';
import { toSigned, type CircleDoc } from '../document';
import { addCircle, deleteCircle, editCircle, toggleMode } from '../ops';
import type { Store, View } from '../store';
import { isAxisCircle } from '../symmetry';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DRAG_THRESHOLD_PX = 3;
const MIN_VIEW = 5;
const MAX_VIEW = 2000;

type Drag =
  | { kind: 'move'; id: string; dx: number; dy: number; pointerId: number }
  | { kind: 'resize'; id: string; pointerId: number }
  | { kind: 'pan'; startX: number; startY: number; view: View; moved: boolean; pointerId: number };

export interface CanvasApi {
  render(): void;
  focus(): void;
}

export function circleIssues(v: Validation): Map<number, string[]> {
  const m = new Map<number, string[]>();
  const add = (i: number, msg: string) => m.set(i, [...(m.get(i) ?? []), msg]);
  for (const [i, j] of v.invalidPairs) {
    add(i, `No tangent to circle ${j + 1}`);
    add(j, `No tangent to circle ${i + 1}`);
  }
  for (const { inner, outer } of v.nested) add(inner, `Inside circle ${outer + 1}`);
  return m;
}

export function mountCanvas(host: HTMLElement, store: Store): CanvasApi {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'canvas');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('role', 'application');
  svg.setAttribute(
    'aria-label',
    'Shape canvas. Click to add a circle, drag to pan. With a circle selected: arrows move, Shift+arrows resize, C toggles convex/concave, Delete removes, Tab selects the next circle.',
  );
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  host.appendChild(svg);
  const layer = document.createElementNS(SVG_NS, 'g');
  svg.appendChild(layer);

  let drag: Drag | null = null;

  const unitsPerPx = () => {
    const rect = svg.getBoundingClientRect();
    const { w, h } = store.ui.view;
    return Math.max(w / Math.max(rect.width, 1), h / Math.max(rect.height, 1));
  };

  const toDoc = (e: { clientX: number; clientY: number }) => {
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const snap = (v: number) => {
    const { snap: on, gridStep } = store.ui;
    return on && gridStep > 0 ? Math.round(v / gridStep) * gridStep : v;
  };

  const round = (v: number) => Math.round(v * 1e6) / 1e6;

  function render() {
    const { view, overlay, corners, grid, gridStep, selectedId } = store.ui;
    const { width: W, height: H } = store.doc.canvas;
    const shape = store.shape;
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
    const u = unitsPerPx();
    const C = toSigned(shape.circles);
    const v = validate(C);
    const issues = circleIssues(v);
    const parts: string[] = [];

    // Paper
    parts.push(`<rect class="paper" x="0" y="0" width="${W}" height="${H}"/>`);
    if (grid) {
      let step = gridStep > 0 ? gridStep : 1;
      while (step / u < 6) step *= 5;
      const minor: string[] = [];
      const major: string[] = [];
      for (let x = 0; x <= W + 1e-9; x += step) (Math.abs(x % 10) < 1e-9 ? major : minor).push(`M${x} 0V${H}`);
      for (let y = 0; y <= H + 1e-9; y += step) (Math.abs(y % 10) < 1e-9 ? major : minor).push(`M0 ${y}H${W}`);
      parts.push(`<path class="grid-minor" stroke-width="${u}" d="${minor.join('')}"/>`);
      parts.push(`<path class="grid-major" stroke-width="${u}" d="${major.join('')}"/>`);
    }
    if (shape.symmetry) {
      parts.push(`<path class="axis" stroke-width="${u}" stroke-dasharray="${4 * u} ${4 * u}" d="M${W / 2} ${view.y}V${view.y + view.h}"/>`);
    }

    // Shape
    if (C.length > 0) parts.push(`<path class="shape" fill="${escAttr(shape.fill)}" d="${bandPath(C)}"/>`);

    // Corner preview
    if (corners && C.length > 1) {
      const V = cornerForm(C);
      if (V.length) {
        const d = V.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join('') + 'Z';
        parts.push(`<path class="corner-poly" stroke-width="${u}" d="${d}"/>`);
        const s = 3 * u;
        for (const p of V) {
          parts.push(`<rect class="corner-vertex" x="${p.x - s}" y="${p.y - s}" width="${2 * s}" height="${2 * s}"/>`);
          parts.push(
            `<text class="corner-label" x="${p.x + 5 * u}" y="${p.y - 5 * u}" font-size="${11 * u}">r${fmt(p.cornerRadius)}</text>`,
          );
        }
      }
    }

    // Construction overlay (always show selected + invalid circles)
    const T = C.length > 1 ? tangents(C) : [];
    const ordered = shape.circles.map((c, i) => ({ c, i })).sort((a, b) => Number(a.c.id === selectedId) - Number(b.c.id === selectedId));
    for (const { c, i } of ordered) {
      const sel = c.id === selectedId;
      const bad = issues.has(i);
      if (!overlay && !sel && !bad) continue;
      const cls = ['circle', c.mode, sel ? 'selected' : '', bad ? 'invalid' : ''].join(' ');
      const dash = c.mode === 'concave' ? ` stroke-dasharray="${3 * u} ${2 * u}"` : '';
      parts.push(`<circle class="${cls}" cx="${c.x}" cy="${c.y}" r="${c.r}" stroke-width="${(sel ? 2 : 1.25) * u}"${dash}/>`);
    }
    if (overlay) {
      for (const t of T) {
        for (const p of [t.a, t.b]) parts.push(`<circle class="tangent-dot" cx="${p.x}" cy="${p.y}" r="${2.5 * u}"/>`);
      }
      if (C.length > 1) {
        // index labels at the centre of each circle
        shape.circles.forEach((c, i) => {
          parts.push(`<text class="index-label" x="${c.x}" y="${c.y - 6 * u}" font-size="${10 * u}" text-anchor="middle">${i + 1}</text>`);
        });
      }
    }

    // Hit targets and handles
    for (const { c } of ordered) {
      const sel = c.id === selectedId;
      if (c.mode === 'convex') {
        parts.push(`<circle class="hit" data-role="move" data-id="${c.id}" cx="${c.x}" cy="${c.y}" r="${c.r}"/>`);
      } else {
        parts.push(`<circle class="hit ring" data-role="move" data-id="${c.id}" cx="${c.x}" cy="${c.y}" r="${c.r}" stroke-width="${8 * u}"/>`);
      }
      parts.push(
        `<circle class="centre${sel ? ' selected' : ''}" data-role="move" data-id="${c.id}" cx="${c.x}" cy="${c.y}" r="${(sel ? 3.5 : 2.5) * u}"/>`,
      );
      if (sel) {
        parts.push(
          `<circle class="rim-handle" data-role="resize" data-id="${c.id}" cx="${c.x + c.r}" cy="${c.y}" r="${4 * u}" stroke-width="${1.5 * u}"/>`,
        );
      }
    }
    layer.innerHTML = parts.join('');
    svg.classList.toggle('has-issues', issues.size > 0);
  }

  // ---- Pointer interaction ----
  svg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.button !== 1) return;
    svg.focus({ preventScroll: true });
    const target = e.target as Element;
    const role = target.getAttribute('data-role');
    const id = target.getAttribute('data-id');
    const p = toDoc(e);
    if (role && id && e.button === 0) {
      const c = store.shape.circles.find((o) => o.id === id);
      if (!c) return;
      store.select(id);
      store.begin();
      drag = role === 'resize'
        ? { kind: 'resize', id, pointerId: e.pointerId }
        : { kind: 'move', id, dx: p.x - c.x, dy: p.y - c.y, pointerId: e.pointerId };
    } else {
      drag = { kind: 'pan', startX: e.clientX, startY: e.clientY, view: store.ui.view, moved: e.button === 1, pointerId: e.pointerId };
    }
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  svg.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const W = store.width;
    if (drag.kind === 'pan') {
      const dxPx = e.clientX - drag.startX;
      const dyPx = e.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dxPx, dyPx) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      const u = unitsPerPx();
      store.setUI({ view: { ...drag.view, x: drag.view.x - dxPx * u, y: drag.view.y - dyPx * u } });
      return;
    }
    const p = toDoc(e);
    const id = drag.id;
    if (drag.kind === 'move') {
      const x = round(snap(p.x - drag.dx));
      const y = round(snap(p.y - drag.dy));
      store.updateShape((s) => editCircle(s, W, id, { x, y }));
    } else {
      const c = store.shape.circles.find((o) => o.id === id);
      if (!c) return;
      const r = round(snap(Math.hypot(p.x - c.x, p.y - c.y)));
      store.updateShape((s) => editCircle(s, W, id, { r }));
    }
  });

  const endDrag = (e: PointerEvent, cancelled = false) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    if (svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
    if (d.kind === 'pan') {
      if (!d.moved && !cancelled) {
        const p = toDoc(e);
        const res = addCircle(store.shape, store.width, { x: round(snap(p.x)), y: round(snap(p.y)) }, store.ui.selectedId);
        store.updateShape(() => res.shape);
        store.select(res.id);
      }
      return;
    }
    if (cancelled) store.cancel();
    else store.commit();
  };
  svg.addEventListener('pointerup', (e) => endDrag(e));
  svg.addEventListener('pointercancel', (e) => endDrag(e, true));

  // ---- Zoom ----
  const zoomAt = (factor: number, cx: number, cy: number) => {
    const v = store.ui.view;
    const w = Math.min(MAX_VIEW, Math.max(MIN_VIEW, v.w * factor));
    const f = w / v.w;
    const h = v.h * f;
    store.setUI({ view: { x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f, w, h } });
  };
  svg.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const p = toDoc(e);
      zoomAt(Math.exp(e.deltaY * 0.0015), p.x, p.y);
    },
    { passive: false },
  );

  // ---- Keyboard (canvas focused) ----
  svg.addEventListener('keydown', (e) => {
    const { selectedId: id, view } = store.ui;
    const W = store.width;
    const circles = store.shape.circles;
    const c = id ? circles.find((o) => o.id === id) : undefined;
    const mod = e.ctrlKey || e.metaKey;
    if (mod) return; // undo/redo handled globally

    if (e.key === '+' || e.key === '=') {
      zoomAt(1 / 1.25, view.x + view.w / 2, view.y + view.h / 2);
    } else if (e.key === '-' || e.key === '_') {
      zoomAt(1.25, view.x + view.w / 2, view.y + view.h / 2);
    } else if (e.key === '0') {
      store.setUI({ view: { x: 0, y: 0, w: store.doc.canvas.width, h: store.doc.canvas.height } });
    } else if (e.key === 'Tab') {
      if (circles.length === 0) return;
      const idx = c ? circles.indexOf(c) : -1;
      const next = idx + (e.shiftKey ? -1 : 1);
      if ((c && (next < 0 || next >= circles.length)) || (!c && e.shiftKey)) {
        store.select(null); // let focus leave the canvas
        return;
      }
      store.select(circles[c ? next : 0].id);
    } else if (e.key === 'Escape') {
      store.select(null);
    } else if (!c) {
      return;
    } else if (e.key.startsWith('Arrow')) {
      const step = e.altKey ? 0.1 : 1;
      const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (!dir) return;
      if (e.shiftKey) {
        const grow = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : -1;
        store.updateShape((s) => editCircle(s, W, c.id, { r: round(c.r + grow * step) }));
      } else {
        store.updateShape((s) => editCircle(s, W, c.id, { x: round(c.x + dir[0] * step), y: round(c.y + dir[1] * step) }));
      }
    } else if (e.key === 'c' || e.key === 'C') {
      store.updateShape((s) => toggleMode(s, W, c.id));
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      const idx = circles.indexOf(c);
      store.updateShape((s) => deleteCircle(s, c.id));
      const rest = store.shape.circles;
      store.select(rest.length ? rest[Math.min(idx, rest.length - 1)].id : null);
    } else {
      return;
    }
    e.preventDefault();
  });

  new ResizeObserver(() => render()).observe(svg);

  return { render, focus: () => svg.focus() };
}

export function describeCircle(c: CircleDoc, width: number): string {
  return `${c.mode} circle at ${fmt(c.x)}, ${fmt(c.y)}, radius ${fmt(c.r)}${isAxisCircle(c, width) ? ', on axis' : ''}`;
}

function fmt(v: number): string {
  return String(Math.round(v * 100) / 100);
}

function escAttr(s: string): string {
  return s.replace(/[&"<>]/g, (ch) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[ch]!);
}
