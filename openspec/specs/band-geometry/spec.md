# band-geometry Specification

## Purpose
Computes the exact outline of a rubber band stretched around an ordered, clockwise loop of convex and concave circles, in both a flattened arc form and an equivalent corner-radius form, and reports configurations that cannot be built.

## Requirements

### Requirement: Signed radius
The system SHALL treat a convex circle as signed radius `s = r` and a concave circle as `s = -r`, with `r > 0`. The circles form a closed loop traversed clockwise in screen space (y axis pointing down); the order of the loop determines the outline.

#### Scenario: Concave circle sign
- **WHEN** a circle with radius 6 is marked concave
- **THEN** the geometry uses signed radius -6 for it

### Requirement: Tangent between consecutive circles
For each consecutive pair A → B (including last → first), the system SHALL compute the tangent as: `v = b - a`, `L = |v|`, `u = v / L`, `w = (u.y, -u.x)`, `k = (sa - sb) / L`, `n = k·u + sqrt(1 - k²)·w`, with tangent points `pA = a + sa·n` and `pB = b + sb·n`.

#### Scenario: Equal convex circles
- **WHEN** A = (0, 0, r 10) and B = (50, 0, r 10), both convex
- **THEN** the tangent points are pA = (0, -10) and pB = (50, -10)

#### Scenario: Convex to concave pair
- **WHEN** A = (0, 0, s 10) and B = (50, 0, s -10)
- **THEN** k = 0.4, and pA and pB lie on a line tangent to both circles, with pA at distance 10 from a and pB at distance 10 from b

### Requirement: Invalid tangent pairs
The system SHALL mark a consecutive pair as invalid when `|k| >= 1` (no tangent exists) or when the two centres coincide. Invalid pairs MUST be reported with the indices of both circles, and the outline MUST still be produced without throwing (clamping `sqrt(1 - k²)` at 0).

#### Scenario: Pair too close for its radii
- **WHEN** A = (0, 0, s 10) and B = (15, 0, s -10), so |k| = 20/15
- **THEN** the pair (A, B) is reported invalid and no exception is raised

### Requirement: Nested circle detection
The system SHALL report a circle as nested when it lies entirely inside a neighbouring circle in the loop, that is when `L + min(rA, rB) <= max(rA, rB)` using absolute radii.

#### Scenario: Small circle inside its neighbour
- **WHEN** A = (0, 0, r 20) and its neighbour B = (5, 0, r 4)
- **THEN** B is reported as nested inside A

### Requirement: Arc on each circle
For each circle, the system SHALL produce an arc from its incoming tangent point to its outgoing tangent point. Convex circles sweep clockwise (SVG sweep-flag 1); concave circles sweep counter-clockwise (sweep-flag 0). The sweep angle MUST be normalised to [0, 2π), and the large-arc flag MUST be 1 exactly when the sweep exceeds π.

#### Scenario: Convex arc larger than half a turn
- **WHEN** the loop is A = (0, 0, s 20), B = (50, 0, s 5)
- **THEN** A's arc has sweep-flag 1 and large-arc flag 1, and B's arc has large-arc flag 0

#### Scenario: Convex arc smaller than half a turn
- **WHEN** the heart preset is computed
- **THEN** the two top lobes (r 27) have sweep-flag 1, a sweep of about 2.862 rad and large-arc flag 0

#### Scenario: Concave arc direction
- **WHEN** a concave circle is part of the loop
- **THEN** its arc has sweep-flag 0

### Requirement: Flattened path
The system SHALL produce an SVG path string that starts with `M` at the first circle's incoming tangent point, then for each circle an `A` command to its outgoing tangent point followed by an `L` command to the next circle's incoming tangent point, and ends with `Z`. The output MUST match the brief's reference `bandPath` implementation for the same input (to within 1e-9 per coordinate).

#### Scenario: Matches reference implementation
- **WHEN** each preset is passed to the path function
- **THEN** the resulting numbers equal those of the reference `bandPath` output within 1e-9

### Requirement: Corner-radius form
The system SHALL produce an equivalent polygon in which each arc becomes a vertex with `cornerRadius = |r|`, located at `c + (R / cos(sw/2))·(cos mid, sin mid)` with `mid = ain + sg·sw/2` (`sg` = +1 convex, -1 concave). Arcs with sweep greater than 2.2 rad MUST be split into `ceil(sw / 2.2)` equal parts, each its own vertex with the same radius. Arcs with sweep under 0.02 rad MUST be skipped.

#### Scenario: Large sweep is split
- **WHEN** an arc has a sweep of 4.0 rad
- **THEN** it yields 2 vertices, each with the circle's radius and a sub-sweep of 2.0 rad

#### Scenario: Negligible arc is skipped
- **WHEN** an arc has a sweep of 0.01 rad
- **THEN** no vertex is produced for it

### Requirement: Both forms describe the same outline
The flattened path and the corner-radius polygon (with its fillets applied) SHALL describe the same outline: points sampled along one MUST lie within 1e-6 units of the other.

#### Scenario: Preset outlines agree
- **WHEN** each preset is sampled at many points along both forms
- **THEN** every sample of one form is within 1e-6 units of the other form's outline
