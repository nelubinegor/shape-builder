# shape-editor Specification

## Purpose
Lets a designer build one band shape interactively: place, size and order circles on a canvas, see the band update live with construction aids and validation, and use symmetry, presets and undo/redo.

## Requirements

### Requirement: Canvas
The editor SHALL show a square SVG canvas, 100×100 units by default, with a white background, the filled shape in black, and selection and construction drawn in `#0D2DD7`. The canvas MUST support zoom (pinch, Ctrl/Cmd + scroll, or keyboard) and pan (Space + drag, middle-mouse drag, or two-finger/plain scroll), and an optional grid that can be toggled. Dragging empty canvas without Space MUST NOT pan.

#### Scenario: Zoom and pan
- **WHEN** the user holds Ctrl and scrolls over the canvas, then holds Space and drags
- **THEN** the view zooms around the pointer and then pans, without changing any circle values

#### Scenario: Plain scroll pans
- **WHEN** the user scrolls without a modifier key
- **THEN** the view pans and the zoom level is unchanged

#### Scenario: Space shows a grab cursor
- **WHEN** focus is not in a text field and the user holds Space over the canvas
- **THEN** the cursor becomes a hand and a drag pans the view instead of moving circles

### Requirement: Grid snapping
When snapping is on, the editor SHALL snap circle centres and radii set by dragging to the grid step (default 1 unit). Holding Alt during a drag MUST skip snapping for that drag. Numeric inputs MUST NOT be snapped.

#### Scenario: Drag with snapping
- **WHEN** snapping is on with step 1 and the user drags a centre to (40.37, 22.8)
- **THEN** the circle's centre becomes (40, 23)

#### Scenario: Alt skips snapping
- **WHEN** snapping is on and the user holds Alt while dragging a centre to (40.37, 22.8)
- **THEN** the circle's centre becomes (40.37, 22.8)

### Requirement: Add circle
Double-clicking empty canvas SHALL add a circle (default radius 5) centred at that point, and the panel SHALL offer an "Add circle" button. A single click on empty canvas MUST only clear the selection. The new circle MUST become selected.

#### Scenario: Single click deselects
- **WHEN** a circle is selected and the user clicks once on empty canvas
- **THEN** nothing is selected and no circle is added

#### Scenario: Double-click adds
- **WHEN** the user double-clicks empty canvas at (20, 80)
- **THEN** a circle centred at (20, 80) with radius 5 is added and selected

#### Scenario: Add after selection
- **WHEN** circle 2 of 4 is selected and the user presses "Add circle"
- **THEN** a new circle is inserted at position 3, centred midway between circles 2 and 3, and selected

#### Scenario: Add button with nothing selected
- **WHEN** nothing is selected and the user presses "Add circle"
- **THEN** a new circle is added at the centre of the current view, using the same insertion and mode rules as a double-click

### Requirement: Move and resize by dragging
The editor SHALL move a circle when it is dragged and resize it when the selected circle is dragged near its rim (from any point on the rim). Which circle a drag grabs MUST follow the picking rule. The radius MUST stay at least 0.5 units.

#### Scenario: Resize via rim handle
- **WHEN** a circle centred at (50, 50) with radius 10 is selected and the user drags from its rim point (50, 60) to (50, 62)
- **THEN** its radius becomes 12

#### Scenario: Drag inside moves
- **WHEN** the user drags from a point inside a circle, away from its rim
- **THEN** the circle moves by the drag distance

### Requirement: Keyboard editing
With a circle selected and focus not in a text field, the arrow keys SHALL nudge its centre by 1 unit (0.1 with Alt held). Arrow keys with Shift held SHALL resize instead (Up/Right grow, Down/Left shrink). Delete or Backspace SHALL delete it, C SHALL toggle its mode and Esc SHALL clear the selection. These keys MUST work without first focusing the canvas. Tab/Shift+Tab SHALL move the selection along the band order while the canvas is focused.

#### Scenario: Nudge
- **WHEN** a circle at (30, 30) is selected and the user presses Right
- **THEN** it moves to (31, 30)

#### Scenario: Resize with modifier
- **WHEN** a circle with radius 5 is selected and the user presses Shift+Up
- **THEN** its radius becomes 6

#### Scenario: Shortcuts after using the panel
- **WHEN** the user selects a circle by clicking its panel row and then presses Right
- **THEN** the circle moves 1 unit to the right

#### Scenario: Text fields keep their keys
- **WHEN** focus is in a numeric input and the user presses Backspace
- **THEN** the input edits its text and no circle is deleted

### Requirement: Circle mode toggle
The user SHALL be able to switch a circle between convex and concave from the canvas (a shortcut key, C) and from the side panel.

#### Scenario: Toggle to concave
- **WHEN** a convex circle is selected and the user presses C
- **THEN** it becomes concave and the band bends inward around it

### Requirement: Side panel
The editor SHALL show a side panel with the shape's name and fill in its header and the circles in band order, one compact row per circle. Each row MUST provide numeric inputs for x, y and r and a mode toggle. The selected row MUST also show move up/down, duplicate and delete controls. Rows MUST support reordering by dragging and by keyboard. Selecting a circle on the canvas MUST scroll its row into view.

