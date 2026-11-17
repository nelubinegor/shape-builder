# Design

## Context

Today `main.ts` autosaves one `Doc` under `localStorage['shape-builder.document']` via `saveStored`/`loadStored`. The toolbar's preset select and Open both call `store.updateShape`/`store.setDoc`, replacing the open document as an undoable step. `Store` holds one `doc` plus `past`/`future` history. See proposal.md for motivation and the delta specs for behaviour. This change builds on `canvas-tools` (preset fitting, `loadPreset(current, canvas, name)`), which must be archived first.

## Goals / Non-Goals

**Goals:**
- A small, pure library model (`src/library.ts`) with unit tests; the UI only calls it.
- Autosave stays as simple as today: one write per document change, into the open entry.

**Non-Goals:**
- Cross-device sync, folders, search, or library-wide export.
- Undoing library operations (switch, new, delete). Delete asks for confirmation instead.

## Decisions

### Library model and storage
```ts
interface LibraryEntry { id: string; doc: Doc; updatedAt: number }
interface Library { version: 1; openId: string; entries: LibraryEntry[] }   // never empty
```
- Stored as JSON under `localStorage['shape-builder.library']`.
- Pure functions: `addEntry(lib, doc) → { lib, id }`, `updateEntry(lib, id, doc)`, `removeEntry(lib, id)` (opens the next entry, or the previous one if the last was removed; an empty result gets a fresh blank entry), `duplicateEntry(lib, id)` (deep copy with new circle ids and the name suffixed " copy"), `openEntry(lib, id)`.
- `loadLibrary(storage)`:
  - parses and validates each entry's `doc` with the existing `parseDocument`, and drops invalid entries with a warning;
  - when there's no library but the old `shape-builder.document` key holds a valid document, migrates it as the only entry;
  - otherwise starts with one circle preset.
- The old key is left in place (harmless), so downgrading still finds a shape.
- `saveLibrary(storage, lib)` swallows quota errors but returns `false`, so the UI can warn once ("Storage is full: your latest changes aren't saved").
- Entries keep insertion order (newest last), which is stable and predictable for the grid.

### Store integration
`Store.loadDoc(doc)` replaces the document, clears `past`/`future`, closes any open transaction, clears the selection and refits the view (canvas sizes differ between shapes). It emits `'doc'` like other changes. `main.ts` keeps one `Library` in memory. On every `'doc'` event it calls `updateEntry(lib, lib.openId, store.doc)` and `saveLibrary`, replacing today's `saveStored`. Switching runs `lib = openEntry(lib, id)`, then `store.loadDoc(entry.doc)`. Because autosave runs on every change, the outgoing shape is already saved when the switch happens.

A small `LibraryApi` object (`list()`, `openId`, `open(id)`, `create(doc)`, `duplicateOpen()`, `deleteOpen()`) is created in `main.ts` and passed to the toolbar and menu, so UI modules don't touch storage directly.

### Presets and Open create shapes
- **Preset select:** builds the preset fitted to the open canvas (`loadPreset`, keeping today's fill rule: the preset's default black), sets the name to the preset name, then `library.create(newDocument(shape) with the open canvas size)`.
- **Open .json:** after `parseDocument` succeeds, `library.create(res.doc)`.
- **Symmetry:** a new shape from a preset starts with symmetry off (a fresh shape), unlike today, where loading a preset into a symmetric shape kept symmetry on.

### Thumbnails and menu (`src/ui/libraryMenu.ts`)
- A popover anchored under the "My shapes" toolbar button. Header row: New, Duplicate, Delete. Below it, a grid of 72px tiles.
- Each tile is a `<button>` with an inline `<svg viewBox="0 0 W H">` holding the paper and `bandPath(toSigned(circles))` filled with the shape's fill, plus the name under it (truncated). The open tile has the blue border.
- Thumbnails are rendered when the menu opens, which is cheap: one path per shape.
- **Keyboard:** the button toggles the menu (`aria-expanded`). Arrow keys move between tiles, Enter opens one, and Esc or a click outside closes the menu and returns focus to the button.
- **Delete:** uses `confirm("Delete “name”? This can't be undone.")`. It's simple and accessible, which is enough here.

### Naming
- New shapes are named "shape", "shape 2", "shape 3"… using the first unused number.
- Presets use the preset name, numbered the same way if taken ("heart", "heart 2").
- Duplicates get the " copy" suffix, numbered when taken.

## Risks / Trade-offs

- [localStorage quota (~5 MB) with very many shapes] → Documents are small (about 1–3 KB each); quota failures are reported once and the app keeps working in memory.
- [Two browser tabs can overwrite each other's library] → Last write wins; documented as a limitation. A `storage` event listener could refresh the menu later.
- [Users expect Ctrl+Z to undo a preset load, as before] → The previous shape is one click away in My shapes, and the toast says "Created heart in My shapes".
- [Behaviour change for Open (no longer replaces)] → Called out as BREAKING in the proposal; the old shape remains in the library.
