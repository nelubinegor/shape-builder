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

- Click empty canvas to add a circle; drag empty space to pan; scroll to zoom (`0` resets).
- Drag a centre to move, drag the rim handle to resize.
- With a circle selected: arrows move (Alt = 0.1), Shift+arrows resize, `C` toggles convex/concave, Delete removes, Tab selects the next circle.
- The side panel lists circles in band order (clockwise). Edit values, reorder by dragging or with the arrow buttons.
- Symmetry mirrors edits across the vertical centre line.
- Export: flattened SVG (exact arcs), rounded-corner SVG (straight edges plus `data-corner-radii`), or Copy for Figma (VectorNetwork JSON).
- Work is autosaved in the browser; Save/Open move documents as `.json` files.
