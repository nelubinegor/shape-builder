# Tasks

## 1. Project setup

- [x] 1.1 Scaffold Vite + vanilla TypeScript at the repo root (`package.json`, `index.html`, `tsconfig.json`, `src/main.ts`), add Vitest, and add scripts `dev`, `build`, `test`. Verify that `npm run build` and `npm test` (with no tests yet, `--passWithNoTests`) succeed
- [x] 1.2 Add `.gitignore` (node_modules, dist) and update README with run/test commands. Verify that `git status` shows no build output

## 2. Band geometry (`src/band.ts`)

- [x] 2.1 Implement types (`Circle`, signed radius helper) and `tangents()` per the band-geometry spec, with L = 0 handled. Verify with unit tests: equal circles, a convex→concave pair (k = 0.4, points tangent to both), and an invalid pair (|k| > 1, no throw)
- [x] 2.2 Implement `validate()` returning invalid pairs and nested circles. Verify with unit tests for the invalid-pair and nested scenarios
- [x] 2.3 Implement `arcs()` and `bandPath()`. Verify with unit tests: sweep/large-arc flags for (0,0,20)/(50,0,5), heart lobes ≈ 2.862 rad with large-arc 0, concave sweep-flag 0, and the output matching the brief's reference `bandPath` (included verbatim in the test) within 1e-9 on all presets
- [x] 2.4 Implement `cornerForm()` with split (2.2 rad) and skip (0.02 rad) thresholds. Verify with unit tests: a 4.0 rad sweep splits into 2 vertices, a 0.01 rad sweep is skipped
- [x] 2.5 Add sampling helpers and the equivalence test (flattened outline vs. filleted corner polygon within 1e-6) for every preset. Verify that `npm test` passes

## 3. Presets and document (`src/presets.ts`, `src/document.ts`)

- [x] 3.1 Add heart, spade and club data and the computed diamond. Verify with a unit test that every preset validates with no invalid pairs or nested circles, and that the diamond's concave centres are ≈ (137.50, −31.69) etc.
- [x] 3.2 Implement the document types, `parseDocument()` (version, shape and circle checks) and `serialize()`. Verify with unit tests: round trip, and malformed/unknown-version input rejected with a message
- [x] 3.3 Implement localStorage autosave/restore (heart by default) and JSON file download/upload helpers. Verify with a unit test using a stubbed localStorage

## 4. State, undo/redo and symmetry (`src/store.ts`, `src/symmetry.ts`)

- [x] 4.1 Implement the store with immutable updates, selection, toggles, and undo/redo with drag transactions (cap 200). Verify with unit tests: a single undo reverts a whole transaction, redo reapplies it, and a new edit clears redo
- [x] 4.2 Implement symmetry pairing, mirrored edits, mirrored insert and paired delete. Verify with unit tests: heart pairing, moving the right lobe to x 72 moves the left to 28, adding right of the axis inserts the twin at the mirrored loop position, deleting removes both

## 5. Editor UI (`src/ui/*`, `src/style.css`)

- [ ] 5.1 Build the layout and styling (white canvas, `#0D2DD7` accents, uniform `--radius`, Aquawax Fx → fallback font). Verify by eye in `npm run dev` that no element mixes sharp and rounded corners
- [ ] 5.2 Canvas rendering: filled band, selection, construction overlay toggle (solid/dashed circles, tangent dots), corner preview toggle with radius labels, validation highlights, grid toggle. Verify in the browser with the heart and club presets
- [ ] 5.3 Canvas interactions: click to add, drag centre, drag rim handle (min r 0.5), zoom around the pointer, pan, snapping for drags only. Verify in the browser that each drag undoes in one step
- [ ] 5.4 Keyboard: arrow nudge (Alt = 0.1), Shift+arrow resize, C toggles mode, Delete, Tab cycles selection, Ctrl/Cmd+Z / Shift+Z / Ctrl+Y. Verify each shortcut in the browser
- [ ] 5.5 Side panel: rows in band order with x/y/r inputs, mode toggle, duplicate (+2,+2), delete, drag-to-reorder and keyboard move up/down, validation messages. Verify in the browser that edits update the canvas live
- [ ] 5.6 Toolbar: preset picker (undoable), symmetry toggle, overlay/corner/grid/snap toggles, save/open JSON. Verify that loading a preset and opening a file can each be undone

## 6. Export (`src/export.ts`, export panel)

- [x] 6.1 Implement the flattened SVG and rounded-corner SVG builders with fill, overlay and scale options. Verify with unit tests: viewBox and scaling at scale 4, overlay absent by default, rounded path has only M/L/Z and `data-corner-radii` count equals the vertex count
- [x] 6.2 Implement the VectorNetwork JSON builder. Verify with a unit test: N vertices, N closed-loop segments, one NONZERO region
- [ ] 6.3 Build the export panel: Copy to clipboard and Download .svg per format, Copy for Figma, options, copy confirmation, invalid-shape warning, and a note that rounded corners show sharp in other apps. Verify in the browser by pasting the flattened SVG into a new tab and comparing it with the canvas

## 7. Integration check

- [ ] 7.1 Add a Playwright smoke script (`scripts/smoke.mjs`) that loads the built app, loads each preset, toggles the overlay, and checks that the band path exists and that exported SVG matches the canvas path. Verify that `npm run build && node scripts/smoke.mjs` passes
- [ ] 7.2 Run `npm test`, `npm run build` and `openspec validate add-band-shape-tool --strict`. Verify that all pass

## Workflow follow-up

- Follow-up change: companion Figma plugin in `figma-plugin/` that reads the VectorNetwork JSON and calls `vector.setVectorNetworkAsync()`.
- Archive this change after review.
