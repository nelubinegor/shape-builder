# Spec Delta

## MODIFIED Requirements

### Requirement: Preset shapes
The editor SHALL offer icon presets (circle, cross, head, hand) followed by card-suit presets (spade, heart, club, diamond). Circle is a single convex circle; cross, head (a profile silhouette) and hand (a peace-sign hand) reproduce the matching icons in the twostu Design Library in Figma. Presets are defined on a 100×100 artboard and MUST be scaled uniformly by min(width, height) / 100 and centred when loaded onto a canvas of another size. Picking a preset MUST add a new shape (named after the preset, on the open shape's canvas size) to the shape library and open it, leaving the previously open shape unchanged in the library.

#### Scenario: Load circle
- **WHEN** the user picks the circle preset on the default 100×100 canvas
- **THEN** the shape contains exactly one convex circle centred at (50, 50)

#### Scenario: Hand matches the source
- **WHEN** the user picks the hand preset
- **THEN** the shape has 16 circles and its outline matches the Figma hand icon scaled to the artboard

#### Scenario: Presets are valid
- **WHEN** any preset is loaded
- **THEN** it has no invalid tangent pairs and no nested circles

#### Scenario: Card suits are offered
- **WHEN** the user opens the preset menu
- **THEN** it lists circle, cross, head and hand under "Icons" and spade, heart, club and diamond under "Card suits"

#### Scenario: Preset on a 24×24 canvas
- **WHEN** the canvas is 24×24 and the user picks the circle preset
- **THEN** the shape contains one circle centred at (12, 12) with radius 7.2

#### Scenario: Preset keeps the previous shape
- **WHEN** the user has edited a shape and picks the heart preset
- **THEN** a new shape named "heart" opens and the edited shape is still in My shapes, unchanged
