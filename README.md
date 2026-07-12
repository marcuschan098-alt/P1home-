# P1 Home Intelligence — Version 6.0

Version 6 replaces session-only distance calculation with a reusable distance knowledge-base architecture.

## Evidence hierarchy

1. Exact residential address points, preferably postal codes
2. Development-level OneMap point for screening
3. Missing data, never silently inferred

## Singapore-wide behaviour

The included catalogue contains all schools referenced by the current curated dataset, including alternative schools. A known non-target school can return nearby unscored developments after its coordinate and the distance knowledge base are available. No admission or investment score is invented for those generated results.

This package does not yet contain every Singapore school or every residential address. The Admin Knowledge Base screen is designed for progressive expansion and quality control.

## First deployment

Your existing browser coordinate cache is compatible. Open `#admin`, import or geocode coordinates, add exact residential addresses where needed, then select Build / refresh KB. Export the KB for later inclusion in the repository.
