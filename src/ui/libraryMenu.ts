// "My shapes" popover: thumbnail grid of the library plus New / Duplicate / Delete.
import { bandPath } from '../band';
import { toSigned } from '../document';
import { blankDoc, docName, type LibraryApi, type LibraryEntry } from '../library';
import type { Store } from '../store';

const esc = (s: string) => s.replace(/[&"<>]/g, (ch) => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[ch]!);

function thumbnail(entry: LibraryEntry): string {
  const { width: W, height: H } = entry.doc.canvas;
  const shape = entry.doc.shapes[0];
  const C = toSigned(shape.circles);
  const d = C.length ? bandPath(C) : '';
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <rect width="${W}" height="${H}" fill="#fff"/>${d ? `<path d="${d}" fill="${esc(shape.fill)}"/>` : ''}</svg>`;
}

export function mountLibraryMenu(button: HTMLButtonElement, store: Store, library: LibraryApi): { close(): void } {
  const menu = document.createElement('div');
  menu.className = 'library-menu';
  menu.id = 'library-menu';
  menu.setAttribute('role', 'dialog');
  menu.setAttribute('aria-label', 'My shapes');
  menu.hidden = true;
  menu.innerHTML = `
    <div class="library-head">
      <h2>My shapes</h2>
      <div class="button-row">
        <button data-lib="new" title="New blank shape on the same canvas size">New</button>
        <button data-lib="duplicate" title="Copy the open shape">Duplicate</button>
        <button data-lib="delete" title="Delete the open shape">Delete</button>
      </div>
    </div>
    <div class="library-grid" role="list"></div>`;
  document.body.appendChild(menu);
  const grid = menu.querySelector<HTMLDivElement>('.library-grid')!;
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', menu.id);
  button.setAttribute('aria-expanded', 'false');

  const tiles = () => [...grid.querySelectorAll<HTMLButtonElement>('.library-tile')];

  function render() {
    grid.innerHTML = library
      .list()
      .map((e) => {
        const open = e.id === library.openId;
        const name = docName(e.doc);
        return `<div role="listitem"><button class="library-tile${open ? ' open' : ''}" data-id="${e.id}" aria-label="${esc(name)}${open ? ' (open)' : ''}" ${open ? 'aria-current="true"' : ''}>
          ${thumbnail(e)}<span class="library-name">${esc(name)}</span></button></div>`;
      })
      .join('');
  }

  function position() {
    const r = button.getBoundingClientRect();
    menu.style.top = `${r.bottom + 6}px`;
    menu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8))}px`;
  }

  function open() {
    render();
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    position();
    (grid.querySelector<HTMLButtonElement>('.library-tile.open') ?? tiles()[0])?.focus();
  }

  function close(returnFocus = true) {
    if (menu.hidden) return;
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus) button.focus();
  }

  button.addEventListener('click', () => (menu.hidden ? open() : close()));

  grid.addEventListener('click', (e) => {
    const tile = (e.target as HTMLElement).closest<HTMLButtonElement>('.library-tile');
    if (!tile) return;
    library.open(tile.dataset.id!);
    close();
  });

  menu.querySelector('.library-head')!.addEventListener('click', (e) => {
    const act = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-lib]')?.dataset.lib;
    if (!act) return;
    if (act === 'new') {
      library.create(blankDoc(store.doc.canvas, library.list().map((x) => docName(x.doc))));
      store.notify(`Created ${docName(store.doc)}`);
    } else if (act === 'duplicate') {
      library.duplicateOpen();
      store.notify(`Created ${docName(store.doc)}`);
    } else if (act === 'delete') {
      const name = docName(store.doc);
      if (!window.confirm(`Delete “${name}”? This can't be undone.`)) return;
      library.deleteOpen();
      store.notify(`Deleted ${name}`);
    }
    close();
  });

  // Keyboard: arrows move between tiles, Esc closes. Stop propagation so canvas shortcuts don't fire.
  menu.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      close();
    } else if (e.key.startsWith('Arrow')) {
      const list = tiles();
      const i = list.indexOf(document.activeElement as HTMLButtonElement);
      if (i < 0) return;
      const top = list[0].offsetTop;
      const cols = Math.max(1, list.filter((t) => t.offsetTop === top).length);
      const delta = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols } as Record<string, number>)[e.key] ?? 0;
      list[Math.min(list.length - 1, Math.max(0, i + delta))].focus();
    } else {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  });

  document.addEventListener('pointerdown', (e) => {
    if (menu.hidden) return;
    const t = e.target as Node;
    if (!menu.contains(t) && !button.contains(t)) close(false);
  });
  window.addEventListener('resize', () => !menu.hidden && position());

  return { close };
}
