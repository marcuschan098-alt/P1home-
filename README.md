# P1 Home Intelligence — Version 4.2.1

Version 4.2.1 adds backward-compatible and fault-tolerant data loading.

## Reliability changes

- The public application requires only `data/pairings.json`, matching the earlier deployment structure.
- `schools.json`, `condos.json`, `platform-pairings.json`, `coordinates.json`, and `manifest.json` are optional platform files.
- Missing optional files no longer stop the public app from loading.
- HTML or 404 responses are detected and reported clearly instead of producing `Unexpected token '<'`.
- Corrupt Admin Mode local-storage data falls back safely to repository data.

## Recommended deployment

Upload all files and folders in this package to the repository root. In particular, upload the entire `data` folder.

For the smallest emergency update, these files restore the public application:

- `index.html`
- `styles.css`
- `app.js`
- `data/pairings.json`

The other data files enable the Version 4.2 Admin Mode and platform architecture.

## Admin Mode

Open the site with `#admin` at the end of the URL, or press `Ctrl + Shift + A` on a keyboard.
