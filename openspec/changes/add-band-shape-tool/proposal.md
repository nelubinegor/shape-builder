# Proposal

## Why

Twostu draws icons and playing-card suits by blocking out a shape with circles and stretching a "rubber band" around them, the way Paul Nicholson (Number 3) built the Aphex Twin logo. Doing this by hand in Figma is slow and imprecise. A small dedicated tool would make the construction live, exact and repeatable, and would export clean SVG.

## What Changes

- New single-page web app (no backend) in this repo that builds one band shape from an ordered, clockwise loop of convex/concave circles.
- Exact band geometry: tangent lines between consecutive circles, arcs around each circle, a flattened SVG path, and an equivalent straight-edge polygon with a corner radius per vertex.
- Validation of impossible tangent pairs and of circles nested inside a neighbour.
- Editor: SVG canvas (100×100 units by default) with zoom, pan, grid and snapping; add, move, resize, nudge, toggle mode, delete, duplicate and reorder circles; side panel with numeric inputs; construction overlay; corner-vertex preview; mirror symmetry on the vertical axis; spade, heart, club and diamond presets; undo/redo.
- Document save/load as JSON in localStorage and as a downloadable/uploadable file.
- Export in two formats, each with Copy to clipboard and Download .svg: flattened SVG, and rounded-corner SVG (straight segments plus a `data-corner-radii` attribute). Also "Copy for Figma" as VectorNetwork JSON. Options: fill colour, construction overlay (off by default), output scale.
- Calm twostu-style UI: white canvas, black shape, `#0D2DD7` for construction and selection, uniform corner radii.

Not in this change: several shapes per document (v1 holds one), the companion Figma plugin (follow-up change), boolean operations, strokes and animation.

## Capabilities

### New Capabilities
- `band-geometry`: computes the band outline from signed-radius circles (tangents, arcs, flattened path, corner-radius form) and reports invalid pairs and nested circles.
- `shape-editor`: interactive canvas and side panel for building one band shape, including symmetry, presets, overlay, previews and undo/redo.
- `shape-document`: the JSON document format and saving/loading it via localStorage and files.
- `svg-export`: flattened SVG, rounded-corner SVG and Figma VectorNetwork JSON output, with copy, download and export options.

### Modified Capabilities
<!-- None: the project has no existing specs. -->

## Impact

- New code: a Vite + TypeScript app at the repo root (`package.json`, `index.html`, `src/`), a DOM-free geometry module (`src/band.ts`) with unit tests.
- New dev dependencies: Vite, TypeScript, Vitest. No runtime dependencies, no backend.
- Runs in modern desktop browsers only.
