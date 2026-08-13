// ---------------------------------------------------------------------------
// Straight-line ("as the crow flies") distance between two lat/lng points,
// used to match a collector's service radius against a pickup's location.
// Good enough for "is this pickup roughly within my coverage area?" — not
// meant for turn-by-turn routing (the app already uses Google's Directions
// API for that, in components/Map.tsx).
// ---------------------------------------------------------------------------

const EARTH_RADIUS_KM = 6371;

export interface LatLng {
  lat: number;
  lng: number;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Haversine great-circle distance between two points, in kilometers. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const centralAngle = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_KM * centralAngle;
}

/** True if `point` falls within `radiusKm` of `center`. */
export function isWithinRadiusKm(point: LatLng, center: LatLng, radiusKm: number): boolean {
  if (radiusKm <= 0) return false;
  return distanceKm(point, center) <= radiusKm;
}
