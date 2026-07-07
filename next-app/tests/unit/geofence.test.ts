import { describe, it, expect } from 'vitest';
import { isWithinOperationalBounds, OPERATIONAL_BOUNDS } from '@/lib/geofence';

describe('isWithinOperationalBounds', () => {
  it('accepts coordinates inside the India bounding box', () => {
    expect(isWithinOperationalBounds(19.076, 72.8777)).toBe(true); // Mumbai
    expect(isWithinOperationalBounds(28.6139, 77.209)).toBe(true); // Delhi
  });

  it('accepts coordinates exactly on the boundary', () => {
    expect(isWithinOperationalBounds(OPERATIONAL_BOUNDS.minLat, OPERATIONAL_BOUNDS.minLng)).toBe(true);
    expect(isWithinOperationalBounds(OPERATIONAL_BOUNDS.maxLat, OPERATIONAL_BOUNDS.maxLng)).toBe(true);
  });

  it('rejects coordinates outside the India bounding box', () => {
    expect(isWithinOperationalBounds(40.7128, -74.006)).toBe(false); // New York
    expect(isWithinOperationalBounds(51.5074, -0.1278)).toBe(false); // London
  });

  it('rejects coordinates just past the boundary', () => {
    expect(isWithinOperationalBounds(OPERATIONAL_BOUNDS.minLat - 0.01, 75)).toBe(false);
    expect(isWithinOperationalBounds(OPERATIONAL_BOUNDS.maxLat + 0.01, 75)).toBe(false);
    expect(isWithinOperationalBounds(20, OPERATIONAL_BOUNDS.minLng - 0.01)).toBe(false);
    expect(isWithinOperationalBounds(20, OPERATIONAL_BOUNDS.maxLng + 0.01)).toBe(false);
  });

  it('coerces numeric strings', () => {
    expect(isWithinOperationalBounds('19.076' as any, '72.8777' as any)).toBe(true);
  });
});
