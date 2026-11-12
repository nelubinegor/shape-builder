import './style.css';
import { loadStored, saveStored } from './document';
import { Store } from './store';
import { mountCanvas } from './ui/canvas';
import { mountExportPanel } from './ui/exportPanel';
import { mountPanel } from './ui/panel';
import { mountToolbar } from './ui/toolbar';

const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
})();

const app = document.getElementById('app')!;
app.innerHTML = `
  <header class="toolbar" id="toolbar"></header>
  <main class="workspace">
    <section class="stage" id="stage" aria-label="Canvas"></section>
    <aside class="side" aria-label="Shape settings">
      <div id="panel"></div>
      <div id="export"></div>
    </aside>
  </main>
  <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>`;

const restored = loadStored(storage);
const store = new Store(restored.doc);

const toolbar = mountToolbar(document.getElementById('toolbar')!, store);
const canvas = mountCanvas(document.getElementById('stage')!, store);
const panel = mountPanel(document.getElementById('panel')!, store);
const exporter = mountExportPanel(document.getElementById('export')!, store);
const toast = document.getElementById('toast')!;

let frame = 0;
let toastTimer = 0;
let lastMessage: Store['ui']['message'] = null;

const renderAll = () => {
  frame = 0;
  canvas.render();
  toolbar.render();
  exporter.render();
  if (!store.inTransaction) panel.render();
  const msg = store.ui.message;
  if (msg && msg !== lastMessage) {
    lastMessage = msg;
    toast.textContent = msg.text;
    toast.className = `toast ${msg.kind}`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, msg.kind === 'error' ? 5000 : 2200);
  }
};
const schedule = () => {
  if (!frame) frame = requestAnimationFrame(renderAll);
};

store.subscribe((s, kind) => {
  if (kind === 'doc') saveStored(storage, s.doc);
  schedule();
});

// Global shortcuts. Text fields keep their own keys; Space is left to focused controls.
const isTextField = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="color"]), textarea, select') || t.isContentEditable);
const isControl = (t: EventTarget | null) =>
  t instanceof HTMLElement && t.matches('button, input, select, textarea, a[href], [contenteditable="true"]');

window.addEventListener('keydown', (e) => {
  if (isTextField(e.target)) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod) {
    const key = e.key.toLowerCase();
    if (key === 'z' && !e.shiftKey) store.undo();
    else if ((key === 'z' && e.shiftKey) || key === 'y') store.redo();
    else return;
    e.preventDefault();
    return;
  }
  if (e.key === ' ' || e.code === 'Space') {
    if (isControl(e.target) && !canvas.pointerInside) return;
    canvas.setSpace(true);
    e.preventDefault();
    return;
  }
  if (canvas.handleKey(e)) e.preventDefault();
});
window.addEventListener('keyup', (e) => {
  if (e.key === ' ' || e.code === 'Space') canvas.setSpace(false);
});
window.addEventListener('blur', () => canvas.setSpace(false));

renderAll();
if (restored.error) store.notify(restored.error, 'error');

// Expose for debugging and smoke tests.
(window as unknown as { shapeBuilder: Store }).shapeBuilder = store;
