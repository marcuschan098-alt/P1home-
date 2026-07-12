# P1 Home Intelligence — Version 6.1

Version 6.1 adds a dedicated Coordinate Manager before distance generation.

## Coordinate Manager

- Coverage dashboard for schools, condos and residential blocks
- Missing-coordinate detection
- Failed-request queue
- Bulk queue creation
- One-at-a-time bulk geocoding
- Pause and resume
- Retry failed records
- Import schools, condos, blocks and coordinate caches
- Export coordinates, missing records and failures
- Possible duplicate-coordinate detection
- Stale-coordinate detection
- Readiness gate before distance database generation

## Important deployment note

GitHub Pages remains a static site. Browser-to-OneMap geocoding may still fail if the OneMap API blocks the request, the token is expired, or the browser rejects the cross-origin request.

Version 6.1 preserves the failed queue and allows coordinate caches to be imported, so geocoding can also be completed outside the public site and then loaded into the app.

## Admin access

Use `#admin`, the existing admin shortcut, or the hidden admin activation method. Then open **Coordinate Manager**.
