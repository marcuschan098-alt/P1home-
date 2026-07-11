# Primary School × Condo Pairing — OneMap and Price Range Update

This focused update adds:

1. **OneMap basemap**
   - Uses OneMap GreyLite map tiles.
   - Schools and condos are geocoded through the OneMap Search API.
   - Selecting a target school draws a 1 km radius.
   - Condo, target-school and alternative-school markers are displayed.
   - The access token is entered in the browser and stored only in session storage.
   - Geocoded coordinates are cached in local storage.

2. **Dual-ended estimated 3-bedroom price slider**
   - Range: S$1,000,000 to S$3,000,000.
   - Step: S$50,000.
   - A pairing remains visible when its estimated price interval overlaps the selected range.

## Replace the existing GitHub Pages files

Upload and replace:

- `index.html`
- `styles.css`
- `app.js`
- `data/pairings.json`
- `README.md`

Commit the changes, wait for GitHub Pages to redeploy, then force-refresh with `Ctrl + F5`.

## First-time OneMap setup

1. Open the **OneMap** tab.
2. Select **OneMap setup**.
3. Paste a current temporary OneMap access token.
4. Select **Geocode schools and condos**.
5. Wait for the progress message to finish.

The token is not placed in the repository. Only coordinates are cached in the browser.

## Security

Do not commit an access token to GitHub. OneMap tokens expire and should remain private.

## OneMap attribution

The app uses the official GreyLite tile endpoint and displays:
`OneMap © contributors | Singapore Land Authority`.
