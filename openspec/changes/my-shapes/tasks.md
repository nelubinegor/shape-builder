# Tasks

## 1. Prerequisite

- [x] 1.1 Archive `canvas-tools` (sync its specs), and verify that `openspec validate my-shapes --strict` still passes against the updated main specs

## 2. Library model (`src/library.ts`)

- [ ] 2.1 Implement the `Library` types and pure operations (`addEntry`, `updateEntry`, `removeEntry`, `duplicateEntry`, `openEntry`, unique naming). Verify with unit tests: add opens the new entry, removing the open entry opens its neighbour, removing the last entry leaves one blank shape, duplicate copies circles with new ids and a "copy" name, and names number up ("heart 2")
- [ ] 2.2 Implement `loadLibrary`/`saveLibrary` with validation, migration from `shape-builder.document`, a circle-only default and quota handling. Verify with unit tests using a stubbed storage: round trip, migration of an old autosave, invalid entries dropped, and a failed write returns false

## 3. App wiring

- [ ] 3.1 Add `Store.loadDoc(doc)` (fresh history, no selection, refit view). Verify with a unit test that undo is empty after `loadDoc` and the old document can't be restored
- [ ] 3.2 In `main.ts`, keep the library in memory, autosave the open entry on every document change (warn once on quota failure), and expose a `LibraryApi`. Verify in the browser that edits survive switching and reloading
- [ ] 3.3 Make the preset select and Open .json create new shapes through the library (preset fitted to the open canvas size, unique names). Verify in the browser that the previous shape stays unchanged in the library

## 4. Shapes menu (`src/ui/libraryMenu.ts`, toolbar, styles)

- [ ] 4.1 Add the "My shapes" toolbar button and popover with a thumbnail grid (outline at canvas aspect, name, open shape highlighted), plus New, Duplicate and Delete (with confirm). Verify in the browser: switching from a thumbnail, New keeps the canvas size, Duplicate opens "… copy", and deleting the last shape leaves a blank one
- [ ] 4.2 Keyboard and dismissal: `aria-expanded`, arrow navigation between tiles, Enter to open, Esc or a click outside to close with focus returned. Verify in the browser using the keyboard only
- [ ] 4.3 Update README usage notes (My shapes, presets and Open create new shapes, browser-only storage). Verify that the documented behaviour matches the app

## 5. Integration check

- [ ] 5.1 Update `scripts/smoke.mjs`: preset and Open create shapes (and existing checks that relied on replacement), switch keeps edits, thumbnails update, undo doesn't cross shapes, delete last, reload restores the library and open shape, migration from an old autosave. Verify that `npm run build && npm run smoke` passes
- [ ] 5.2 Run `npm test`, `npm run build` and `openspec validate my-shapes --strict`. Verify that all pass

## Workflow follow-up

- Archive `my-shapes` after review; Vercel redeploys production on push to `main`.
