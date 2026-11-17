# Proposal

## Why

The editor holds one shape at a time: loading a preset or opening a file replaces it, so starting something new means losing (or manually exporting) what you had. Designers work on several icons in parallel and need to switch between them without losing work.

## What Changes

- **My shapes:** a library of all the user's shapes, kept in the browser (localStorage). The open shape is always one of them and autosaves on every change, so switching never loses work.
- **Shapes menu:** a "My shapes" toolbar button opens a grid of thumbnails (the live outline at its canvas aspect, with the shape's name). The open shape is highlighted. Click a thumbnail to switch.
- **Managing:** New (a blank circle on the current canvas size), Duplicate (a copy of the open shape) and Delete (with confirmation; deleting the last shape leaves a new blank one). Renaming uses the existing name field.
- **Presets create new shapes:** picking a preset adds a new shape to My shapes (fitted to the current canvas size) and opens it. The previous shape stays in the library untouched. **BREAKING:** a preset no longer replaces the open shape.
- **Open .json adds a shape:** opening a file adds it to My shapes and opens it, instead of replacing the current shape. **BREAKING:** Ctrl+Z no longer brings back the previous shape after Open (it's still in the library). Save .json still downloads the open shape.
- **Undo history** belongs to the open shape and starts fresh after switching.
- **Migration:** the single shape autosaved by earlier versions becomes the first entry in My shapes.

Not included: syncing between devices or browsers (no backend), folders or tags, per-shape reference images (the reference stays session-only), exporting the whole library as one file.

## Capabilities

### New Capabilities
- `shape-library`: the user's collection of saved shapes: storage, switching, creating, duplicating, deleting, thumbnails and migration from the single autosaved document.

### Modified Capabilities
- `shape-document`: autosave writes to the open shape's library entry; opening a file adds a new shape instead of replacing the current one.
- `shape-editor`: picking a preset creates a new shape in the library instead of replacing the open one.

## Impact

- Code: new `src/library.ts` (library model, persistence, migration), `src/store.ts` (load a document with fresh history), `src/main.ts` (autosave to the library), `src/ui/toolbar.ts` (My shapes button; presets and Open create shapes), new `src/ui/libraryMenu.ts` (thumbnail grid), `src/style.css`.
- Tests: unit tests for the library model and migration; smoke checks for switching, presets, Open, delete and reload.
- Depends on `canvas-tools`: archive it first, because both change the "Preset shapes" requirement and this change builds on its version.
- Storage: localStorage per browser; large libraries could hit the browser's quota (several MB, i.e. thousands of shapes).
