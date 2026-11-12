# shape-builder

A small web tool for building icon shapes from circles and a "rubber band": block out a shape with convex and concave circles, stretch a band around them, and export the outline as SVG.

Spec-driven development with [OpenSpec](https://github.com/Fission-AI/OpenSpec). See `openspec/` for proposals and specs.

## Develop

```bash
npm install
npm run dev      # start the dev server
npm test         # unit tests (Vitest)
npm run build    # type-check and build to dist/
npm run smoke    # drive the built app in Chromium (needs Playwright)
```

## Using it

- Click a circle to select it, click empty canvas to deselect. Double-click empty canvas (or press "Add circle") to add one: it joins the nearest part of the band, convex inside the shape and concave outside.
- Drag a circle to move it; drag the selected circle's rim to resize. Hold Alt while dragging to skip grid snapping.
- Space + drag (or middle-mouse drag, or scroll) pans; Ctrl/Cmd + scroll or pinch zooms; `0` or Fit resets the view.
- With a circle selected: arrows move (Alt = 0.1), Shift+arrows resize, `C` toggles convex/concave, Delete removes, Esc deselects. These work anywhere except inside text fields.
- The side panel lists circles in band order (clockwise). Edit values, reorder by dragging or with the arrow buttons, or press Auto-order to sort them clockwise.
- Presets: circle (the default), cross, head and hand, traced from the twostu icon library. Symmetry mirrors edits across the vertical centre line.
- Export: flattened SVG (exact arcs), rounded-corner SVG (straight edges plus `data-corner-radii`), or Copy for Figma (VectorNetwork JSON).
- Work is autosaved in the browser; Save/Open move documents as `.json` files.
