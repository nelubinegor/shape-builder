// SVG canvas: rendering, picking, pointer/wheel interaction, zoom controls and hint line.
import { bandPath, cornerForm, tangents, validate, type Pt, type Validation } from '../band';
import { toSigned, type CircleDoc } from '../document';
import { pick, type PickResult } from '../interact';
import { addCircleAt, deleteCircle, editCircle, toggleMode } from '../ops';
import { fitView, type Store, type View } from '../store';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PICK_TOLERANCE_PX = 8;
const MAX_CONTAIN_RADIUS_PX = 150;
const MIN_VIEW = 5;
const MAX_VIEW = 2000;

type Drag =
  | { kind: 'move'; id: string; dx: number; dy: number; pointerId: number }
  | { kind: 'resize'; id: string; pointerId: number }
  | { kind: 'pan'; startX: number; startY: number; view: View; pointerId: number };

export interface CanvasApi {
  render(): void;
  focus(): void;
  /** Handles an editing shortcut; returns true if it was consumed. */
  handleKey(e: KeyboardEvent): boolean;
  setSpace(down: boolean): void;
  /** Whether the pointer is currently over the canvas. */
  readonly pointerInside: boolean;
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
  host.innerHTML = `
    <div class="canvas-hud">
      <p class="hint" id="canvas-hint" aria-live="polite"></p>
      <div class="zoom" role="group" aria-label="Zoom">
        <button class="icon" data-zoom="out" aria-label="Zoom out" title="Zoom out (-)">−</button>
        <span class="zoom-level" id="zoom-level">100%</span>
        <button class="icon" data-zoom="in" aria-label="Zoom in" title="Zoom in (+)">+</button>
        <button data-zoom="fit" title="Fit artboard (0)">Fit</button>
      </div>
    </div>`;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'canvas');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('role', 'application');
  svg.setAttribute(
    'aria-label',
    'Shape canvas. Double-click to add a circle, Space-drag to pan. With a circle selected: arrows move, Shift+arrows resize, C toggles convex/concave, Delete removes, Tab selects the next circle.',
  );
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  host.prepend(svg);
  const layer = document.createElementNS(SVG_NS, 'g');
  svg.appendChild(layer);
  const hint = host.querySelector<HTMLParagraphElement>('#canvas-hint')!;
  const zoomLevel = host.querySelector<HTMLSpanElement>('#zoom-level')!;

  let drag: Drag | null = null;
  let hover: PickResult | null = null;
  let spaceDown = false;
  let pointerInside = false;
  svg.addEventListener('pointerenter', () => (pointerInside = true));

  const unitsPerPx = () => {
    const rect = svg.getBoundingClientRect();
    const { w, h } = store.ui.view;
    return Math.max(w / Math.max(rect.width, 1), h / Math.max(rect.height, 1));
  };

  const toDoc = (e: { clientX: number; clientY: number }): Pt => {
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const snap = (v: number, bypass = false) => {
    const { snap: on, gridStep } = store.ui;
    return on && !bypass && gridStep > 0 ? Math.round(v / gridStep) * gridStep : v;
  };

  const round = (v: number) => Math.round(v * 1e6) / 1e6;

  const pickAt = (p: Pt) => {
    const u = unitsPerPx();
    return pick(p, store.shape.circles, store.ui.selectedId, PICK_TOLERANCE_PX * u, MAX_CONTAIN_RADIUS_PX * u);
  };

  const resizeCursor = (c: CircleDoc, p: Pt) => {
    const a = ((Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI + 180) % 180; // 0..180
    if (a < 22.5 || a >= 157.5) return 'ew-resize';
    if (a < 67.5) return 'nwse-resize';
    if (a < 112.5) return 'ns-resize';
    return 'nesw-resize';
  };

  function updateCursor(p?: Pt) {
    let cursor = 'default';
    if (drag?.kind === 'pan') cursor = 'grabbing';
    else if (spaceDown) cursor = 'grab';
    else if (drag?.kind === 'move' || hover?.action === 'move') cursor = 'move';
    else if ((drag?.kind === 'resize' || hover?.action === 'resize') && p) {
      const id = drag?.kind === 'resize' ? drag.id : hover!.id;
      const c = store.shape.circles.find((o) => o.id === id);
      if (c) cursor = resizeCursor(c, p);
    }
    svg.style.cursor = cursor;
  }

  function render() {
    const { view, overlay, corners, grid, gridStep, selectedId } = store.ui;
    const { width: W, height: H } = store.doc.canvas;
    const shape = store.shape;
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`);
    const u = unitsPerPx();
    const C = toSigned(shape.circles);
    const issues = circleIssues(validate(C));
    const parts: string[] = [];

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

    if (C.length > 0) parts.push(`<path class="shape" fill="${escAttr(shape.fill)}" d="${bandPath(C)}"/>`);

    if (corners && C.length > 0) {
      const V = cornerForm(C);
      if (V.length) {
        const d = V.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join('') + 'Z';
        parts.push(`<path class="corner-poly" stroke-width="${u}" d="${d}"/>`);
        const s = 3 * u;
        for (const p of V) {
          parts.push(`<rect class="corner-vertex" x="${p.x - s}" y="${p.y - s}" width="${2 * s}" height="${2 * s}"/>`);
          parts.push(`<text class="corner-label" x="${p.x + 5 * u}" y="${p.y - 5 * u}" font-size="${11 * u}">r${fmt(p.cornerRadius)}</text>`);
        }
      }
    }

    // Circles: overlay shows all; selected, hovered and invalid circles always show.
    const hoverId = drag ? null : hover?.id ?? null;
    const ordered = shape.circles
      .map((c, i) => ({ c, i }))
      .sort((a, b) => Number(a.c.id === selectedId) - Number(b.c.id === selectedId));
    for (const { c, i } of ordered) {
      const sel = c.id === selectedId;
      const hov = c.id === hoverId;
      const bad = issues.has(i);
      if (!overlay && !sel && !bad && !hov) continue;
      const cls = ['circle', c.mode, sel ? 'selected' : '', bad ? 'invalid' : '', hov && !sel ? 'hover' : ''].join(' ');
      const dash = c.mode === 'concave' ? ` stroke-dasharray="${3 * u} ${2 * u}"` : '';
      const sw = (sel || hov ? 2 : 1.25) * u;
      parts.push(`<circle class="${cls}" cx="${c.x}" cy="${c.y}" r="${c.r}" stroke-width="${sw}"${dash}/>`);
    }
    if (overlay && C.length > 1) {
      for (const t of tangents(C)) {
        for (const p of [t.a, t.b]) parts.push(`<circle class="tangent-dot" cx="${p.x}" cy="${p.y}" r="${2.5 * u}"/>`);
      }
      shape.circles.forEach((c, i) => {
        parts.push(`<text class="index-label" x="${c.x + 4 * u}" y="${c.y - 4 * u}" font-size="${10 * u}">${i + 1}</text>`);
      });
    }

    // Visual handles (picking is geometric, not DOM-based).
    for (const { c } of ordered) {
      const sel = c.id === selectedId;
      if (!overlay && !sel && c.id !== hoverId) continue;
      parts.push(`<circle class="centre${sel ? ' selected' : ''}" cx="${c.x}" cy="${c.y}" r="${(sel ? 3 : 2) * u}"/>`);
      if (sel) parts.push(`<circle class="rim-handle" cx="${c.x + c.r}" cy="${c.y}" r="${3.5 * u}" stroke-width="${1.5 * u}"/>`);
    }
    layer.innerHTML = parts.join('');

    zoomLevel.textContent = `${Math.round((100 * W) / view.w)}%`;
    hint.textContent = selectedId
      ? 'Arrows move · Shift+arrows resize · C convex/concave · Delete removes · Esc deselects'
      : 'Double-click to add a circle · Space-drag to pan · Ctrl+scroll to zoom';
    updateCursor();
  }

  // ---- Pointer ----
  svg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (e.button === 1 || spaceDown) {
      drag = { kind: 'pan', startX: e.clientX, startY: e.clientY, view: store.ui.view, pointerId: e.pointerId };
    } else {
      const p = toDoc(e);
      const hit = pickAt(p);
      if (!hit) {
        store.select(null);
        return;
      }
      const c = store.shape.circles.find((o) => o.id === hit.id)!;
      store.select(hit.id);
      store.begin();
      drag = hit.action === 'resize'
        ? { kind: 'resize', id: hit.id, pointerId: e.pointerId }
        : { kind: 'move', id: hit.id, dx: p.x - c.x, dy: p.y - c.y, pointerId: e.pointerId };
    }
    svg.setPointerCapture(e.pointerId);
    updateCursor(toDoc(e));
    e.preventDefault();
  });

  svg.addEventListener('pointermove', (e) => {
    const p = toDoc(e);
    if (!drag) {
      const next = pickAt(p);
      if (next?.id !== hover?.id || next?.action !== hover?.action) {
        hover = next;
        render();
      }
      updateCursor(p);
      return;
    }
    if (e.pointerId !== drag.pointerId) return;
    const W = store.width;
    if (drag.kind === 'pan') {
      const u = unitsPerPx();
      store.setUI({
        view: { ...drag.view, x: drag.view.x - (e.clientX - drag.startX) * u, y: drag.view.y - (e.clientY - drag.startY) * u },
      });
      return;
    }
    const id = drag.id;
    if (drag.kind === 'move') {
      const x = round(snap(p.x - drag.dx, e.altKey));
      const y = round(snap(p.y - drag.dy, e.altKey));
      store.updateShape((s) => editCircle(s, W, id, { x, y }));
    } else {
      const c = store.shape.circles.find((o) => o.id === id);
      if (!c) return;
      const r = round(snap(Math.hypot(p.x - c.x, p.y - c.y), e.altKey));
      store.updateShape((s) => editCircle(s, W, id, { r }));
    }
    updateCursor(p);
  });

  const endDrag = (e: PointerEvent, cancelled = false) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const d = drag;
    drag = null;
    if (svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
    if (d.kind !== 'pan') {
      if (cancelled) store.cancel();
      else store.commit();
    }
    updateCursor(toDoc(e));
  };
  svg.addEventListener('pointerup', (e) => endDrag(e));
  svg.addEventListener('pointercancel', (e) => endDrag(e, true));
  svg.addEventListener('pointerleave', () => {
    pointerInside = false;
    if (!drag && hover) {
      hover = null;
      render();
    }
  });

  svg.addEventListener('dblclick', (e) => {
    if (spaceDown) return;
    const p = toDoc(e);
    if (pickAt(p)) return;
    const at = { x: round(snap(p.x, e.altKey)), y: round(snap(p.y, e.altKey)) };
    const res = addCircleAt(store.shape, store.width, at);
    store.updateShape(() => res.shape);
    store.select(res.id);
  });

  // ---- Zoom and wheel ----
  const zoomAt = (factor: number, cx: number, cy: number) => {
    const v = store.ui.view;
    const w = Math.min(MAX_VIEW, Math.max(MIN_VIEW, v.w * factor));
    const f = w / v.w;
    store.setUI({ view: { x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f, w, h: v.h * f } });
  };
  const zoomCentre = (factor: number) => {
    const v = store.ui.view;
    zoomAt(factor, v.x + v.w / 2, v.y + v.h / 2);
  };
  const fit = () => store.setUI({ view: fitView(store.doc.canvas.width, store.doc.canvas.height) });

  svg.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      if (e.ctrlKey || e.metaKey) {
        const p = toDoc(e);
        zoomAt(Math.exp(e.deltaY * scale * 0.0025), p.x, p.y);
      } else {
        const u = unitsPerPx();
        const v = store.ui.view;
        store.setUI({ view: { ...v, x: v.x + e.deltaX * scale * u, y: v.y + e.deltaY * scale * u } });
      }
    },
    { passive: false },
  );

  host.querySelectorAll<HTMLButtonElement>('[data-zoom]').forEach((b) =>
    b.addEventListener('click', () => {
      const z = b.dataset.zoom;
      if (z === 'in') zoomCentre(1 / 1.25);
      else if (z === 'out') zoomCentre(1.25);
      else fit();
    }),
  );

  // ---- Keyboard (called from the global handler) ----
  function handleKey(e: KeyboardEvent): boolean {
    const { selectedId: id } = store.ui;
    const W = store.width;
    const circles = store.shape.circles;
    const c = id ? circles.find((o) => o.id === id) : undefined;
    const onCanvas = e.target === svg;

    if (e.key === '+' || e.key === '=') zoomCentre(1 / 1.25);
    else if (e.key === '-' || e.key === '_') zoomCentre(1.25);
    else if (e.key === '0') fit();
    else if (e.key === 'Escape') {
      if (!id) return false;
      store.select(null);
    } else if (e.key === 'Tab') {
      if (!onCanvas || circles.length === 0) return false;
      const idx = c ? circles.indexOf(c) : -1;
      const next = idx + (e.shiftKey ? -1 : 1);
      if ((c && (next < 0 || next >= circles.length)) || (!c && e.shiftKey)) {
        store.select(null); // let focus leave the canvas
        return false;
      }
      store.select(circles[c ? next : 0].id);
    } else if (!c) {
      return false;
    } else if (e.key.startsWith('Arrow')) {
      const step = e.altKey ? 0.1 : 1;
      const dir = ({ ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] } as Record<string, number[]>)[e.key];
      if (!dir) return false;
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
      return false;
    }
    return true;
  }

  function setSpace(down: boolean) {
    if (spaceDown === down) return;
    spaceDown = down;
    svg.classList.toggle('panning', down);
    updateCursor();
  }

  new ResizeObserver(() => render()).observe(svg);

  return {
    render,
    focus: () => svg.focus(),
    handleKey,
    setSpace,
    get pointerInside() {
      return pointerInside;
    },
  };
}

export function describeCircle(c: CircleDoc): string {
  return `${c.mode} circle at ${fmt(c.x)}, ${fmt(c.y)}, radius ${fmt(c.r)}`;
}

function fmt(v: number): string {
  return String(Math.round(v * 100) / 100);
}

function escAttr(s: string): string {
  return s.replace(/[&"<>]/g, (ch) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[ch]!);
}
