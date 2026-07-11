# P1 Home Intelligence — Version 4.2

Version 4.2 adds the Singapore-ready platform foundation while preserving the stable Version 4.1.1 user experience.

## Data architecture
- `data/schools.json`
- `data/condos.json`
- `data/pairings.json` (normalised references)
- `data/pairings-expanded.json` (stable current UI compatibility)
- `data/coordinates.json`
- `data/manifest.json`

## Coverage levels
- Curated: full evidence and scoring
- Basic: core property and map data
- Mapped: location only, without invented scores

## Hidden Admin Mode
Open with `Ctrl + Shift + A` on a keyboard or append `#admin` to the site URL. This is an interface-hiding mechanism, not secure authentication, because GitHub Pages is static hosting.

Admin tools include data health, coordinate setup, adding map-only schools or condos, building local pairings, and exporting a platform bundle.

## Deploy
Replace the repository contents with this package, preserving the `data` folder. Commit and force-refresh after GitHub Pages deploys.
