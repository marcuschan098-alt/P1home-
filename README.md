# Primary School × Condo Pairing Web App

A static decision tool generated from **Home Tracker – School Condo Pairing v6 Complete Master.xlsx**.

## Publish on GitHub Pages

1. Create a new GitHub repository.
2. Upload the contents of this folder to the repository root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`.
6. Save. GitHub will provide the public site address.

## Test locally

Because the app loads `data/pairings.json`, use a local HTTP server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Files

- `index.html` — page structure
- `styles.css` — responsive visual design
- `app.js` — filters, sorting, detail views and CSV export
- `data/pairings.json` — the data layer
- `README.md` — deployment instructions

## Updating the data

Replace `data/pairings.json` with a newly generated file using the same field names. The interface does not need to be rebuilt for ordinary data updates.

## Important

Admission scores are screening indicators based on the workbook methodology. They are not guarantees of P1 admission or property returns.
