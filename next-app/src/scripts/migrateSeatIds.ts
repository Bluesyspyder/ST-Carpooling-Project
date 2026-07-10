/**
 * One-shot backfill: give existing count-based rides & bookings concrete seat IDs
 * so they work with the RedBus-style seat map.
 *
 * For each ride that has no `offeredSeatIds` yet:
 *   - derive the vehicle's passenger seats from `seatCount`
 *   - offer the first (availableSeats + bookedSeats) of them
 *   - assign the already-taken seats to that ride's CONFIRMED bookings in
 *     creation order, and mirror them into `bookedSeatIds`.
 *
 * Idempotent: rides that already have `offeredSeatIds` are skipped. Safe to run
 * more than once.
 *
 *   npm run migrate:seats
 */
import dbConnect from '../lib/dbConnect';
import Ride from '../modules/rides/ride.model';
import Booking from '../modules/bookings/booking.model';
import Vehicle from '../modules/vehicles/vehicle.model';
import { passengerSeatIds } from '../shared/utils/seatLayout';

async function migrateSeatIds() {
  console.log('Connecting to database...');
  await dbConnect();
  console.log('Connected.');

  const rides = await (Ride as any).find({
    $or: [{ offeredSeatIds: { $exists: false } }, { offeredSeatIds: { $size: 0 } }],
  });
  console.log(`Found ${rides.length} ride(s) without seat IDs.`);

  let migrated = 0;
  let skipped = 0;

  for (const ride of rides) {
    const vehicle = await (Vehicle as any).findById(ride.driverVehicle).select('seatCount');
    const seatCount = vehicle?.seatCount ?? ((ride.availableSeats || 0) + (ride.bookedSeats || 0));
    const allSeats = passengerSeatIds(seatCount);

    const totalOffered = Math.min(allSeats.length, (ride.availableSeats || 0) + (ride.bookedSeats || 0));
    if (totalOffered === 0) {
      skipped++;
      continue;
    }
    const offered = allSeats.slice(0, totalOffered);

    // Assign taken seats to confirmed bookings, oldest first.
    const confirmed = await (Booking as any)
      .find({ ride: ride._id, bookingStatus: 'confirmed' })
      .sort({ createdAt: 1 });

    let cursor = 0;
    const bookedSeatIds: string[] = [];
    for (const b of confirmed) {
      const n = b.seatsBooked || 1;
      const assigned = offered.slice(cursor, cursor + n);
      cursor += n;
      if (assigned.length > 0) {
        b.seatIds = assigned;
        await b.save();
        bookedSeatIds.push(...assigned);
      }
    }

    ride.offeredSeatIds = offered;
    ride.bookedSeatIds = bookedSeatIds;
    // Keep the count mirrors consistent with the derived seat sets.
    ride.availableSeats = offered.length - bookedSeatIds.length;
    ride.bookedSeats = bookedSeatIds.length;
    await ride.save();
    migrated++;
  }

  console.log(`Migration complete. migrated=${migrated} skipped=${skipped}`);
  process.exit(0);
}

migrateSeatIds().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
