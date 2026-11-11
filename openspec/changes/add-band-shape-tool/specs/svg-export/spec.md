# Spec Delta

## Purpose

Turns the current band shape into SVG and Figma-ready data, in a pixel-exact flattened form and a lossless rounded-corner form, for copying or downloading.

## ADDED Requirements

### Requirement: Flattened SVG export
The system SHALL export a standalone SVG document whose `viewBox` covers the canvas (scaled by the output scale) and which contains the shape as one `<path>` with the flattened band path and the chosen fill.

#### Scenario: Flattened heart
- **WHEN** the heart preset is exported as flattened SVG at scale 1
- **THEN** the output is valid SVG with `viewBox="0 0 100 100"` and a single shape `<path>` whose `d` uses `M`, `A`, `L` and `Z` commands

### Requirement: Rounded-corner SVG export
The system SHALL export a standalone SVG whose shape is one `<path>` made of straight segments only (`M`, `L`, `Z`) through the corner vertices, with a `data-corner-radii="r1,r2,…"` attribute listing each vertex's radius in path order (scaled by the output scale).

#### Scenario: Radii stored with polygon
- **WHEN** a shape whose corner form has 6 vertices is exported as rounded-corner SVG
- **THEN** the path has 6 vertices and `data-corner-radii` lists 6 numbers in the same order

### Requirement: Copy for Figma
The system SHALL copy JSON in Figma's VectorNetwork shape: `vertices` as `[{ x, y, cornerRadius }]`, `segments` as `[{ start, end }]` connecting consecutive vertices in a closed loop, and `regions` as `[{ windingRule: "NONZERO", loops: [[0, 1, …]] }]`.

#### Scenario: Vector network structure
- **WHEN** the user clicks "Copy for Figma" for a shape with N corner vertices
- **THEN** the clipboard holds JSON with N vertices, N segments (the last joining vertex N-1 to 0) and one region whose single loop lists segments 0 to N-1

### Requirement: Copy and download actions
Each SVG format SHALL offer "Copy to clipboard" (SVG text) and "Download .svg". The download filename MUST be based on the shape name and format. Successful copies MUST show a brief confirmation.

#### Scenario: Copy flattened SVG
- **WHEN** the user clicks Copy to clipboard for the flattened format
- **THEN** the clipboard holds the SVG text and a confirmation is shown

### Requirement: Export options
Exports SHALL honour three options: fill colour (default black), include construction overlay (default off), and output scale (default 1, multiplying all coordinates and radii). With the overlay included, the circles and tangent points are added in a separate group after the shape.

#### Scenario: Scaled export
- **WHEN** the output scale is 4
- **THEN** the `viewBox` is `0 0 400 400` and every coordinate and radius is four times its canvas value

#### Scenario: Overlay excluded by default
- **WHEN** the user exports without changing options
- **THEN** the SVG contains only the shape path

### Requirement: Invalid shapes still export with a warning
When the shape has invalid pairs or nested circles, exports SHALL still be produced and the UI MUST warn that the outline may be malformed.

#### Scenario: Export with invalid pair
- **WHEN** the shape has an invalid tangent pair and the user exports
- **THEN** the SVG is produced and a warning is shown
