# Design

## Context

The repo is empty apart from the OpenSpec setup, so this is greenfield. The brief supplies the geometry, including a reference `bandPath` already tested in Figma, and the preset values. See proposal.md for motivation and the specs for the required behaviour.

## Goals / Non-Goals

**Goals:**
- Geometry that is exact, DOM-free and fully unit-tested, so that the editor and the exporters are thin layers over it.
- A small codebase with no runtime dependencies.

**Non-Goals:**
- More than one shape in the editor. The document format already allows several, so adding them later doesn't need a migration.
- The Figma plugin. "Copy for Figma" produces the JSON now; the plugin that consumes it is a follow-up change in `figma-plugin/`.
- Mobile/touch support.

## Decisions

### Stack: Vite + vanilla TypeScript, Vitest
The UI is one canvas plus one panel with a modest amount of state, so a framework adds little. Vanilla TS with a single store and a full re-render of the SVG and panel on each state change stays fast at this size (tens of circles). *Alternative:* React. Rejected to stay framework-light; nothing in the UI needs a component model.

### Module layout
- `src/band.ts`: pure geometry. `tangents`, `arcs`, `bandPath`, `cornerForm`, `validate`, plus sampling helpers for the tests. No DOM.
- `src/presets.ts`: preset data. The diamond is computed by the rule in the brief: tips (50,4), (90,50), (50,96), (10,50) with r 4, and between each pair of tips a concave r 90 circle whose centre sits outward from the side's midpoint, along the side's normal, at `sqrt(94.5² − (side/2)²)` ≈ 89.45. Measuring along the normal (not along the line from the canvas centre) is what keeps each concave circle 0.5 units clear of both tips. This gives centres around (137.50, −31.69), (137.50, 131.69), (−37.50, 131.69) and (−37.50, −31.69). Order: top tip, concave, right tip, concave, and so on.
- `src/document.ts`: types, parsing and validation, localStorage persistence, file I/O.
- `src/store.ts`: state (document, selection, view, toggles), immutable updates, undo/redo stacks of document snapshots (capped at 200). A drag opens a "transaction" that commits one snapshot on pointer-up.
- `src/symmetry.ts`: twin pairing and mirrored edits.
- `src/export.ts`: flattened SVG, rounded-corner SVG, VectorNetwork JSON.
- `src/ui/canvas.ts`, `src/ui/panel.ts`, `src/ui/toolbar.ts`, `src/main.ts`.

### Geometry follows the reference exactly
`bandPath` keeps the reference's ordering and formulas (clamping `sqrt(max(0, 1−k²))`), so the output matches the reference within 1e-9 (the test includes the reference verbatim as an oracle). `validate` runs on the same tangent data, so the editor never computes geometry twice. Coincident centres (L = 0) are reported invalid and skipped instead of producing NaN.

### Corner form and equivalence test
`cornerForm` returns `{x, y, cornerRadius, circleIndex}[]`, using the brief's vertex formula and the split/skip thresholds (2.2 rad, 0.02 rad) as named constants. To test that both forms are the same shape, the test rebuilds fillets from the polygon: for each vertex, the fillet's tangent points on its two edges are at distance `R·tan(θ/2)` from the vertex. It then samples both outlines (the arc form analytically) and checks the distance from each sample to the other polyline/arc set is below 1e-6.

### Symmetry model
Each circle can carry `twinId`. Pairing when symmetry is turned on: circles within 0.5 of x = 50 are axis circles (snapped to x = 50); each remaining circle is paired with the closest unpaired circle at its mirrored position within 0.5. Unmatched circles keep working but are shown as unpaired. An edit to a paired circle writes the mirrored values (x' = width − x, same y, r, mode) into its twin. Adding with symmetry on: a circle is inserted after the selection, and its twin is inserted at the mirrored loop position, which is found by reflecting the loop around the axis circles; because mirroring reverses clockwise order, the twin goes *before* the selection's twin. Deleting removes both.

### Coordinates and interaction
The canvas uses an SVG `viewBox` that zoom and pan change. Pointer events are converted to document units with `getScreenCTM().inverse()`. The rim handle sits at the circle's rightmost point. Snapping applies only to pointer drags. Values are kept as floats; display rounds to 2 decimals.

### Export
Both SVG formats share one builder that accepts `{fill, overlay, scale}`. Numbers are formatted with up to 4 decimals and trailing zeros removed. The rounded-corner SVG writes `data-corner-radii` on the `<path>`. Clipboard uses `navigator.clipboard.writeText`; download uses a Blob URL.

### Styling
CSS custom properties: `--blue: #0D2DD7`, `--radius: 6px` applied to every rounded control, `font-family: "Aquawax Fx", "Inter", system-ui, sans-serif`. Aquawax Fx is not bundled (licensed font); it is used when installed locally.

## Risks / Trade-offs

- [Full re-render on every pointer move could stutter] → Re-render only the canvas SVG during drags, and update the panel on commit. Profile with the club preset.
- [Symmetry pairing in hand-built shapes can be ambiguous] → Pair only within tolerance, show unpaired circles, and never auto-move circles except axis snapping.
- [Corner form can drift for concave arcs near 180°] → Splitting at 2.2 rad keeps `cos(sw/2)` ≥ cos(1.1) ≈ 0.45. Covered by the equivalence test on every preset.
- [Rounded-corner SVG looks sharp in other apps] → Expected and documented in the export panel; Copy for Figma and the future plugin are the lossless route.
- [Reference `bandPath` start point: the M is at the last tangent's end, i.e. the first circle's incoming point] → Kept as-is; tests pin it.
