# Spec Delta

## Purpose

Keeps all of a user's shapes in one library in the browser, so they can work on several shapes, switch between them, and never lose work when starting something new.

## ADDED Requirements

### Requirement: Library of shapes
The editor SHALL keep a library ("My shapes") of the user's shapes in localStorage. Each entry MUST hold a complete document (canvas size, name, fill, symmetry and circles). Exactly one entry is open at a time, and the library MUST never be empty.

#### Scenario: Library survives reload
- **WHEN** the user has three shapes, opens the second and reloads the page
- **THEN** the library still has the three shapes and the second one is open

### Requirement: Autosave the open shape
Every change to the open shape SHALL be written to its library entry, so that switching shapes or reloading never loses work.

#### Scenario: Switch keeps edits
- **WHEN** the user moves a circle in shape A, switches to shape B and back to A
- **THEN** shape A shows the moved circle

### Requirement: Shapes menu with thumbnails
A "My shapes" toolbar button SHALL open a menu showing every shape as a thumbnail of its outline (at its canvas aspect ratio) with its name, with the open shape highlighted. Choosing a thumbnail MUST open that shape. The menu MUST be operable by keyboard and close with Esc or a click outside.

#### Scenario: Switch from the menu
- **WHEN** the user opens the menu and clicks the thumbnail of another shape
- **THEN** that shape opens and the menu closes

#### Scenario: Thumbnail reflects edits
- **WHEN** the user adds a circle to the open shape and opens the menu
- **THEN** the open shape's thumbnail shows the new outline

### Requirement: New, duplicate and delete
The menu SHALL offer New (a single circle on a canvas the size of the open shape's), Duplicate (an exact copy of the open shape, named with a "copy" suffix) and Delete (removes the open shape after confirmation). Each action MUST open the resulting shape; after Delete, the neighbouring shape opens. Deleting the last shape MUST leave a new blank shape.

#### Scenario: New shape keeps the canvas size
- **WHEN** the open shape has a 24×24 canvas and the user chooses New
- **THEN** a new shape with a 24×24 canvas and one centred circle opens, and the previous shape is still in the library

#### Scenario: Duplicate
- **WHEN** the user duplicates a shape named "hand"
- **THEN** a shape named "hand copy" with the same circles and canvas opens

#### Scenario: Delete the last shape
- **WHEN** the library has one shape and the user deletes it and confirms
- **THEN** the library has one new blank shape

### Requirement: Fresh undo history per shape
Opening a shape (by switching, New, Duplicate, a preset or opening a file) SHALL start an empty undo history. Undo MUST never change which shape is open.

#### Scenario: Undo after switching
- **WHEN** the user edits shape A, switches to shape B and presses Ctrl+Z
- **THEN** nothing changes in shape B and shape A keeps its edit

### Requirement: Migration from the single autosave
When no library exists but a document autosaved by an earlier version does, the editor SHALL create the library with that document as its only entry and open it.

#### Scenario: Existing work is kept
- **WHEN** a user who has a shape autosaved by the previous version opens the new version
- **THEN** My shapes contains that shape and it is open
