# Tasks

## 1. Prerequisite

- [ ] 1.1 Archive `add-band-shape-tool` (`openspec archive add-band-shape-tool`) and verify `openspec list --specs` shows `band-geometry`, `shape-editor`, `shape-document` and `svg-export`

## 2. Geometry and presets

- [ ] 2.1 Support single-circle loops in `cornerForm` and `bandPrimitives` (`src/band.ts`). Verify with unit tests: 3 vertices at distance 2R with radius R, and the flattened and corner forms agree within 1e-6
- [ ] 2.2 Move the suit presets to `test/fixtures.ts` and point the existing geometry, document and export tests at them. Verify that `npm test` passes unchanged
- [ ] 2.3 Replace `src/presets.ts` with circle, cross, head and hand (values from design.md, with a comment naming each Figma node), and make circle the default for a fresh document. Verify with unit tests: every preset is valid (no invalid pairs or nesting), corner and flattened forms agree, hand has 16 circles, circle is one convex circle at (50, 50), and a fresh document starts with circle
- [ ] 2.4 Compare each Figma-based preset with its source. Verify by screenshot that cross, head and hand in the editor match the Figma icons (`get_screenshot` on nodes 2618:372, 2618:362, 2618:369)

## 3. Interaction helpers (`src/interact.ts`)

- [ ] 3.1 Implement `pick()` with the spec order and tolerances. Verify with unit tests: interior of club concave (78, 27) picks it; selected rim gives resize; centre beats rim; diamond outside-paper click picks nothing at a 150 px limit
- [ ] 3.2 Implement `nearestSegment()` and `insideBand()`. Verify with unit tests: heart (85, 70) inserts after index 0; (50, 50) is inside and (85, 75) outside the heart; fewer than two circles appends
- [ ] 3.3 Implement `autoOrder()` and extend `ops.addCircle` with `afterIndex` and mode (symmetry-aware). Verify with unit tests: the scrambled heart is restored with the first circle kept first, and a symmetric add mirrors position and mode

## 4. Canvas interaction (`src/ui/canvas.ts`, `src/main.ts`)

- [ ] 4.1 Replace SVG hit targets with `pick()`-driven pointer handling: click empty deselects, drag moves/resizes (any rim point), Alt skips snapping, hover outline and cursor. Verify in the browser with the club preset that concave circles grab from anywhere inside
- [ ] 4.2 Add double-click to add (nearest segment and mode from position). Verify in the browser: inside the fill adds convex, outside adds concave, one undo removes it
- [ ] 4.3 Pan with Space + drag (grab cursor), middle-mouse and plain scroll; zoom with Ctrl/Cmd + scroll and pinch. Verify in the browser that dragging empty canvas without Space does nothing
- [ ] 4.4 Move editing shortcuts to a global handler that skips text fields; keep Tab cycling on the canvas. Verify in the browser that arrows work after clicking a panel row, and that Backspace in an input doesn't delete a circle
- [ ] 4.5 Default view with an 8% margin, zoom widget (−, %, +, Fit) and context hint line. Verify in the browser that Fit and 0 restore the margin view and the hint changes on selection

## 5. Panel, toolbar and export (`src/ui/*`, `src/style.css`)

- [ ] 5.1 Compact one-line rows with actions on the selected row; name and fill in the panel header; Add circle and Auto-order buttons; scroll the selected row into view. Verify in the browser: the club's circle list fits without scrolling at 800 px height, and the keyboard can reach every row action
- [ ] 5.2 Export section with a Flattened/Rounded switch, Copy SVG, Download .svg, Copy for Figma and options. Verify in the browser that both formats copy and download
- [ ] 5.3 Calmer toggle style (blue text, border, light background) and a refreshed preset menu (circle, cross, head, hand). Verify by eye in a screenshot that no element mixes sharp and rounded corners
- [ ] 5.4 Update README usage notes for double-click, Space pan, scroll/zoom and Auto-order. Verify that the documented gestures match the app

## 6. Integration check

- [ ] 6.1 Update `scripts/smoke.mjs` for the new gestures (double-click add, Space pan, Ctrl+scroll zoom, concave picking, Auto-order, new presets). Verify that `npm run build && npm run smoke` passes
- [ ] 6.2 Run `npm test`, `npm run build` and `openspec validate editor-ux --strict`. Verify that all pass

## Workflow follow-up

- Archive `editor-ux` after review; Vercel redeploys production on push to `main`.
