import { describe, it, expect } from 'vitest';
import {
  passengerSeatIds,
  generateSeatLayout,
  areValidSeatIds,
  DRIVER_SEAT_ID,
} from '@/shared/utils/seatLayout';

describe('passengerSeatIds', () => {
  it('returns an empty list for a driver-only vehicle', () => {
    expect(passengerSeatIds(0)).toEqual([]);
  });

  it('puts the single passenger seat up front', () => {
    expect(passengerSeatIds(1)).toEqual(['1A']);
  });

  it('fills front then rear rows of three', () => {
    expect(passengerSeatIds(4)).toEqual(['1A', '2A', '2B', '2C']);
    expect(passengerSeatIds(5)).toEqual(['1A', '2A', '2B', '2C', '3A']);
    expect(passengerSeatIds(7)).toEqual(['1A', '2A', '2B', '2C', '3A', '3B', '3C']);
  });

  it('never exceeds the vehicle cap of 10 and floors/coerces input', () => {
    expect(passengerSeatIds(99)).toHaveLength(10);
    expect(passengerSeatIds('4' as any)).toEqual(['1A', '2A', '2B', '2C']);
    expect(passengerSeatIds(-3)).toEqual([]);
  });
});

describe('generateSeatLayout', () => {
  it('always places the driver on the front row', () => {
    const rows = generateSeatLayout(4);
    expect(rows[0][0]).toEqual({ id: DRIVER_SEAT_ID, type: 'driver' });
    expect(rows[0][1]).toEqual({ id: '1A', type: 'seat' });
  });

  it('chunks rear seats into rows of at most three', () => {
    const rows = generateSeatLayout(5); // 1A front, 2A/2B/2C, 3A
    expect(rows).toHaveLength(3);
    expect(rows[1].map((c) => c.id)).toEqual(['2A', '2B', '2C']);
    expect(rows[2].map((c) => c.id)).toEqual(['3A']);
  });

  it('flattened seat cells match passengerSeatIds', () => {
    for (const n of [1, 2, 3, 4, 6, 8]) {
      const flat = generateSeatLayout(n)
        .flat()
        .filter((c) => c.type === 'seat')
        .map((c) => c.id);
      expect(flat).toEqual(passengerSeatIds(n));
    }
  });
});

describe('areValidSeatIds', () => {
  it('accepts a subset of real passenger seats', () => {
    expect(areValidSeatIds(['1A', '2B'], 4)).toBe(true);
  });

  it('rejects empty, unknown, driver, and duplicate ids', () => {
    expect(areValidSeatIds([], 4)).toBe(false);
    expect(areValidSeatIds(['9Z'], 4)).toBe(false);
    expect(areValidSeatIds([DRIVER_SEAT_ID], 4)).toBe(false);
    expect(areValidSeatIds(['2A', '2A'], 4)).toBe(false);
    expect(areValidSeatIds(['3A'], 4)).toBe(false); // 3A doesn't exist on a 4-seater
  });
});
