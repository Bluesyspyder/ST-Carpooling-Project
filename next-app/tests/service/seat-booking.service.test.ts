// @ts-nocheck
import { describe, it, expect } from 'vitest';
import * as bookingService from '@/modules/bookings/booking.service';
import * as rideService from '@/modules/rides/ride.service';
import Ride from '@/modules/rides/ride.model';
import Vehicle from '@/modules/vehicles/vehicle.model';
import User from '@/modules/users/user.model';

async function makeUser(role: string) {
  return User.create({
    firstName: 'Test',
    lastName: 'User',
    email: `user${Date.now()}${Math.random()}@st.com`,
    password: 'password123',
    phone: '9999999999',
    address: 'Somewhere',
    role,
    isEmailVerified: true,
  });
}

const verifiedLocation = (address: string, lat: number, lng: number) => ({
  address,
  latitude: lat,
  longitude: lng,
  verified: true,
});

/** A ride offering specific seat IDs, created directly so tests stay fast. */
async function makeSeatRide(offeredSeatIds: string[], seatCount = 4) {
  const driver = await makeUser('hybrid');
  const vehicle = await Vehicle.create({
    owner: driver._id,
    vehicleName: 'Test Car',
    vehiclePlateNumber: `PL${Date.now()}${Math.floor(Math.random() * 10000)}`,
    seatCount,
    vehicleType: 'petrol',
    mileage: 15,
  });
  const ride = await Ride.create({
    driver: driver._id,
    driverVehicle: vehicle._id,
    journeyDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    journeyTime: '09:00',
    availableSeats: offeredSeatIds.length,
    offeredSeatIds,
    bookedSeatIds: [],
    pickupLocation: verifiedLocation('Andheri, Mumbai', 19.1197, 72.8468),
    destinationLocation: verifiedLocation('Bandra, Mumbai', 19.0596, 72.8295),
    rideStatus: 'ACTIVE',
  });
  return { driver, vehicle, ride };
}

function seatBooking(rideId: any, passengerId: any, seatIds: string[]) {
  return {
    ride: rideId,
    passenger: passengerId,
    seatIds,
    pickupLocation: verifiedLocation('Andheri Station', 19.12, 72.847),
  };
}

describe('createRide — seat-ID mode', () => {
  it('stores offeredSeatIds and derives availableSeats from them', async () => {
    const driver = await makeUser('hybrid');
    const vehicle = await Vehicle.create({
      owner: driver._id,
      vehicleName: 'Car',
      vehiclePlateNumber: `PL${Date.now()}${Math.floor(Math.random() * 10000)}`,
      seatCount: 4,
      vehicleType: 'petrol',
      mileage: 15,
    });
    const ride = await rideService.createRide({
      driver: driver._id,
      driverVehicle: vehicle._id,
      journeyDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      journeyTime: '09:00',
      offeredSeatIds: ['1A', '2B'],
      pickupLocation: verifiedLocation('Andheri, Mumbai', 19.1197, 72.8468),
      destinationLocation: verifiedLocation('Bandra, Mumbai', 19.0596, 72.8295),
    });
    expect(ride.offeredSeatIds).toEqual(['1A', '2B']);
    expect(ride.availableSeats).toBe(2);
    expect(ride.bookedSeatIds).toEqual([]);
  });

  it('rejects seat IDs that are not valid for the vehicle', async () => {
    const driver = await makeUser('hybrid');
    const vehicle = await Vehicle.create({
      owner: driver._id,
      vehicleName: 'Car',
      vehiclePlateNumber: `PL${Date.now()}${Math.floor(Math.random() * 10000)}`,
      seatCount: 2, // only 1A, 2A exist
      vehicleType: 'petrol',
      mileage: 15,
    });
    await expect(
      rideService.createRide({
        driver: driver._id,
        driverVehicle: vehicle._id,
        journeyDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        journeyTime: '09:00',
        offeredSeatIds: ['3C'],
        pickupLocation: verifiedLocation('Andheri, Mumbai', 19.1197, 72.8468),
        destinationLocation: verifiedLocation('Bandra, Mumbai', 19.0596, 72.8295),
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('createBooking — seat-ID mode', () => {
  it('books the selected seats and mirrors the count', async () => {
    const { ride } = await makeSeatRide(['1A', '2A', '2B']);
    const passenger = await makeUser('passenger');
    const booking = await bookingService.createBooking(seatBooking(ride._id, passenger._id, ['2A', '2B']));
    expect(booking.seatIds).toEqual(['2A', '2B']);
    expect(booking.seatsBooked).toBe(2);
    expect(booking.bookingStatus).toBe('pending');
  });

  it('rejects seats the ride does not offer', async () => {
    const { ride } = await makeSeatRide(['1A', '2A']);
    const passenger = await makeUser('passenger');
    await expect(
      bookingService.createBooking(seatBooking(ride._id, passenger._id, ['2B']))
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects a seat that is already confirmed-booked', async () => {
    const { ride } = await makeSeatRide(['1A', '2A']);
    // Simulate 2A already reserved by a confirmed booking.
    await Ride.findByIdAndUpdate(ride._id, {
      $set: { bookedSeatIds: ['2A'], availableSeats: 1, bookedSeats: 1 },
    });
    const passenger = await makeUser('passenger');
    await expect(
      bookingService.createBooking(seatBooking(ride._id, passenger._id, ['2A']))
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('updateBookingStatus — seat-ID confirm', () => {
  it('reserves the exact seats on confirm', async () => {
    const { ride, driver } = await makeSeatRide(['1A', '2A', '2B']);
    const passenger = await makeUser('passenger');
    const booking = await bookingService.createBooking(seatBooking(ride._id, passenger._id, ['2A']));

    const updated = await bookingService.updateBookingStatus(booking._id, driver._id.toString(), 'confirmed');
    expect(updated.bookingStatus).toBe('confirmed');

    const refreshed = await Ride.findById(ride._id);
    expect(refreshed!.bookedSeatIds).toContain('2A');
    expect(refreshed!.availableSeats).toBe(2);
  });

  it('prevents double-booking the same seat under concurrent confirms', async () => {
    // Two passengers both request seat 2A; the driver confirms both at once.
    const { ride, driver } = await makeSeatRide(['1A', '2A', '2B']);
    const p1 = await makeUser('passenger');
    const p2 = await makeUser('passenger');
    const b1 = await bookingService.createBooking(seatBooking(ride._id, p1._id, ['2A']));
    const b2 = await bookingService.createBooking(seatBooking(ride._id, p2._id, ['2A']));

    const results = await Promise.allSettled([
      bookingService.updateBookingStatus(b1._id, driver._id.toString(), 'confirmed'),
      bookingService.updateBookingStatus(b2._id, driver._id.toString(), 'confirmed'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({ statusCode: 409 });

    // Seat 2A booked exactly once — no duplicate in the array.
    const refreshed = await Ride.findById(ride._id);
    expect(refreshed!.bookedSeatIds.filter((s: string) => s === '2A')).toHaveLength(1);
    expect(refreshed!.availableSeats).toBe(2);
  });
});
