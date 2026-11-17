# Spec Delta

## MODIFIED Requirements

### Requirement: Autosave to localStorage
The editor SHALL save the open shape to its entry in the shape library (localStorage) after every change and restore the library, with the last open shape, on load. If nothing is stored, it MUST start with a library holding one circle preset.

#### Scenario: Reload keeps work
- **WHEN** the user edits a shape and reloads the page
- **THEN** the same shape is shown

#### Scenario: First visit
- **WHEN** the user opens the editor with nothing stored
- **THEN** the shape is a single convex circle centred on the artboard

### Requirement: File download and upload
The user SHALL be able to download the open shape as a `.json` file and open a `.json` file. Opening a file MUST add it to the shape library as a new shape and open it, leaving the previously open shape in the library.

#### Scenario: Open a saved file
- **WHEN** the user opens a previously downloaded document file
- **THEN** its shape opens as a new entry in My shapes and the previous shape is still in the library
