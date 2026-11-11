// Side panel: shape settings and the circle list in band order.
import { validate } from '../band';
import { toSigned } from '../document';
import { deleteCircle, duplicateCircle, editCircle, moveCircle, toggleMode } from '../ops';
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
    <section class="group" aria-labelledby="shape-h">
      <h2 id="shape-h">Shape</h2>
      <div class="field-row">
        <label class="field grow"><span>Name</span><input id="shape-name" type="text" autocomplete="off"></label>
        <label class="field"><span>Fill</span><input id="shape-fill" type="color"></label>
      </div>
    </section>
    <section class="group" aria-labelledby="circles-h">
      <div class="group-head">
        <h2 id="circles-h">Circles <span class="muted" id="circle-count"></span></h2>
      </div>
      <p class="muted small">Band order, clockwise. Drag rows to reorder.</p>
      <ol class="circle-list" id="circle-list"></ol>
    </section>`;

  const nameInput = host.querySelector<HTMLInputElement>('#shape-name')!;
  const fillInput = host.querySelector<HTMLInputElement>('#shape-fill')!;
  const list = host.querySelector<HTMLOListElement>('#circle-list')!;
  const count = host.querySelector<HTMLSpanElement>('#circle-count')!;

  // Text-like inputs: one undo step per focus session.
  const editSession = (el: HTMLInputElement, apply: (value: string) => void) => {
    el.addEventListener('focus', () => store.begin());
    el.addEventListener('input', () => apply(el.value));
    el.addEventListener('blur', () => store.commit());
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') el.blur();
      if (e.key === 'Escape') {
        store.cancel();
        el.blur();
      }
    });
  };

  editSession(nameInput, (v) => store.updateShape((s) => ({ ...s, name: v })));
  fillInput.addEventListener('input', () => {
    store.begin();
    store.updateShape((s) => ({ ...s, fill: fillInput.value }));
  });
  fillInput.addEventListener('change', () => store.commit());

  function render() {
    const shape = store.shape;
    const W = store.width;
    if (document.activeElement !== nameInput) nameInput.value = shape.name;
    if (document.activeElement !== fillInput) fillInput.value = toHex(shape.fill);
    count.textContent = `(${shape.circles.length})`;
    const issues = circleIssues(validate(toSigned(shape.circles)));
    const sel = store.ui.selectedId;
    list.innerHTML = shape.circles
      .map((c, i) => {
        const problems = issues.get(i) ?? [];
        const twin = c.twinId ? shape.circles.findIndex((o) => o.id === c.twinId) : -1;
        const tag = shape.symmetry
          ? twin >= 0
            ? `<span class="tag" title="Mirrored with circle ${twin + 1}">↔ ${twin + 1}</span>`
            : isAxisCircle(c, W)
              ? '<span class="tag" title="On the symmetry axis">axis</span>'
              : '<span class="tag warn" title="No mirror twin">unpaired</span>'
          : '';
        return `
        <li class="circle-row${c.id === sel ? ' selected' : ''}${problems.length ? ' invalid' : ''}" data-id="${c.id}" data-index="${i}" draggable="true">
          <div class="row-head">
            <span class="drag-grip" aria-hidden="true">⋮⋮</span>
            <button class="index" data-act="select" aria-label="Select circle ${i + 1}" aria-pressed="${c.id === sel}">${i + 1}</button>
            <button class="mode ${c.mode}" data-act="mode" aria-label="Circle ${i + 1} is ${c.mode}. Toggle mode" title="Toggle convex/concave (C)">${c.mode === 'convex' ? 'Convex' : 'Concave'}</button>
            ${tag}
            <span class="spacer"></span>
            <button class="icon" data-act="up" aria-label="Move circle ${i + 1} up" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="icon" data-act="down" aria-label="Move circle ${i + 1} down" ${i === shape.circles.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="icon" data-act="dup" aria-label="Duplicate circle ${i + 1}" title="Duplicate">⧉</button>
            <button class="icon" data-act="del" aria-label="Delete circle ${i + 1}" title="Delete">✕</button>
          </div>
          <div class="row-fields">
            <label class="field"><span>x</span><input type="number" step="any" data-key="x" value="${num(c.x)}" aria-label="Circle ${i + 1} x"></label>
            <label class="field"><span>y</span><input type="number" step="any" data-key="y" value="${num(c.y)}" aria-label="Circle ${i + 1} y"></label>
            <label class="field"><span>r</span><input type="number" step="any" min="0.5" data-key="r" value="${num(c.r)}" aria-label="Circle ${i + 1} radius"></label>
          </div>
          ${problems.length ? `<p class="problem" role="status">${problems.map(esc).join(' · ')}</p>` : ''}
        </li>`;
      })
      .join('');
  }

  const rowOf = (el: Element | null) => el?.closest<HTMLLIElement>('.circle-row') ?? null;

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
        break;
      case 'up':
        store.updateShape((s) => moveCircle(s, idx, idx - 1));
        focusAct(id, 'up');
        break;
      case 'down':
        store.updateShape((s) => moveCircle(s, idx, idx + 1));
        focusAct(id, 'down');
        break;
      case 'dup': {
        const res = duplicateCircle(store.shape, W, id);
        if (res) {
          store.updateShape(() => res.shape);
          store.select(res.id);
        }
        break;
      }
      case 'del':
        store.updateShape((s) => deleteCircle(s, id));
        break;
      default:
        store.select(id);
    }
  });

  const focusAct = (id: string, act: string) => {
    requestAnimationFrame(() => {
      const btn = list.querySelector<HTMLButtonElement>(`[data-id="${id}"] [data-act="${act}"]`);
      if (btn && !btn.disabled) btn.focus();
      else list.querySelector<HTMLButtonElement>(`[data-id="${id}"] [data-act="select"]`)?.focus();
    });
  };

  // Numeric inputs: live update, one undo step per focus.
  list.addEventListener('focusin', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.matches('input[data-key]')) {
      store.begin();
      const id = rowOf(t)?.dataset.id;
      if (id && store.ui.selectedId !== id) store.select(id);
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
    if (!row || (e.target as Element).matches('input')) return;
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
