# Design

## Context

The editor from `add-band-shape-tool` renders the canvas as an SVG string and hit-tests through invisible SVG shapes (`.hit`, `.centre`, `.rim-handle`) layered in DOM order. That layering is why concave circles are hard to grab: a concave circle only has a thin ring, and the large convex disks drawn next to it cover most of its interior. Keyboard handling is attached to the canvas element, so it only works while the canvas is focused. See proposal.md for motivation and the delta specs for required behaviour.

`add-band-shape-tool` must be archived before this change, so that the `shape-editor` and `shape-document` specs it modifies exist.

## Goals / Non-Goals

**Goals:**
- Move every interaction decision (what to pick, where to insert, which mode, how to order) into small pure functions with unit tests, so the canvas code only wires events to them.
- Keep the single Select interaction; no tool modes.

**Non-Goals:**
- Live preview of an added circle, selecting several circles, right-click menus.
- Re-sorting circles automatically while editing (Auto-order is explicit and one-off).

## Decisions

### Pure helpers in `src/interact.ts`
- `pick(p, circles, selectedId, tol, maxContainR)` returns `{ id, action: 'move' | 'resize' } | null`, following the spec order: selected rim → nearest centre → nearest rim → smallest containing circle with radius ≤ `maxContainR`. The canvas passes `tol = 8 px` and `maxContainR = 150 px`, both converted to units at the current zoom.
- `nearestSegment(p, circles)` returns the index `i` to insert after. It reuses `bandPrimitives` from `band.ts`: if the nearest primitive is line `i` (circle i → i+1), it returns `i`. If it's the arc on circle `i`, it compares the point's angle with the arc's mid-angle and returns `i` (second half, towards i+1) or `i − 1` (first half). Fewer than two circles → append.
- `insideBand(p, circles)` samples `bandPrimitives` into a polygon (32 points per primitive) and runs a non-zero winding test. No DOM, so it's testable. *Alternative:* `SVGGeometryElement.isPointInFill` on the rendered path. Rejected: it needs the DOM, so it can't be unit-tested.
- `autoOrder(circles)` sorts by `atan2(y − cy, x − cx)` around the mean of the centres (y-down, so increasing angle is clockwise on screen), then rotates the result so the current first circle stays first. Ties keep their current order (stable sort).

### Adding circles
`ops.addCircle` gains an `afterIndex` parameter and an explicit mode. Double-click: `afterIndex = nearestSegment(p)`, `mode = insideBand(p) ? convex : concave`. Add button: with a selection, the point is the midpoint between the selected circle and the next one and `afterIndex` is the selected index; without one, the point is the view centre and the double-click rules apply. With symmetry on, the existing `insertMirrored(afterId, …)` is called with the circle at `afterIndex` as anchor, so twins keep working unchanged. The mode is mirrored to the twin.

Single click vs double-click: `pointerdown` on empty canvas clears the selection at once. The browser's `dblclick` event then adds the circle if `pick` still returns null at that point. Because the first click already deselected, the double-click never depends on the previous selection.

### Pointer model
```
pointerdown
  |-- Space held or middle button --> pan drag
  |-- pick() = resize             --> resize drag (radius = distance to centre)
  |-- pick() = move               --> select + move drag (keeps grab offset)
  '-- null                        --> clear selection
pointermove (no drag)             --> hover = pick(); outline + cursor
wheel: ctrlKey/metaKey            --> zoom around pointer (pinch arrives as ctrl+wheel)
       otherwise                  --> pan by deltaX/deltaY
```
The SVG hit elements are removed; handles stay only as visuals (the centre dot and a rim dot on the selected circle). Alt held at any point during a drag skips `snap()`.

