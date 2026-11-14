# Proposal

## Why

The artboard is fixed at 100×100, while the twostu icons are drawn on 24×24, so shapes can't be built at their real size. There's also no way to trace over a reference picture, and the only guide is a unit grid, not the proportional keyline grid every twostu icon uses in Figma. These three gaps make it slow to match new icons to the existing set.

## What Changes

- **Canvas size:** width and height inputs (square by default, with a lock). Changing the size scales the existing shape uniformly and centres it, so its proportions survive. The size is saved with the document and resizing is undoable. Presets are fitted to the current canvas when loaded.
- **Reference image (onion skin):** paste an image (Ctrl/Cmd+V), drop an image file on the canvas, or pick one with a button. It's fitted inside the artboard, drawn under the shape, with an opacity slider. While a reference is shown, the shape is drawn semi-transparent so both stay visible. It can be hidden or removed. It's session-only: not saved, not exported, not part of undo.
- **Two grids, each toggled independently:**
  - *Pixel grid*: the existing 1-unit grid, which snapping uses.
  - *Icon grid*: the twostu keyline grid from the Figma "Icon grid" component (two circles, a square, portrait and landscape rectangles, both diagonals and 4-unit lines on a 24-unit layout). It's scaled to fit and centred on the canvas, and drawn on top of the shape as a proportion guide.
  - Either, both or neither can be on. **BREAKING (minor):** the "Grid" toggle is renamed "Pixel grid".

Not included: moving, scaling or rotating the reference image; saving the reference; snapping to the icon grid.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `shape-editor`: picking's size limit for grabbing a circle from inside becomes relative to the canvas instead of the screen, so it works at any zoom; adds canvas size controls, the reference image and the icon grid; the Canvas requirement now describes two independent grids; presets are fitted to the canvas size.
- `shape-document`: adds valid canvas size bounds (1–4096 units per side) to the saved document.

## Impact

- Code: `src/document.ts` (size bounds), `src/ops.ts` (resize-and-scale, preset fitting), new `src/iconGrid.ts` (keyline geometry), `src/store.ts` (grid and reference UI state), `src/ui/canvas.ts` (render reference, icon grid, paste/drop), `src/ui/panel.ts` (canvas size inputs, reference controls), `src/ui/toolbar.ts` (two grid toggles), `src/style.css`.
- Tests: unit tests for resizing, preset fitting and icon-grid geometry; smoke checks for size changes, paste/drop and grid toggles.
- No new dependencies. Export output is unchanged apart from following the canvas size, which it already does.
