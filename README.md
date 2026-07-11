# P1 Home Intelligence — Version 4.0.1

Version 4.0.1 is a map-first redesign of the Primary School × Condo Pairing application.

## Main changes

- Map-first desktop interface with a persistent filter and ranked-results sidebar
- Mobile layout that stacks filters and map cleanly
- OneMap Original and GreyLite basemaps
- Automatic retry of failed OneMap tiles
- Automatic fallback to OpenStreetMap street tiles when repeated OneMap tile failures occur
- Target-school, condo and alternative-school markers
- 1 km radius around a selected target school
- Filters, ranked results and map remain synchronised
- Details drawer, compare, shortlist, notes and CSV export retained
- OneMap geocoding cache can be exported and imported
- Interrupted geocoding can be resumed

## Deploy to GitHub Pages

Replace these files in the repository:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`
- `data/pairings.json`

Commit the files, wait for GitHub Pages to redeploy, then force-refresh the browser.

## OneMap setup

The basemap does not need a token. A token is required only for the OneMap Search API used to convert school and condo names into coordinates.

1. Select **OneMap setup**.
2. Paste a current temporary token.
3. Select **Geocode visible** for a small test or **Geocode all**.
4. Export the completed coordinate cache.
5. Import that cache on another browser or device.

Never commit a token into the GitHub repository.


## Version 4.0.1 mobile tile fix

- Removed the unnecessary `crossOrigin` setting from map tiles.
- Switches to the reliable street basemap immediately after the first failed OneMap tile.
- Keeps OneMap as the source for school and condo geocoding.
- Stops forced tile redraws that created extra requests on mobile.
- Stacks controls above a full-width map on screens below 1200 px.
