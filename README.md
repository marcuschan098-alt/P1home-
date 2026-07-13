# P1 Home Intelligence — Version 12.1

Version 12.1 fixes the issues reported after Version 12.

## Fixed

- Left-panel dropdowns no longer overflow beneath the map.
- Filter rows collapse cleanly on narrower screens.
- The application title now displays **P1 Home Intelligence v12.1**.
- The unused grey band above the map is removed.
- The **Report** action now opens the Property Intelligence Report above other drawers.
- Card metadata is labelled clearly:
  - distance
  - TOP year
  - tenure
- The malformed `m2017` display is replaced by text such as:
  - `1011 m`
  - `TOP 2017 · 99-year`

## Deployment

Upload these files from `public-app/`:

- `index.html`
- `app.js`
- `styles.css`

Existing static JSON files can remain unchanged.

After committing, hard refresh with `Ctrl + F5`.
