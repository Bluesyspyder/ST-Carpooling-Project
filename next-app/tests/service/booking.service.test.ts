// @ts-nocheck
import { describe, it, expect } from 'vitest';
import * as bookingService from '@/modules/bookings/booking.service';
import Ride from '@/modules/rides/ride.model';
import Vehicle from '@/modules/vehicles/vehicle.model';
import User from '@/modules/users/user.model';

async function makeUser(role: string, overrides: any = {}) {
  return User.create({
    firstName: 'Test',
    lastName: 'User',
    email: overrides.email || `user${Date.now()}${Math.random()}@st.com`,
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

async function makeActiveRide(daysOut: number, extra: any = {}) {
  const driver = await makeUser('hybrid');
  const vehicle = await Vehicle.create({
    owner: driver._id,
    vehicleName: 'Test Car',
    vehiclePlateNumber: `PL${Date.now()}${Math.floor(Math.random() * 1000)}`,
    seatCount: extra.seatCount ?? 4,
    vehicleType: 'petrol',
    mileage: 15,
  });
  const journeyDate = new Date(Date.now() + daysOut * 24 * 60 * 60 * 1000);
  const ride = await Ride.create({
    driver: driver._id,
    driverVehicle: vehicle._id,
    journeyDate,
    journeyTime: '09:00',
    availableSeats: extra.availableSeats ?? 2,
    pickupLocation: verifiedLocation('Andheri, Mumbai', 19.1197, 72.8468),
    destinationLocation: verifiedLocation('Bandra, Mumbai', 19.0596, 72.8295),
    rideStatus: extra.rideStatus ?? 'ACTIVE',
  });
  return { driver, vehicle, ride };
}

function bookingPayload(rideId: any, passengerId: any, extra: any = {}) {
  return {
    ride: rideId,
    passenger: passengerId,
    seatsBooked: 1,
    pickupLocation: verifiedLocation('Andheri Station', 19.12, 72.847),
    ...extra,
  };
}

describe('booking.service.createBooking', () => {
  it('creates a pending booking for a valid future ride', async () => {
    const { ride } = await makeActiveRide(3);
    const passenger = await makeUser('passenger');
    const booking = await bookingService.createBooking(bookingPayload(ride._id, passenger._id));
    expect(booking.bookingStatus).toBe('pending');
  });

  it('waitlists a booking that exceeds available seats', async () => {
    const { ride } = await makeActiveRide(3, { availableSeats: 1 });
    const passenger = await makeUser('passenger');
    const booking = await bookingService.createBooking(bookingPayload(ride._id, passenger._id, { seatsBooked: 2 }));
    expect(booking.bookingStatus).toBe('waitlisted');
  });

  it('rejects booking your own ride', async () => {
    const { ride, driver } = await makeActiveRide(3);
    await expect(
      bookingService.createBooking(bookingPayload(ride._id, driver._id))
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects booking a non-ACTIVE ride', async () => {
    const { ride } = await makeActiveRide(3, { rideStatus: 'CANCELLED' });
    const passenger = await makeUser('passenger');
    await expect(
      bookingService.createBooking(bookingPayload(ride._id, passenger._id))
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects booking within the 12-hour departure cutoff', async () => {
    const { ride } = await makeActiveRide(0.1); // ~2.4 hours out
    const passenger = await makeUser('passenger');
    await expect(
      bookingService.createBooking(bookingPayload(ride._id, passenger._id))
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects unverified pickup locations', async () => {
    const { ride } = await makeActiveRide(3);
    const passenger = await makeUser('passenger');
    await expect(
      bookingService.createBooking(
        bookingPayload(ride._id, passenger._id, {
          pickupLocation: { address: 'X', latitude: 19.1, longitude: 72.8, verified: false },
        })
      )
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('booking.service.updateBookingStatus', () => {
  it('confirms a pending booking and decrements ride seats', async () => {
    const { ride, driver } = await makeActiveRide(3, { availableSeats: 2 });
    const passenger = await makeUser('passenger');
    const booking = await bookingService.createBooking(bookingPayload(ride._id, passenger._id, { seatsBooked: 2 }));

    const updated = await bookingService.updateBookingStatus(booking._id, driver._id.toString(), 'confirmed');
    expect(updated.bookingStatus).toBe('confirmed');

    const refreshedRide = await Ride.findById(ride._id);
    expect(refreshedRide!.availableSeats).toBe(0);
  });

  it('rejects confirming when insufficient seats remain', async () => {
    const { ride, driver } = await makeActiveRide(3, { availableSeats: 1 });
    const passenger = await makeUser('passenger');
    const booking = await bookingService.createBooking(bookingPayload(ride._id, passenger._id, { seatsBooked: 1 }));
    // Manually drop ride seats to 0 to simulate a race with another confirmed booking.
    await Ride.findByIdAndUpdate(ride._id, { availableSeats: 0 });

    await expect(
      bookingService.updateBookingStatus(booking._id, driver._id.toString(), 'confirmed')
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects status updates from a non-owner driver', async () => {
    const { ride } = await makeActiveRide(3);
    const passenger = await makeUser('passenger');
    const { driver: otherDriver } = await makeActiveRide(3);
    const booking = await bookingService.createBooking(bookingPayload(ride._id, passenger._id));

    await expect(
      bookingService.updateBookingStatus(booking._id, otherDriver._id.toString(), 'confirmed')
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('restores ride seats when cancelling a confirmed booking', async () => {
    const { ride, driver } = await makeActiveRide(3, { availableSeats: 2 });
    const passenger = await makeUser('passenger');
    const booking = await bookingService.createBooking(bookingPayload(ride._id, passenger._id, { seatsBooked: 1 }));
    await bookingService.updateBookingStatus(booking._id, driver._id.toString(), 'confirmed');

    await bookingService.updateBookingStatus(booking._id, driver._id.toString(), 'cancelled');
    const refreshedRide = await Ride.findById(ride._id);
    expect(refreshedRide!.availableSeats).toBe(2);
  });
});

describe('booking.service.cancelBooking', () => {
  it('lets a passenger cancel their own pending booking', async () => {
    const { ride } = await makeActiveRide(3);
    const passenger = await makeUser('passenger');
    const booking = await bookingService.createBooking(bookingPayload(ride._id, passenger._id));

    const { booking: cancelled } = await bookingService.cancelBooking(booking._id, passenger._id.toString());
    expect(cancelled.bookingStatus).toBe('cancelled');
  });

  it('rejects cancelling an already-cancelled booking', async () => {
    const { ride } = await makeActiveRide(3);
    const passenger = await makeUser('passenger');
    const booking = await bookingService.createBooking(bookingPayload(ride._id, passenger._id));
    await bookingService.cancelBooking(booking._id, passenger._id.toString());

    await expect(
      bookingService.cancelBooking(booking._id, passenger._id.toString())
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects cancelling a booking that does not belong to the requester', async () => {
    const { ride } = await makeActiveRide(3);
    const passenger = await makeUser('passenger');
    const intruder = await makeUser('passenger');
    const booking = await bookingService.createBooking(bookingPayload(ride._id, passenger._id));

    await expect(
      bookingService.cancelBooking(booking._id, intruder._id.toString())
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('restores ride seats when cancelling a confirmed booking', async () => {
    const { ride, driver } = await makeActiveRide(3, { availableSeats: 2 });
    const passenger = await makeUser('passenger');
    const booking = await bookingService.createBooking(bookingPayload(ride._id, passenger._id, { seatsBooked: 2 }));
    await bookingService.updateBookingStatus(booking._id, driver._id.toString(), 'confirmed');

    await bookingService.cancelBooking(booking._id, passenger._id.toString());
    const refreshedRide = await Ride.findById(ride._id);
    expect(refreshedRide!.availableSeats).toBe(2);
  });
});
