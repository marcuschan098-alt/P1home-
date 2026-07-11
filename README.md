# Primary School × Condo Pairing — Version 3.1

Version 3.1 is the new stable OneMap release.

## Main improvements

- OneMap Original and GreyLite basemap selector
- Automatic tile retry
- Automatic fallback between basemap styles after repeated tile failures
- Larger mobile tile buffer
- Search schools, condos and alternative schools directly on the map
- Map counters for cached schools, condos and total locations
- Resume incomplete geocoding after interruption or token expiry
- Export and import coordinate cache JSON
- Current filters continue to control the map results
- 1 km circle around a selected target school
- Clickable result panel linked to map zoom

## Deploy

Replace these files in the existing GitHub repository:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`
- `data/pairings.json`

Commit, wait for deployment, then use `Ctrl + F5`.

## First use

1. Open **OneMap**.
2. Confirm the basemap loads.
3. Open **OneMap setup**.
4. Paste a valid temporary token.
5. Choose **Geocode visible data** for a small test.
6. Use **Geocode all data** when ready.
7. Export the coordinate cache as a backup.

The token is stored only in session storage. It is never embedded in the public repository.
