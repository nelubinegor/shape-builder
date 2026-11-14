# Design

## Context

The document format already stores `canvas: { width, height }`, and export, the view (`fitView`) and symmetry (`width / 2`) already read it. Only the UI fixes it at 100×100. Grid state is a single `ui.grid` flag drawn in `src/ui/canvas.ts`; snapping uses `ui.gridStep` independently. Presets are 100×100 triples loaded by `ops.loadPreset(current, width, name)`. See proposal.md for motivation and the delta specs for behaviour.

## Goals / Non-Goals

**Goals:**
- Resizing is a pure document operation with unit tests; the UI only collects numbers.
- The icon grid is data (a list of primitives in 24-unit space), so it's easy to test and to update if the Figma component changes.
- The reference image never touches the document, undo or export.

**Non-Goals:**
- Transforming the reference image (move, scale, rotate), or saving it.
- Snapping to icon-grid keylines.
- Per-shape canvases: the canvas is still one per document.

## Decisions

### Resize as a document operation (`ops.resizeCanvas(doc, w, h)`)
Clamp both sides to [1, 4096]. Then `s = min(w / W, h / H)`, `dx = (w − W·s) / 2`, `dy = (h − H·s) / 2`, and each circle becomes `(x·s + dx, y·s + dy, r·s)`. Returns a new `Doc`, which the panel commits with `store.setDoc`, so it's one undo step. The view is then refit with `fitView`. Because the offset centres the scaled content, a symmetric shape stays symmetric about the new `width / 2`, so twin links remain valid. *Alternative:* keep coordinates and only move the artboard edges. Rejected by the user.

### Preset fitting
`loadPreset(current, canvas, name)` takes the canvas size and applies the same scale-and-centre with `s = min(W, H) / 100`, from a 100×100 source. With the default canvas this is the identity, so existing behaviour and tests are unchanged.

### Canvas size controls
These go in the panel header, under the name/fill row: `Canvas [W] × [H] [lock]`. The lock is on by default and while the canvas is square; editing one side with the lock on sets both. Values commit on Enter or blur (not per keystroke, since each resize rescales the shape), and are clamped and rounded to 2 decimals.

### Icon grid geometry (`src/iconGrid.ts`)
Read from the Figma component `Icon grid` (node `2495:144`, file `orrEBTSjd4MJu0xIAfkrxs`): a 24×24 frame at 20% opacity whose children are 0.1-wide black strokes at 50% opacity.

```
circle  (12,12) r10          circle (12,12) r5
rect    (3,3)  18x18 rx1     rect (4,2) 16x20 rx1     rect (2,4) 20x16 rx1
line    (0,0)-(24,24)        line (24,0)-(0,24)
lines   x = 4, 8, 12, 16, 20 (full height)   y = 4, 8, 12, 16, 20 (full width)
```

`iconGridPrimitives(W, H)` returns these as `{kind: 'circle'|'rect'|'line', …}` scaled by `k = min(W, H) / 24` and offset by `((W − 24k) / 2, (H − 24k) / 2)`. On a non-square canvas, the full-length lines span only the centred 24k square, as in Figma. The canvas renders them as `<g class="icon-grid" pointer-events="none">` after the shape, in black at the component's combined opacity (about 0.2 × 0.5). The stroke width is a constant 1 screen pixel, scaled by units-per-pixel like the other overlays. Picking is geometric (`pick()`) and never sees these elements; export builds from the document only, so the grid can't leak into either.

### Grid state
`ui.grid` becomes `ui.pixelGrid` (default on) plus `ui.iconGrid` (default off). Both are session UI state, not saved, like the other view toggles. `gridStep` and snapping are unchanged and independent of visibility. The toolbar replaces "Grid" with two toggles: "Pixel grid" and "Icon grid".

### Reference image
- **State:** `ui.reference: { url, naturalWidth, naturalHeight, opacity, visible } | null`. It lives outside the document, so it's not autosaved, exported or recorded in undo. `url` is an object URL from the pasted or dropped `Blob`/`File`; the previous one is revoked on replace or remove.
- **Input:**
  - A `window` `paste` listener takes the first `image/*` item from `clipboardData` and ignores the event when the target is a text field or the clipboard has no image.
  - A canvas `dragover`/`drop` takes the first `image/*` file.
  - A panel "Reference…" button opens a file picker (`accept="image/*"`).
  - The natural size is read by loading the URL into an `Image` before it's stored.
- **Placement:** contain-fit inside the artboard: `s = min(W / iw, H / ih)`, centred. It's rendered as an SVG `<image>` with `preserveAspectRatio="none"` at the computed rect, after the paper and pixel grid and before the shape, with `pointer-events: none`.
- **Onion skin:** while a reference is visible, the shape path gets `opacity: 0.6`. The panel shows a "Reference" section only when one exists: an opacity slider (0–100%, default 50%), Hide/Show and Remove.

### Document bounds
`parseDocument` rejects canvas sides outside [1, 4096] with "The canvas size must be between 1 and 4096 units." This is a tightening of the existing `> 0` check, and older saved documents are all 100×100.

## Risks / Trade-offs

- [Rescaling on every keystroke would compound rounding errors] → Commit on Enter or blur only; one undo step per committed change.
- [Very large pasted images use memory] → Object URLs (no base64 copies), revoked on replace/remove; nothing is persisted.
- [A non-square canvas centres the icon grid in a square, which can look surprising] → It matches how the 24×24 Figma grid is defined; the spec states it.
- [Shrinking to 24 makes the default 1-unit snapping coarse relative to circles] → Alt-drag already skips snapping; changing the grid step is a possible follow-up.
