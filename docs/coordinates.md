# Coordinates: NAD83 and WGS84

## Stored1 coordinates

- **latitude / longitude** – Treated as **WGS84** (decimal degrees).
- **latitudeNad83 / longitudeNad83** – Stored for every site and always populated (create and update, including import).

## Current behavior: NAD83 ≈ WGS84

For now, NAD83 is treated as equivalent to WGS84: no transformation is applied. Values are copied:

- `latitudeNad83 = latitude`
- `longitudeNad83 = longitude`

This is documented as an approximation suitable for many use cases. When stricter NAD83 is required, the conversion can be replaced without changing the rest of the app.

## Conversion interface

The API uses a small coordinate service in `apps/api/src/services/coordinates.ts`:

- **ICoordinateService** – defines `wgs84ToNad83(lat, lon)` returning `{ lat, lon }`.
- **coordinateService** – current implementation: returns the same lat/lon (no-op).
- **ensureNad83(lat, lon)** – helper that returns `{ latitudeNad83, longitudeNad83 }` using the service.

## Extending to real NAD83

To add a real WGS84 → NAD83 transformation:

1. Implement or integrate a conversion (e.g. grid shift or library that applies NAD83 corrections).
2. Replace the implementation of `wgs84ToNad83` in `coordinateService` with one that calls that conversion.
3. Keep the same interface so callers (site create/update and import) do not need to change.
4. Optionally add configuration (e.g. region or datum) if the conversion depends on it.

No change is required to the database schema or to the frontend; the API continues to accept and return WGS84 lat/lon and to compute and store NAD83 via the service.
