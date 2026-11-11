# Spec Delta

## Purpose

Lets a designer build one band shape interactively: place, size and order circles on a canvas, see the band update live with construction aids and validation, and use symmetry, presets and undo/redo.

## ADDED Requirements

### Requirement: Canvas
The editor SHALL show a square SVG canvas, 100×100 units by default, with a white background, the filled shape in black, and selection and construction drawn in `#0D2DD7`. The canvas MUST support zoom (wheel or keyboard) and pan, and an optional grid that can be toggled.

#### Scenario: Zoom and pan
- **WHEN** the user scrolls the wheel over the canvas, then drags empty space with the pan gesture
- **THEN** the view zooms around the pointer and then pans, without changing any circle values

### Requirement: Grid snapping
When snapping is on, the editor SHALL snap circle centres and radii set by dragging to the grid step (default 1 unit). Numeric inputs MUST NOT be snapped.

#### Scenario: Drag with snapping
- **WHEN** snapping is on with step 1 and the user drags a centre to (40.37, 22.8)
- **THEN** the circle's centre becomes (40, 23)

### Requirement: Add circle
Clicking on empty canvas SHALL add a convex circle (default radius 5) at that point. It MUST be inserted into the band loop after the currently selected circle (or at the end if none is selected) and become selected.

#### Scenario: Add after selection
- **WHEN** circle 2 of 4 is selected and the user clicks empty canvas
- **THEN** a new circle is inserted at position 3 and selected

### Requirement: Move and resize by dragging
The editor SHALL move a circle when its centre is dragged and resize it when a handle on its rim is dragged. The radius MUST stay at least 0.5 units.

#### Scenario: Resize via rim handle
- **WHEN** the user drags the rim handle of a circle centred at (50, 50) to (50, 62)
- **THEN** its radius becomes 12

### Requirement: Keyboard editing
With a circle selected, the arrow keys SHALL nudge its centre by 1 unit (0.1 with Alt held). Arrow keys with Shift held SHALL resize instead (Up/Right grow, Down/Left shrink). Delete or Backspace SHALL delete it, and Tab/Shift+Tab SHALL move the selection along the band order.

#### Scenario: Nudge
- **WHEN** a circle at (30, 30) is selected and the user presses Right
- **THEN** it moves to (31, 30)

#### Scenario: Resize with modifier
- **WHEN** a circle with radius 5 is selected and the user presses Shift+Up
- **THEN** its radius becomes 6

### Requirement: Circle mode toggle
The user SHALL be able to switch a circle between convex and concave from the canvas (a shortcut key, C) and from the side panel.

#### Scenario: Toggle to concave
- **WHEN** a convex circle is selected and the user presses C
- **THEN** it becomes concave and the band bends inward around it

### Requirement: Side panel
The editor SHALL show a side panel listing circles in band order. Each row MUST provide numeric inputs for x, y and r, a mode toggle, duplicate and delete buttons, and support reordering by dragging the row and by keyboard (move up/down controls).

#### Scenario: Edit numerically
- **WHEN** the user types 42 into a circle's r input
- **THEN** the circle's radius becomes 42 and the band recalculates

#### Scenario: Reorder
- **WHEN** the user drags row 1 below row 3
- **THEN** the band order changes accordingly and the outline recalculates

#### Scenario: Duplicate
- **WHEN** the user duplicates a circle
- **THEN** a copy offset by (2, 2) is inserted right after it and selected

### Requirement: Live band and construction overlay
The filled band SHALL recalculate on every change. A toggle SHALL show the construction overlay: convex circles with solid outlines, concave circles with dashed outlines, and tangent points as dots.

#### Scenario: Overlay toggled on
- **WHEN** the construction overlay is turned on
- **THEN** every circle is outlined (solid for convex, dashed for concave) and every tangent point is drawn as a dot

### Requirement: Corner preview
A toggle SHALL show the corner-radius form: the straight-edge polygon and its vertices, each labelled with its corner radius.

#### Scenario: Corner preview on
- **WHEN** the corner preview is turned on for the heart preset
- **THEN** the polygon and its vertices are drawn over the shape

### Requirement: Validation highlights
The editor SHALL highlight both circles of every invalid tangent pair and every nested circle, on the canvas and in the side panel, with a short reason.

#### Scenario: Impossible pair
- **WHEN** the user moves two circles so that their tangent has |k| >= 1
- **THEN** both circles and their panel rows are highlighted with a "no tangent" message

### Requirement: Vertical mirror symmetry
When symmetry is on, the editor SHALL mirror across the canvas's vertical centre line. Circles are paired with a twin at the mirrored position; editing, adding or deleting one updates its twin. Circles on the axis stay on it. Turning symmetry on MUST pair circles whose mirrored positions match within 0.5 units.

#### Scenario: Edit updates twin
- **WHEN** symmetry is on for the heart preset and the user moves the right lobe from x 70 to x 72
- **THEN** the left lobe moves from x 30 to x 28

#### Scenario: Add with symmetry
- **WHEN** symmetry is on and the user adds a circle right of the axis
- **THEN** a mirrored twin is added at the corresponding position on the left side of the loop

### Requirement: Presets
The editor SHALL offer spade, heart, club and diamond presets, loading the values listed in the brief. Loading a preset MUST be undoable.

#### Scenario: Load heart
- **WHEN** the user picks the heart preset
- **THEN** the shape contains circles (70,35,27), (50,90,4), (30,35,27) and (50,12,-3) in that order

### Requirement: Undo and redo
Every change to the shape SHALL be undoable with Ctrl/Cmd+Z and redoable with Ctrl/Cmd+Shift+Z (and Ctrl+Y). A drag MUST count as a single step.

#### Scenario: Undo a drag
- **WHEN** the user drags a circle across the canvas and presses Ctrl+Z
- **THEN** the circle returns to where the drag started

### Requirement: Accessibility and visual style
All controls SHALL be reachable and operable by keyboard with visible focus. UI elements MUST use one uniform corner radius, never mixing sharp and rounded corners on the same element. The font MUST be Aquawax Fx when available, otherwise a neutral sans-serif.

#### Scenario: Keyboard only
- **WHEN** the user works with the keyboard only
- **THEN** they can select circles, edit values, toggle overlays, load presets and export
