import './style.css';
import {
  addEntry, duplicateEntry, loadLibrary, openDoc, openEntry, removeEntry, saveLibrary, updateEntry,
  type Library, type LibraryApi,
} from './library';
import { addReference, isImage } from './reference';
import { fitView, Store } from './store';
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

const restored = loadLibrary(storage);
let lib: Library = restored.lib;
const store = new Store(openDoc(lib));
let storageWarned = false;
const persist = () => {
  if (saveLibrary(storage, lib)) return;
  if (!storageWarned) store.notify("Browser storage is full: your latest changes aren't saved. Save a .json copy.", 'error');
  storageWarned = true;
};

persist(); // write immediately so a first visit or a migrated autosave is stored right away

/** Opens the library's open entry in the editor (after the library changed which one is open). */
const showOpen = () => {
  persist();
  store.loadDoc(openDoc(lib));
};
const library: LibraryApi = {
  list: () => lib.entries,
  get openId() {
    return lib.openId;
  },
  open(id) {
    if (id === lib.openId) return;
    lib = openEntry(lib, id);
    showOpen();
  },
  create(doc) {
    lib = addEntry(lib, doc).lib;
    showOpen();
  },
  duplicateOpen() {
    lib = duplicateEntry(lib, lib.openId).lib;
    showOpen();
  },
  deleteOpen() {
    lib = removeEntry(lib, lib.openId);
    showOpen();
  },
};

const toolbar = mountToolbar(document.getElementById('toolbar')!, store, library);
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

let lastCanvas = `${store.doc.canvas.width}x${store.doc.canvas.height}`;
store.subscribe((s, kind) => {
  if (kind === 'doc') {
    lib = updateEntry(lib, lib.openId, s.doc);
    persist();
    const size = `${s.doc.canvas.width}x${s.doc.canvas.height}`;
    if (size !== lastCanvas) {
      // Resize, undo/redo of a resize, or opening a file: show the whole new artboard.
      lastCanvas = size;
      s.setUI({ view: fitView(s.doc.canvas.width, s.doc.canvas.height) });
    }
  }
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

// Paste an image anywhere (outside text fields) to use it as the reference.
window.addEventListener('paste', (e) => {
  if (isTextField(e.target)) return;
  const item = [...(e.clipboardData?.items ?? [])].find((i) => i.kind === 'file' && isImage(i));
  const file = item?.getAsFile();
  if (!file) return;
  e.preventDefault();
  void addReference(store, file);
});

renderAll();
if (restored.warning) store.notify(restored.warning, 'error');

// Expose for debugging and smoke tests.
(window as unknown as { shapeBuilder: Store }).shapeBuilder = store;
