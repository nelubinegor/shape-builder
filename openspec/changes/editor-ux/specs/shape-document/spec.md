# Spec Delta

## MODIFIED Requirements

### Requirement: Autosave to localStorage
The editor SHALL save the current document to localStorage after every change and restore it on load. If nothing is stored, it MUST start with the circle preset.

#### Scenario: Reload keeps work
- **WHEN** the user edits a shape and reloads the page
- **THEN** the same shape is shown

#### Scenario: First visit
- **WHEN** the user opens the editor with nothing stored
- **THEN** the shape is a single convex circle centred on the artboard
