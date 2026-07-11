# Primary School × Condo Pairing — Version 3.0

Version 3.0 adds an interactive OneMap view to the stable Version 2.2 application.

## New features

- Official OneMap GreyLite basemap
- Target-school markers
- Condo markers
- Alternative-school markers
- 1 km radius around the selected target school
- Existing filters also control what is shown on the map
- Clickable map results and marker pop-ups
- Temporary OneMap token kept only in browser session storage
- Coordinate results cached in local storage
- Export and import coordinate cache JSON
- Geocode only visible data or the entire dataset

## Update the GitHub Pages site

Replace:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`
- `data/pairings.json`

Commit, wait for GitHub Pages deployment, then press `Ctrl + F5`.

## First-time OneMap setup

1. Open the **OneMap** tab.
2. Select **OneMap setup**.
3. Paste a valid temporary OneMap token.
4. Select **Geocode visible data** for the current filtered selection, or **Geocode all data** for the complete dataset.
5. Leave the browser open until the progress message completes.
6. Export the coordinate cache as a backup.

The token is never included in the repository. Cached coordinates remain available after the token expires.

## Security

Do not commit a token, email address or OneMap password into GitHub.