#### Scenario: Edit numerically
- **WHEN** the user types 42 into a circle's r input
- **THEN** the circle's radius becomes 42 and the band recalculates

#### Scenario: Reorder
- **WHEN** the user drags row 1 below row 3
- **THEN** the band order changes accordingly and the outline recalculates

#### Scenario: Duplicate
- **WHEN** the user duplicates a circle
- **THEN** a copy offset by (2, 2) is inserted right after it and selected

#### Scenario: Selection scrolls into view
- **WHEN** the panel is scrolled so that row 9 is hidden and the user selects circle 9 on the canvas
- **THEN** row 9 scrolls into view and is highlighted

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

### Requirement: Preset shapes
The editor SHALL offer circle, cross, head and hand presets. Circle is a single convex circle; cross, head (a profile silhouette) and hand (a peace-sign hand) reproduce the matching icons in the twostu Design Library in Figma. Loading a preset MUST be undoable.

#### Scenario: Load circle
- **WHEN** the user picks the circle preset
- **THEN** the shape contains exactly one convex circle centred at (50, 50)

#### Scenario: Hand matches the source
- **WHEN** the user picks the hand preset
- **THEN** the shape has 16 circles and its outline matches the Figma hand icon scaled to the artboard

#### Scenario: Presets are valid
- **WHEN** any preset is loaded
- **THEN** it has no invalid tangent pairs and no nested circles

### Requirement: Insertion at the nearest band segment
A circle added by double-click SHALL be inserted into the band loop between the two consecutive circles whose stretch of band (tangent line, or the nearer half of an arc) lies closest to the click point. With fewer than two circles, it MUST be appended.

#### Scenario: Double-click beside an edge
- **WHEN** the heart preset is loaded and the user double-clicks at (85, 70), next to the band between circle 1 (right lobe) and circle 2 (bottom tip)
- **THEN** the new circle is inserted at position 2, between those circles

#### Scenario: Symmetric insertion
- **WHEN** symmetry is on and the user double-clicks right of the axis
- **THEN** the circle is inserted at the nearest segment and its mirrored twin at the mirrored position in the loop

### Requirement: Mode from position
A circle added by double-click (or by the Add button) SHALL be convex when its centre lies inside the current filled shape and concave when it lies outside. With fewer than two circles, it MUST be convex.

#### Scenario: Inside makes convex
- **WHEN** the heart preset is loaded and the user double-clicks at (50, 50), inside the fill
- **THEN** the new circle is convex

#### Scenario: Outside makes concave
- **WHEN** the heart preset is loaded and the user double-clicks at (85, 75), outside the fill
- **THEN** the new circle is concave

### Requirement: Picking
The editor SHALL pick the circle under the pointer in this order, within a tolerance of 8 screen pixels: the selected circle's rim (resize); the nearest centre (move); the nearest rim (move); otherwise the smallest circle containing the pointer whose on-screen radius is at most 150 pixels (move). If none match, the pointer is over empty canvas.

#### Scenario: Small concave circle is easy to grab
- **WHEN** the club preset is loaded and the user presses anywhere inside the concave circle at (78, 27)
- **THEN** that concave circle is selected, not the neighbouring convex lobe

#### Scenario: Huge circles do not swallow clicks
- **WHEN** the diamond preset is loaded and the user clicks empty paper outside the shape, far from any rim or centre
- **THEN** no circle is selected

### Requirement: Hover feedback
When the pointer is over a circle (per the picking rule), the editor SHALL outline that circle and show a cursor for the action a drag would perform (move, or resize near the selected circle's rim), even when the construction overlay is off.

#### Scenario: Hover with overlay off
- **WHEN** the construction overlay is off and the pointer rests inside a circle
- **THEN** that circle's outline is drawn and the cursor shows the move action

### Requirement: Auto-order
The panel SHALL offer an "Auto-order" action that reorders all circles clockwise by the angle of their centres around the mean of all centres, keeping the current first circle first. It MUST be a single undoable step and MUST NOT change any circle's position, radius or mode.

#### Scenario: Restore a scrambled heart
- **WHEN** the heart preset's circles are in the order right lobe, left lobe, bottom tip, top notch and the user presses Auto-order
- **THEN** the order becomes right lobe, bottom tip, left lobe, top notch

#### Scenario: Undo auto-order
- **WHEN** the user presses Auto-order and then Ctrl+Z
- **THEN** the previous order is restored

### Requirement: View controls and fit
The default view SHALL show the whole artboard with a margin of about 8% on each side. The canvas SHALL show zoom out, zoom level, zoom in and Fit controls; Fit (and the 0 key) MUST restore the default view.

#### Scenario: Fit after zooming
- **WHEN** the user zooms in and presses Fit
- **THEN** the whole artboard is visible with a margin around it

### Requirement: Shortcut hint
The canvas SHALL show a one-line hint listing the shortcuts relevant to the current state: with nothing selected, how to add and pan; with a circle selected, how to move, resize, toggle mode and delete.

#### Scenario: Hint follows selection
- **WHEN** the user selects a circle
- **THEN** the hint changes to list the arrow, Shift+arrow, C and Delete shortcuts
