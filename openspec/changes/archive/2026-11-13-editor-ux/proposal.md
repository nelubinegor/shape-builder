# Proposal

## Why

The first version of the editor works, but it's awkward to use. A single click anywhere (even off the artboard) adds a circle. Panning is "drag empty space", which clashes with selecting. Concave circles are hard to grab: in the club preset only about 1 in 5 clicks inside a concave circle selects it. Shortcuts only work after clicking the canvas. And the side panel is so tall that Export sits below the fold. This change makes the editor predictable and quick without adding modes or heavy features.

## What Changes

- **BREAKING (interaction):** a single click on empty canvas now only deselects. Circles are added by **double-clicking** empty canvas, or with an **Add circle** button in the panel.
- A new circle is inserted into the **nearest part of the band** (not after the selection). It's **convex** when added inside the filled shape and **concave** when added outside it.
- **Auto-order** button: sorts circles clockwise around the shape's centre in one undoable step.
- Pan with **Space + drag**, middle-mouse drag, or two-finger scroll. Zoom with pinch or Ctrl/Cmd + scroll. **BREAKING:** the plain mouse wheel no longer zooms, and dragging empty canvas no longer pans.
- Distance-based picking: grab a circle near its centre or rim, or anywhere inside it (the smallest circle wins). Dragging near the selected circle's rim resizes from any point on it. A hover outline shows what will be grabbed.
- Holding Alt while dragging skips grid snapping.
- Editing shortcuts (arrows, Shift+arrows, C, Delete, Esc) work whenever focus isn't in a text field, not only when the canvas is focused.
- View: the default view fits the artboard with a margin; −/+/Fit zoom controls sit on the canvas; a one-line hint shows the relevant shortcuts.
- **Presets:** the four card suits are replaced by **circle** (the new default for a fresh document), **cross**, **head** (a profile silhouette) and **hand** (a peace-sign hand), all reproduced from the twostu Design Library icons in Figma. A one-circle shape now works in every form, including the rounded-corner export.
- Panel: one-line circle rows, with row actions shown only on the selected row; selecting on the canvas scrolls its row into view; shape name and fill move into the panel header; a shorter export section with a Flattened/Rounded switch; calmer toggle styling.

Not included: an Add tool with live preview, selecting several circles, right-click menus, re-sorting circles automatically while editing.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `shape-editor`: replaces the preset list; changes how circles are added (double-click, button, nearest-segment insertion, mode from position), how the view is panned and zoomed, how circles are picked and resized, where shortcuts apply, and the panel layout; adds Auto-order, hover feedback, snap bypass, zoom controls and the hint line.
- `shape-document`: a fresh document starts with the circle preset instead of the heart.
- `band-geometry`: defines the output for a loop of a single circle (full circle; three-vertex corner form).

## Impact

- Code: `src/ui/canvas.ts` (picking, pointer/keyboard handling, hover, zoom controls, hint), `src/ui/panel.ts`, `src/ui/exportPanel.ts`, `src/ui/toolbar.ts`, `src/style.css`, `src/main.ts` (global shortcuts); new pure helpers for picking, nearest-segment insertion, inside/outside test and auto-order, with unit tests.
- `scripts/smoke.mjs` needs updating: click-to-add becomes double-click, drag-to-pan becomes Space + drag.
- Geometry and export only change for single-circle shapes; the document format is unchanged. The suit presets stay as test fixtures.
- Depends on `add-band-shape-tool`: archive it first, so that the `shape-editor` spec this change modifies exists.
