# Spec Delta

## ADDED Requirements

### Requirement: Single circle
A loop of exactly one circle SHALL produce a full circle: the flattened path MUST be two half-circle arcs, and the corner-radius form MUST be three vertices 120° apart, each with the circle's radius, so that both forms still describe the same outline.

#### Scenario: Corner form of one circle
- **WHEN** the loop is a single convex circle (50, 50, r 30)
- **THEN** the corner form has 3 vertices at distance 60 from (50, 50), each with corner radius 30

#### Scenario: Forms agree for one circle
- **WHEN** both forms of a single circle are sampled
- **THEN** every sample of one is within 1e-6 units of the other
