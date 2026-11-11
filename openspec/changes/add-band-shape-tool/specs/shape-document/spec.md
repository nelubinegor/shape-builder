# Spec Delta

## Purpose

Defines the saved form of a band shape and how it is kept between sessions and moved in and out of the tool as a JSON file.

## ADDED Requirements

### Requirement: Document format
A document SHALL be JSON of the form `{ "version": 1, "canvas": { "width", "height" }, "shapes": [ { "name", "fill", "symmetry", "circles": [ { "id", "x", "y", "r", "mode" } ] } ] }`, where `mode` is `"convex"` or `"concave"` and `circles` is in clockwise band order. Version 1 editors MUST hold exactly one shape but store it in the `shapes` array.

#### Scenario: Round trip
- **WHEN** a document is saved and loaded again
- **THEN** every circle's id, position, radius, mode and order, plus the shape's name, fill and symmetry, are unchanged

### Requirement: Autosave to localStorage
The editor SHALL save the current document to localStorage after every change and restore it on load. If nothing is stored, it MUST start with the heart preset.

#### Scenario: Reload keeps work
- **WHEN** the user edits a shape and reloads the page
- **THEN** the same shape is shown

### Requirement: File download and upload
The user SHALL be able to download the document as a `.json` file and open a `.json` file. Opening a file MUST replace the current shape as one undoable step.

#### Scenario: Open a saved file
- **WHEN** the user opens a previously downloaded document file
- **THEN** its shape replaces the current one and Ctrl+Z restores the previous shape

### Requirement: Invalid input is rejected
Loading a file or stored data that is not valid JSON, has an unknown version, or has malformed circles SHALL be rejected with a visible error message, leaving the current shape unchanged.

#### Scenario: Malformed file
- **WHEN** the user opens a file whose circles lack a radius
- **THEN** an error message is shown and the current shape is unchanged
