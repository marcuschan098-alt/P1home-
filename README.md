# Primary School × Condo Pairing — Version 2.1

This stable release is built from the last working Version 2 hotfix.

## Change in this release

The old single maximum-budget dropdown has been replaced with a dual-ended estimated 3-bedroom property-value slider:

- Minimum: S$1,000,000
- Maximum: S$3,000,000
- Increment: S$50,000
- Pairings remain visible when their estimated price range overlaps your selected range

No OneMap code is included in this release. Mapping will be added separately after this version is confirmed stable.

## Update your GitHub Pages site

Replace:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`
- `data/pairings.json`

Commit the changes, wait for GitHub Pages to redeploy, then press `Ctrl + F5`.

## Test locally

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.
