# Tasks

## 1. Document and operations

- [x] 1.1 Tighten `parseDocument` canvas bounds to 1–4096 with a clear error. Verify with unit tests: a 24×32 document round trips, and a width of 10000 is rejected
- [x] 1.2 Add `ops.resizeCanvas(doc, w, h)` (clamp, uniform scale by min ratio, centre). Verify with unit tests: circle preset 100→24 gives (12, 12, r 7.2); width 100→200 with the lock off keeps radii and centres horizontally; clamping 0/5000; symmetric twins stay mirrored about the new axis
- [x] 1.3 Change `loadPreset` to take the canvas size and fit presets with min(W, H) / 100. Verify with unit tests: identity on 100×100 (existing tests pass) and circle on 24×24 → (12, 12, r 7.2)

## 2. Icon grid

- [x] 2.1 Add `src/iconGrid.ts` with the Figma keyline primitives and `iconGridPrimitives(W, H)`. Verify with unit tests: on 24×24 the outer circle is (12, 12, r 10) and the verticals sit at 4…20; on 100×100 the outer radius is 41.67 and the square spans 12.5–87.5; on 200×100 the grid is centred (offset x 50)

## 3. Canvas and toolbar

- [x] 3.1 Replace `ui.grid` with `ui.pixelGrid` and `ui.iconGrid`; add "Pixel grid" and "Icon grid" toolbar toggles; render the icon grid above the shape with pointer-events off. Verify in the browser that either, both or neither grid shows, and that a click through a keyline still selects the circle under it
- [x] 3.2 Reference image state and rendering: object-URL lifecycle, contain-fit `<image>` under the shape, shape at 60% opacity while visible. Verify in the browser with a pasted test image that it is fitted and centred and that the shape turns see-through
- [x] 3.3 Reference input: global paste (ignored in text fields and for non-images), canvas drop, and a panel file picker. Verify in the browser that paste, drop and picker each set the reference, and that pasting text does nothing

## 4. Panel

- [x] 4.1 Canvas size row (W × H with lock, commit on Enter/blur, clamped) in the panel header, applying `resizeCanvas` as one undoable step and refitting the view. Verify in the browser that 100→24 rescales the shape, Ctrl+Z restores it, and the lock keeps the sides equal
- [x] 4.2 Reference section (shown only with a reference): opacity slider (default 50%), Hide/Show, Remove. Verify in the browser that the slider changes the image opacity, Hide restores full shape opacity, and Remove clears the section
- [x] 4.3 Update README usage notes (canvas size, reference image, two grids). Verify that the documented gestures match the app

## 5. Integration check

- [x] 5.1 Extend `scripts/smoke.mjs`: resize 100→24 and undo, preset on a 24 canvas, both grid toggles and click-through, paste and drop of a generated PNG, reference not in the export or saved file and gone after reload. Verify that `npm run build && npm run smoke` passes
- [x] 5.2 Run `npm test`, `npm run build` and `openspec validate canvas-tools --strict`. Verify that all pass

## Workflow follow-up

- Archive `canvas-tools` after review; Vercel redeploys production on push to `main`.
