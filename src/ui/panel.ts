// Side panel: shape header (name, fill), Add / Auto-order, compact circle rows in band order.
import { validate } from '../band';
import { toSigned } from '../document';
import {
  addCircleAfter, addCircleAt, autoOrderShape, deleteCircle, duplicateCircle, editCircle, moveCircle, toggleMode,
} from '../ops';
import type { Store } from '../store';
import { isAxisCircle } from '../symmetry';
import { circleIssues } from './canvas';

export interface PanelApi {
  render(): void;
}

const esc = (s: string) => s.replace(/[&"<>]/g, (ch) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[ch]!);
const num = (v: number) => String(Math.round(v * 1000) / 1000);

export function mountPanel(host: HTMLElement, store: Store): PanelApi {
  host.innerHTML = `
    <section class="group" aria-label="Shape">
      <div class="shape-head">
        <label class="sr-only" for="shape-name">Shape name</label>
        <input id="shape-name" class="name-input" type="text" autocomplete="off">
        <label class="sr-only" for="shape-fill">Fill colour</label>
        <input id="shape-fill" type="color" title="Fill colour">
      </div>
      <div class="list-head">
        <h2 id="circles-h">Circles <span class="muted" id="circle-count"></span></h2>
        <div class="button-row">
          <button id="add-circle" title="Add a circle (or double-click the canvas)">Add circle</button>
          <button id="auto-order" title="Sort circles clockwise around the shape">Auto-order</button>
        </div>
      </div>
      <ol class="circle-list" id="circle-list" aria-labelledby="circles-h"></ol>
      <p class="muted small">Band order, clockwise. Drag rows to reorder.</p>
    </section>`;

  const nameInput = host.querySelector<HTMLInputElement>('#shape-name')!;
  const fillInput = host.querySelector<HTMLInputElement>('#shape-fill')!;
  const list = host.querySelector<HTMLOListElement>('#circle-list')!;
  const count = host.querySelector<HTMLSpanElement>('#circle-count')!;
  let lastSelected: string | null = null;

  nameInput.addEventListener('focus', () => store.begin());
  nameInput.addEventListener('input', () => store.updateShape((s) => ({ ...s, name: nameInput.value })));
  nameInput.addEventListener('blur', () => store.commit());
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') nameInput.blur();
    if (e.key === 'Escape') {
      store.cancel();
      nameInput.blur();
    }
  });
  fillInput.addEventListener('input', () => {
    store.begin();
    store.updateShape((s) => ({ ...s, fill: fillInput.value }));
  });
  fillInput.addEventListener('change', () => store.commit());

  host.querySelector('#add-circle')!.addEventListener('click', () => {
    const sel = store.ui.selectedId;
    const res = sel
      ? addCircleAfter(store.shape, store.width, sel)
      : (() => {
          const v = store.ui.view;
          const p = { x: Math.round(v.x + v.w / 2), y: Math.round(v.y + v.h / 2) };
          return addCircleAt(store.shape, store.width, p);
        })();
    if (!res) return;
    store.updateShape(() => res.shape);
    store.select(res.id);
  });
  host.querySelector('#auto-order')!.addEventListener('click', () => {
    const before = store.shape;
    store.updateShape((s) => autoOrderShape(s));
    store.notify(store.shape === before ? 'Already in clockwise order' : 'Circles reordered clockwise');
  });

  function render() {
    const shape = store.shape;
    const W = store.width;
    if (document.activeElement !== nameInput) nameInput.value = shape.name;
    if (document.activeElement !== fillInput) fillInput.value = toHex(shape.fill);
    count.textContent = `(${shape.circles.length})`;
    const issues = circleIssues(validate(toSigned(shape.circles)));
    const sel = store.ui.selectedId;
    const n = shape.circles.length;
    list.innerHTML = shape.circles
      .map((c, i) => {
        const problems = issues.get(i) ?? [];
        const selected = c.id === sel;
        const twin = c.twinId ? shape.circles.findIndex((o) => o.id === c.twinId) : -1;
        const tag = shape.symmetry
          ? twin >= 0
            ? `<span class="tag" title="Mirrored with circle ${twin + 1}">↔${twin + 1}</span>`
            : isAxisCircle(c, W)
              ? '<span class="tag" title="On the symmetry axis">axis</span>'
              : '<span class="tag warn" title="No mirror twin">unpaired</span>'
          : '';
        return `
        <li class="circle-row${selected ? ' selected' : ''}${problems.length ? ' invalid' : ''}" data-id="${c.id}" data-index="${i}" draggable="true">
          <div class="row-main">
            <span class="drag-grip" aria-hidden="true">⋮⋮</span>
            <button class="index" data-act="select" aria-label="Select circle ${i + 1}" aria-pressed="${selected}">${i + 1}</button>
            <button class="mode ${c.mode}" data-act="mode" aria-label="Circle ${i + 1} is ${c.mode}. Toggle mode" title="${c.mode === 'convex' ? 'Convex' : 'Concave'} – click to toggle (C)"><span class="mode-icon" aria-hidden="true"></span></button>
            <label class="field inline"><span>x</span><input type="number" step="any" data-key="x" value="${num(c.x)}" aria-label="Circle ${i + 1} x"></label>
            <label class="field inline"><span>y</span><input type="number" step="any" data-key="y" value="${num(c.y)}" aria-label="Circle ${i + 1} y"></label>
            <label class="field inline"><span>r</span><input type="number" step="any" min="0.5" data-key="r" value="${num(c.r)}" aria-label="Circle ${i + 1} radius"></label>
          </div>
          ${selected ? `
          <div class="row-actions">
            ${tag}
            <span class="spacer"></span>
            <button class="icon" data-act="up" aria-label="Move circle ${i + 1} up" title="Move up" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="icon" data-act="down" aria-label="Move circle ${i + 1} down" title="Move down" ${i === n - 1 ? 'disabled' : ''}>↓</button>
            <button class="icon" data-act="dup" aria-label="Duplicate circle ${i + 1}" title="Duplicate">⧉</button>
            <button class="icon" data-act="del" aria-label="Delete circle ${i + 1}" title="Delete">✕</button>
          </div>` : tag ? `<div class="row-tag">${tag}</div>` : ''}
          ${problems.length ? `<p class="problem" role="status">${problems.map(esc).join(' · ')}</p>` : ''}
        </li>`;
      })
      .join('');
    if (sel !== lastSelected) {
      lastSelected = sel;
      if (sel) list.querySelector<HTMLLIElement>(`[data-id="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
    }
  }

  const rowOf = (el: Element | null) => el?.closest<HTMLLIElement>('.circle-row') ?? null;

  const focusAfterRender = (id: string, act: string) => {
    requestAnimationFrame(() => {
      const btn = list.querySelector<HTMLButtonElement>(`[data-id="${id}"] [data-act="${act}"]`);
      if (btn && !btn.disabled) btn.focus();
      else list.querySelector<HTMLButtonElement>(`[data-id="${id}"] [data-act="select"]`)?.focus();
    });
  };

  list.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const row = rowOf(target);
    if (!row) return;
    const id = row.dataset.id!;
    const idx = Number(row.dataset.index);
    const W = store.width;
    const act = target.closest<HTMLElement>('[data-act]')?.dataset.act;
    switch (act) {
      case 'mode':
        store.updateShape((s) => toggleMode(s, W, id));
        store.select(id);
        focusAfterRender(id, 'mode');
        break;
      case 'up':
        store.updateShape((s) => moveCircle(s, idx, idx - 1));
        focusAfterRender(id, 'up');
        break;
      case 'down':
        store.updateShape((s) => moveCircle(s, idx, idx + 1));
        focusAfterRender(id, 'down');
        break;
      case 'dup': {
        const res = duplicateCircle(store.shape, W, id);
        if (res) {
          store.updateShape(() => res.shape);
          store.select(res.id);
          focusAfterRender(res.id, 'dup');
        }
        break;
      }
      case 'del': {
        store.updateShape((s) => deleteCircle(s, id));
        const rest = store.shape.circles;
        const next = rest[Math.min(idx, rest.length - 1)];
        store.select(next ? next.id : null);
        if (next) focusAfterRender(next.id, 'del');
        break;
      }
      case 'select':
        store.select(id);
        focusAfterRender(id, 'select');
        break;
      default:
        if (!target.closest('input')) store.select(id);
    }
  });

  // Focusing any control in a row selects that circle (so row actions appear for keyboard users).
  list.addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement;
    const id = rowOf(t)?.dataset.id;
    if (!id || store.ui.selectedId === id) {
      if (t.matches('input[data-key]')) store.begin();
      return;
    }
    if (t.matches('input[data-key]')) {
      // Select without re-rendering the panel under the input (rendering waits for the edit to commit).
      store.select(id);
      store.begin();
    } else if (t.dataset.act && t.matches(':focus-visible')) {
      // Keyboard focus only: a mouse click is handled by the click listener, and
      // re-rendering here would detach the button before its click lands.
      store.select(id);
      focusAfterRender(id, t.dataset.act);
    }
  });
  list.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    const key = t.dataset.key as 'x' | 'y' | 'r' | undefined;
    const id = rowOf(t)?.dataset.id;
    if (!key || !id || t.value.trim() === '') return;
    const v = Number(t.value);
    if (!Number.isFinite(v)) return;
    store.updateShape((s) => editCircle(s, store.width, id, { [key]: v }));
  });
  list.addEventListener('focusout', (e) => {
    if ((e.target as HTMLElement).matches('input[data-key]')) store.commit();
  });
  list.addEventListener('keydown', (e) => {
    const t = e.target as HTMLInputElement;
    if (!t.matches('input[data-key]')) return;
    if (e.key === 'Enter') t.blur();
    if (e.key === 'Escape') {
      store.cancel();
      t.blur();
    }
  });

  // Drag to reorder.
  let dragFrom = -1;
  list.addEventListener('dragstart', (e) => {
    const row = rowOf(e.target as Element);
    if (!row || (e.target as Element).matches?.('input')) return;
    dragFrom = Number(row.dataset.index);
    row.classList.add('dragging');
    e.dataTransfer?.setData('text/plain', String(dragFrom));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  });
  list.addEventListener('dragover', (e) => {
    if (dragFrom < 0) return;
    e.preventDefault();
    const row = rowOf(e.target as Element);
    list.querySelectorAll('.drop-before, .drop-after').forEach((el) => el.classList.remove('drop-before', 'drop-after'));
    if (row) {
      const r = row.getBoundingClientRect();
      row.classList.add(e.clientY < r.top + r.height / 2 ? 'drop-before' : 'drop-after');
    }
  });
  list.addEventListener('drop', (e) => {
    if (dragFrom < 0) return;
    e.preventDefault();
    const row = rowOf(e.target as Element);
    if (row) {
      const r = row.getBoundingClientRect();
      let to = Number(row.dataset.index) + (e.clientY < r.top + r.height / 2 ? 0 : 1);
      if (to > dragFrom) to -= 1;
      const from = dragFrom;
      store.updateShape((s) => moveCircle(s, from, to));
    }
    dragFrom = -1;
  });
  list.addEventListener('dragend', () => {
    dragFrom = -1;
    render();
  });

  return { render };
}

function toHex(color: string): string {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  if (/^#[0-9a-f]{3}$/i.test(color)) return '#' + [...color.slice(1)].map((ch) => ch + ch).join('');
  return '#000000';
}
