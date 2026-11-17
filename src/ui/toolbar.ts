// Top toolbar: presets, toggles, history and document files.
import { downloadText, parseDocument, pickTextFile, presetShape, safeFileName, serialize } from '../document';
import { docName, type LibraryApi } from '../library';
import { mountLibraryMenu } from './libraryMenu';
import { loadPreset, setSymmetry } from '../ops';
import { iconPresetNames, suitPresetNames, type PresetName } from '../presets';
import type { Store, UIState } from '../store';

export interface ToolbarApi {
  render(): void;
}

type Toggle = 'overlay' | 'corners' | 'pixelGrid' | 'iconGrid' | 'snap';

const TOGGLES: { key: Toggle; label: string; title: string }[] = [
  { key: 'overlay', label: 'Construction', title: 'Show circles and tangent points' },
  { key: 'corners', label: 'Corners', title: 'Preview the corner-radius form' },
  { key: 'pixelGrid', label: 'Pixel grid', title: 'Show the unit grid' },
  { key: 'iconGrid', label: 'Icon grid', title: 'Show the twostu icon keyline grid' },
  { key: 'snap', label: 'Snap', title: 'Snap drags to the grid' },
];

export function mountToolbar(host: HTMLElement, store: Store, library: LibraryApi): ToolbarApi {
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
  host.innerHTML = `
    <div class="brand">Shape Builder</div>
    <div class="tool-group">
      <button id="my-shapes" title="Your saved shapes">My shapes ▾</button>
      <label class="sr-only" for="preset">New shape from preset</label>
      <select id="preset">
        <option value="">New from preset…</option>
        <optgroup label="Icons">${iconPresetNames.map((n) => `<option value="${n}">${cap(n)}</option>`).join('')}</optgroup>
        <optgroup label="Card suits">${suitPresetNames.map((n) => `<option value="${n}">${cap(n)}</option>`).join('')}</optgroup>
      </select>
      <button class="toggle" id="symmetry" aria-pressed="false" title="Mirror on the vertical axis">Symmetry</button>
    </div>
    <div class="tool-group">
      ${TOGGLES.map((t) => `<button class="toggle" data-toggle="${t.key}" aria-pressed="false" title="${t.title}">${t.label}</button>`).join('')}
    </div>
    <div class="tool-group">
      <button id="undo" title="Undo (Ctrl+Z)" aria-label="Undo">↶ Undo</button>
      <button id="redo" title="Redo (Ctrl+Shift+Z)" aria-label="Redo">↷ Redo</button>
    </div>
    <div class="tool-group push">
      <button id="open" title="Open a .json document">Open</button>
      <button id="save" title="Download the document as .json">Save</button>
    </div>`;

  const preset = host.querySelector<HTMLSelectElement>('#preset')!;
  mountLibraryMenu(host.querySelector<HTMLButtonElement>('#my-shapes')!, store, library);
  const symmetry = host.querySelector<HTMLButtonElement>('#symmetry')!;
  const undo = host.querySelector<HTMLButtonElement>('#undo')!;
  const redo = host.querySelector<HTMLButtonElement>('#redo')!;

  preset.addEventListener('change', () => {
    const name = preset.value as PresetName;
    if (!name) return;
    // A preset becomes a new shape in My shapes, on the open shape's canvas size.
    const shape = loadPreset(presetShape(name), store.doc.canvas, name);
    library.create({ ...store.doc, canvas: { ...store.doc.canvas }, shapes: [shape] });
    store.notify(`Created ${docName(store.doc)} in My shapes`);
    preset.value = '';
  });

  symmetry.addEventListener('click', () => {
    const on = !store.shape.symmetry;
    store.updateShape((s) => setSymmetry(s, store.width, on));
    if (on) {
      const unpaired = store.shape.circles.filter((c) => !c.twinId && c.x !== store.width / 2).length;
      store.notify(unpaired ? `Symmetry on: ${unpaired} circle(s) have no mirror twin` : 'Symmetry on');
    }
  });

  host.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((b) => {
    b.addEventListener('click', () => {
      const key = b.dataset.toggle as Toggle;
      store.setUI({ [key]: !store.ui[key] } as Partial<UIState>);
    });
  });

  undo.addEventListener('click', () => store.undo());
  redo.addEventListener('click', () => store.redo());

  host.querySelector('#save')!.addEventListener('click', () => {
    downloadText(`${safeFileName(store.shape.name)}.json`, serialize(store.doc), 'application/json');
  });

  host.querySelector('#open')!.addEventListener('click', async () => {
    const text = await pickTextFile();
    if (text === null) return;
    const res = parseDocument(text);
    if (!res.ok) {
      store.notify(`Could not open file. ${res.error}`, 'error');
      return;
    }
    library.create(res.doc);
    store.notify(`Opened ${docName(store.doc)} as a new shape in My shapes`);
  });

  function render() {
    symmetry.setAttribute('aria-pressed', String(store.shape.symmetry));
    host.querySelectorAll<HTMLButtonElement>('[data-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', String(store.ui[b.dataset.toggle as Toggle]));
    });
    undo.disabled = !store.canUndo;
    redo.disabled = !store.canRedo;
  }

  return { render };
}
