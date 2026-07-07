/**
 * Single source of truth for the app's operational region.
 * Rides, addresses, and coordinates outside these bounds are rejected.
 * Bounds: rough India bounding box.
 */
export const OPERATIONAL_BOUNDS = {
  minLat: 6.5,
  maxLat: 35.7,
  minLng: 68.1,
  maxLng: 97.4,
};

export function isWithinOperationalBounds(lat: number, lng: number): boolean {
  const la = Number(lat);
  const lo = Number(lng);
  return (
    la >= OPERATIONAL_BOUNDS.minLat &&
    la <= OPERATIONAL_BOUNDS.maxLat &&
    lo >= OPERATIONAL_BOUNDS.minLng &&
    lo <= OPERATIONAL_BOUNDS.maxLng
  );
}
