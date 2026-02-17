/**
 * Coordinate conversion service.
 * Traditional lat/lon stored in DB are WGS84.
 * NAD83 ≈ WGS84 (documented approximation). Interface allows precise transformation later.
 */

export interface ICoordinateService {
  wgs84ToNad83(lat: number, lon: number): { lat: number; lon: number };
}

/**
 * For now: NAD83 ≈ WGS84 (no transformation).
 * Replace implementation for precise NAD83 when needed.
 */
export const coordinateService: ICoordinateService = {
  wgs84ToNad83(lat: number, lon: number) {
    return { lat, lon };
  },
};

export function ensureNad83(lat: number, lon: number): { latitudeNad83: number; longitudeNad83: number } {
  const { lat: latNad83, lon: lonNad83 } = coordinateService.wgs84ToNad83(lat, lon);
  return { latitudeNad83: latNad83, longitudeNad83: lonNad83 };
}