### Keyboard
A single `window` keydown handler replaces the canvas handler. It ignores events whose target is a text or number input, a select, a textarea or contenteditable. Space sets a `spaceDown` flag (with `preventDefault` so the page doesn't scroll) and the canvas class switches the cursor to `grab`. Tab cycling stays on the canvas element only, so normal Tab navigation through the page isn't hijacked.

### Single circle
`cornerForm` handles `n = 1` by treating it as one arc of sweep 2π, which the existing split logic turns into `ceil(2π / 2.2) = 3` vertices at distance `R / cos(π/3) = 2R`. `bandPrimitives` gets the same special case (two half arcs) so the equivalence test covers it. `bandPath` already draws a full circle for `n = 1`.

### Presets
`src/presets.ts` exports `circle`, `cross`, `head` and `hand`. The suits move to `test/fixtures.ts`, because the geometry tests rely on them (including the comparison with the reference implementation).

Cross, head and hand come from the twostu Design Library in Figma (file `orrEBTSjd4MJu0xIAfkrxs`, page "icons"; nodes `2618:372` cross, `2618:362` head, `2618:369` hand). Each 24×24 icon frame maps to the 100×100 artboard (×100/24), keeping the icon's own margins. Values were derived during planning and checked: no invalid pairs or nesting, and corner form and flattened form agree to 1e-14.
- **Method:** the outlines come from each vector's `fillGeometry`, which is the rendered outline with Figma's per-point corner radii applied. (The raw `vectorPaths` leave the corners sharp.) Every rendered outline is made only of circular arcs and tangent lines, so each arc's circle was recovered by fitting it through the arc's start, mid and end points. The traces match the sources exactly.
- **Hand:** 16 circles. The only manual edit: two near-duplicate tiny circles at the knuckle notch were merged into one (r 0.7), because they made an impossible pair.
- **Cross:** 12 circles: r 1 outer corners and r 2 inner fillets in icon units, i.e. 4.17 and 8.33 on the artboard.
- **Head:** 13 circles: a large circle for the skull, the nose, lips and chin, and large curves at the nape and neck.
- **Circle:** `[[50, 50, 30]]`.

```js
circle: [[50,50,30]]
cross:  [[66.67,33.33,-8.33],[83.33,45.83,4.17],[83.33,54.17,4.17],[66.67,66.67,-8.33],[54.17,83.33,4.17],[45.83,83.33,4.17],[33.33,66.67,-8.33],[16.67,54.17,4.17],[16.67,45.83,4.17],[33.33,33.33,-8.33],[45.83,16.67,4.17],[54.17,16.67,4.17]]
head:   [[62.45,33.1,12.5],[78.91,37.66,-4.17],[77.99,48.26,3.78],[80.61,54.23,-2.64],[76.26,57.23,2.64],[77.04,60.38,-0.5],[75.56,62.42,2.02],[77.46,66.67,-2.57],[71.24,70.25,4.17],[60.35,82.76,-8.33],[34.78,78.95,15.56],[6.02,63.19,-16.67],[45.35,37.85,29.38]]
hand:   [[44.22,11.7,4.5],[48.78,42.65,-1.8],[68.9,16.46,4.47],[61.37,48.75,-1.78],[62.48,54.96,4.51],[66.45,58.75,-0.7],[64.73,62.66,3.37],[65.23,72.09,-3.6],[40.47,80.32,13.49],[28.42,79.58,1.8],[32,71.8,-6.74],[46.26,71.24,4.5],[55.76,61.97,-3.39],[42.33,63.12,-4.49],[30.96,62.47,1.8],[27.04,49.75,-7.2]]
```

### Panel and view
- Compact rows: `[n] [mode] x [ ] y [ ] r [ ]`. The selected row expands a second line with ↑ ↓ duplicate delete. Focusing any control in a row selects that circle, so keyboard users get the actions too.
- The panel header holds the name input and fill swatch; "Add circle" and "Auto-order" sit above the list.
- Export: a two-option segmented control (Flattened / Rounded), then Copy SVG and Download .svg, then Copy for Figma, then the scale and overlay options. This still meets the svg-export spec: each format can be copied and downloaded.
- Toggles that are on use blue text, a blue border and a light-blue background instead of a solid fill.
- Default view: `{ x: −8, y: −8, w: 116, h: 116 }` for a 100×100 canvas (8% margin), used on load, by Fit and by the 0 key. The zoom widget is in the canvas's bottom-right corner and shows `round(100 · canvasW / view.w)%`.
- Hint line in the canvas's bottom-left. Nothing selected: "Double-click to add · Space-drag to pan · Ctrl+scroll to zoom". Circle selected: "Arrows move · Shift+arrows resize · C convex/concave · Delete removes".
- Selecting on the canvas calls `row.scrollIntoView({ block: 'nearest' })`.

## Risks / Trade-offs

- [Plain scroll no longer zooms, which mouse-wheel users may expect] → Ctrl+scroll, the zoom widget and +/- keys all zoom; the hint line says so.
- [Nearest-segment insertion can pick the "wrong" side near a sharp corner] → It's undoable, rows can be reordered, and Auto-order exists.
- [Auto-order fails for hook-shaped outlines] → One explicit, undoable action; never applied automatically.
- [Inside/outside polygon sampling is approximate near the outline] → Only used to choose a default mode; errors near the edge are harmless and C toggles the mode.
- [Space conflicts with pressing focused buttons] → Space-to-pan is ignored when focus is on a button, input or select, so keyboard activation still works.
