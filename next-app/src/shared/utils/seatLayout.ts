// @ts-nocheck
/**
 * Seat-layout utilities — the single source of truth for turning a vehicle's
 * `seatCount` into a concrete, labelled car seat map.
 *
 * Isomorphic on purpose: this module has NO server-only imports so it can be
 * used by the Mongoose services (to validate submitted seat IDs) AND by the
 * client `SeatMap` component (to render the grid). Both sides therefore always
 * agree on which seat IDs exist for a given vehicle.
 *
 * Convention: `seatCount` is the number of PASSENGER seats (matching the rest of
 * the app, where `Ride.availableSeats` — a passenger count — is capped at
 * `Vehicle.seatCount`). The driver's seat is rendered for realism but is never a
 * bookable/offerable seat and is never counted.
 *
 * Labels: the front passenger seat is `1A`; rear seats fill rows of up to three
 * as `2A 2B 2C`, `3A 3B 3C`, … The driver cell uses the sentinel id `'D'`.
 */

export const DRIVER_SEAT_ID = 'D';

const REAR_COLUMNS = ['A', 'B', 'C'];

const clampSeatCount = (seatCount) =>
  Math.max(0, Math.min(10, Math.floor(Number(seatCount) || 0)));

/**
 * Ordered list of every valid passenger seat id for a vehicle of `seatCount`
 * passenger seats — e.g. seatCount 5 → ['1A', '2A', '2B', '2C', '3A'].
 * @param {number} seatCount
 * @returns {string[]}
 */
export function passengerSeatIds(seatCount) {
  const n = clampSeatCount(seatCount);
  const ids = [];
  if (n >= 1) ids.push('1A'); // front passenger seat

  let remaining = n - 1; // the rest fill rear rows
  let row = 2;
  while (remaining > 0) {
    const inThisRow = Math.min(REAR_COLUMNS.length, remaining);
    for (let c = 0; c < inThisRow; c += 1) {
      ids.push(`${row}${REAR_COLUMNS[c]}`);
    }
    remaining -= inThisRow;
    row += 1;
  }
  return ids;
}

/**
 * Grid representation for rendering a top-down car map. Each row is an array of
 * cells `{ id, type }` where type is 'driver' | 'seat'. Row 0 is the front row
 * ([Driver][1A]); subsequent rows hold up to three passenger seats each.
 * @param {number} seatCount
 * @returns {Array<Array<{ id: string, type: 'driver' | 'seat' }>>}
 */
export function generateSeatLayout(seatCount) {
  const ids = passengerSeatIds(seatCount);
  const rows = [];

  // Front row: passenger on the left, driver on the right (RHD).
  const front = [];
  if (ids.length >= 1) front.push({ id: ids[0], type: 'seat' });
  front.push({ id: DRIVER_SEAT_ID, type: 'driver' });
  rows.push(front);

  // Rear rows: chunk the remaining passenger seats into groups of three.
  for (let i = 1; i < ids.length; i += REAR_COLUMNS.length) {
    rows.push(ids.slice(i, i + REAR_COLUMNS.length).map((id) => ({ id, type: 'seat' })));
  }

  return rows;
}

/**
 * True when every id in `seatIds` is a valid passenger seat for `seatCount`,
 * the list is non-empty, and has no duplicates. Used server-side to validate
 * client-submitted seat selections.
 * @param {string[]} seatIds
 * @param {number} seatCount
 * @returns {boolean}
 */
export function areValidSeatIds(seatIds, seatCount) {
  if (!Array.isArray(seatIds) || seatIds.length === 0) return false;
  if (new Set(seatIds).size !== seatIds.length) return false; // no duplicates
  const valid = new Set(passengerSeatIds(seatCount));
  return seatIds.every((id) => valid.has(id));
}
