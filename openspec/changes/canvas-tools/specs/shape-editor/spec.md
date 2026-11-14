# Spec Delta

## MODIFIED Requirements

### Requirement: Canvas
The editor SHALL show an SVG canvas, 100×100 units by default and resizable, with a white background, the filled shape in black, and selection and construction drawn in `#0D2DD7`. The canvas MUST support zoom (pinch, Ctrl/Cmd + scroll, or keyboard) and pan (Space + drag, middle-mouse drag, or two-finger/plain scroll), and two independently toggled grids: a pixel grid and an icon grid. Dragging empty canvas without Space MUST NOT pan.

#### Scenario: Zoom and pan
- **WHEN** the user holds Ctrl and scrolls over the canvas, then holds Space and drags
- **THEN** the view zooms around the pointer and then pans, without changing any circle values

#### Scenario: Plain scroll pans
- **WHEN** the user scrolls without a modifier key
- **THEN** the view pans and the zoom level is unchanged

#### Scenario: Space shows a grab cursor
- **WHEN** focus is not in a text field and the user holds Space over the canvas
- **THEN** the cursor becomes a hand and a drag pans the view instead of moving circles

### Requirement: Preset shapes
The editor SHALL offer circle, cross, head and hand presets. Circle is a single convex circle; cross, head (a profile silhouette) and hand (a peace-sign hand) reproduce the matching icons in the twostu Design Library in Figma. Presets are defined on a 100×100 artboard and MUST be scaled uniformly by min(width, height) / 100 and centred when loaded onto a canvas of another size. Loading a preset MUST be undoable.

#### Scenario: Load circle
- **WHEN** the user picks the circle preset on the default 100×100 canvas
- **THEN** the shape contains exactly one convex circle centred at (50, 50)

#### Scenario: Hand matches the source
- **WHEN** the user picks the hand preset
- **THEN** the shape has 16 circles and its outline matches the Figma hand icon scaled to the artboard

#### Scenario: Presets are valid
- **WHEN** any preset is loaded
- **THEN** it has no invalid tangent pairs and no nested circles

#### Scenario: Preset on a 24×24 canvas
- **WHEN** the canvas is 24×24 and the user picks the circle preset
- **THEN** the shape contains one circle centred at (12, 12) with radius 7.2

## ADDED Requirements

### Requirement: Canvas size
The panel SHALL offer width and height inputs for the canvas (1 to 4096 units each), with a lock that keeps them equal. Changing the size MUST scale every circle's position and radius uniformly by min(newW / oldW, newH / oldH) and centre the result on the new canvas. Resizing MUST be a single undoable step and MUST refit the view.

#### Scenario: Shrink to icon size
- **WHEN** the canvas is 100×100 with the circle preset and the user sets the size to 24 with the lock on
- **THEN** the canvas is 24×24 and the circle is centred at (12, 12) with radius 7.2

#### Scenario: Non-square canvas
- **WHEN** the lock is off, the canvas is 100×100 and the user sets the width to 200
- **THEN** the canvas is 200×100, circles keep their size and the shape is centred horizontally

#### Scenario: Undo resize
- **WHEN** the user changes the canvas size and presses Ctrl+Z
- **THEN** the previous size and circle values are restored

#### Scenario: Out-of-range size
- **WHEN** the user enters 0 or 5000 as a width
- **THEN** the value is clamped to 1 or 4096

### Requirement: Reference image
The user SHALL be able to add a reference image by pasting an image (Ctrl/Cmd+V while focus is not in a text field), dropping an image file on the canvas, or choosing a file with a panel button. The image MUST be fitted inside the artboard (preserving its aspect ratio) and centred, and drawn above the paper and below the shape. Adding a new image MUST replace the previous one.

#### Scenario: Paste a reference
- **WHEN** the user copies an image and presses Ctrl+V over the editor
- **THEN** the image appears fitted inside the artboard, under the shape

#### Scenario: Drop a reference
- **WHEN** the user drops a PNG file on the canvas
- **THEN** it becomes the reference image

#### Scenario: Non-image paste is ignored
- **WHEN** the clipboard holds only text and the user presses Ctrl+V outside a text field
- **THEN** nothing changes

### Requirement: Onion-skin display
While a reference image is shown, the panel SHALL offer an opacity slider for it (default 50%) and buttons to hide/show and remove it, and the shape MUST be drawn semi-transparent (60% opacity) so both stay visible. The reference MUST NOT be saved with the document, exported, or recorded in undo history.

#### Scenario: Shape becomes see-through
- **WHEN** a reference image is shown
- **THEN** the shape is drawn at 60% opacity and the reference at the slider's opacity

#### Scenario: Hide and remove
- **WHEN** the user hides the reference, then removes it
- **THEN** the shape returns to full opacity after hiding, and the reference controls disappear after removing

#### Scenario: Not saved or exported
- **WHEN** a reference image is shown and the user exports SVG, saves the document or reloads the page
- **THEN** the export and the saved document contain no image, and after reload no reference is shown

### Requirement: Icon grid
The editor SHALL draw the twostu icon grid, matching the Figma "Icon grid" component, when toggled on. The grid is defined on a 24-unit layout and MUST be scaled by min(width, height) / 24, centred on the canvas, and drawn above the shape with thin, low-opacity strokes. It MUST NOT be captured by picking or included in exports.

#### Scenario: Icon grid on a 24×24 canvas
- **WHEN** the canvas is 24×24 and the icon grid is on
- **THEN** it shows circles of radius 10 and 5 centred at (12, 12), an 18×18 square at (3, 3), a 16×20 rectangle at (4, 2) and a 20×16 rectangle at (2, 4) (all with corner radius 1), both corner-to-corner diagonals, and lines at 4, 8, 12, 16 and 20 in both directions

#### Scenario: Icon grid on the default canvas
- **WHEN** the canvas is 100×100 and the icon grid is on
- **THEN** the outer keyline circle has radius 41.67 and the square keyline spans 12.5 to 87.5

#### Scenario: Clicks pass through
- **WHEN** the icon grid is on and the user clicks a circle under a keyline
- **THEN** the circle is selected as if the grid were off

### Requirement: Grid toggles
The toolbar SHALL offer separate "Pixel grid" and "Icon grid" toggles, so neither, either or both grids can be shown. The pixel grid draws a line every grid step (default 1 unit); snapping MUST keep using the grid step whether or not the pixel grid is visible.

#### Scenario: Both grids
- **WHEN** the user turns both toggles on
- **THEN** the pixel grid and the icon grid are both drawn

#### Scenario: Snapping without a visible grid
- **WHEN** both grids are off, snapping is on and the user drags a centre to (40.37, 22.8)
- **THEN** the circle's centre becomes (40, 23)
