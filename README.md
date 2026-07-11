# P1 Home Intelligence — Version 4.1

Version 4.1 replaces the experimental basemap handling with the official OneMap Default XYZ configuration.

## Map foundation

- Official Leaflet 1.9.4 CSS and JavaScript
- Correct Leaflet CSS integrity hash
- Official OneMap Default XYZ endpoint
- `detectRetina: true`
- `minZoom: 11`
- `maxZoom: 19`
- Official OneMap logo and attribution
- Simplified reload behaviour
- No experimental fallback or automatic tile switching

## Existing functionality retained

- Map-first interface
- Target-school, condo and alternative-school markers
- 1 km school radius
- Price slider and filters
- Ranked results
- Compare and shortlist
- Notes
- Coordinate cache import/export
- Resume geocoding
- CSV export

## Deploy

Replace these files in your GitHub repository:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`
- `data/pairings.json`

Commit the changes, wait for GitHub Pages deployment, then force-refresh the page.

## Coordinate setup

The basemap itself does not require a token. A temporary OneMap access token is required only for the Search API that converts school and condo names into latitude and longitude.

Do not commit the token into GitHub.
