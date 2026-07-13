# P1 Home Intelligence — Version 12.2

This release must be deployed as a **full `public-app` replacement**.

## Fixed

- All visible version labels now show **V12.2**.
- CSS and JavaScript cache keys are both **12.2.0**.
- Filter dropdowns cannot overflow underneath the map.
- Two-column filters collapse at narrower desktop widths.
- The map is constrained to OneMap's Singapore coverage to prevent the blank grey band.
- The Report button is explicitly wired and the report opens above all other drawers.
- Compare and Shortlist save full item snapshots.
- A Compare count of 2 now renders two cards, even if a generated result is no longer in the current filter set.
- Stale unusable IDs are removed from the count automatically.

## Deployment

Do not upload only three individual files this time.

1. Delete or replace the current repository files.
2. Upload **all contents inside `public-app/`** from this package.
3. Preserve the folder structure, especially `data/`.
4. Commit the changes.
5. Open the site and use `Ctrl + F5`.

The complete replacement prevents old V10 HTML or CSS references from surviving.
