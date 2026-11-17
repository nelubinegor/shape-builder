# Spec Delta

## ADDED Requirements

### Requirement: Canvas size bounds
The document's canvas width and height SHALL each be a number from 1 to 4096 units. Loading a document whose canvas size is outside that range MUST be rejected with a visible error, leaving the current shape unchanged.

#### Scenario: Custom size round trip
- **WHEN** a document with a 24×32 canvas is saved and loaded again
- **THEN** the canvas is 24×32

#### Scenario: Oversized canvas rejected
- **WHEN** the user opens a file whose canvas width is 10000
- **THEN** an error message is shown and the current shape is unchanged
