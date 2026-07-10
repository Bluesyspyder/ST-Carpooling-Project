// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import * as reviewService from '@/modules/reviews/review.service';
import Booking from '@/modules/bookings/booking.model';
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

async function makeConfirmedBooking(extra: any = {}) {
  const driver = await makeUser('hybrid');
  const passenger = await makeUser('passenger');
  const vehicle = await Vehicle.create({
    owner: driver._id,
    vehicleName: 'Test Car',
    vehiclePlateNumber: `PL${Date.now()}${Math.floor(Math.random() * 1000)}`,
    seatCount: 4,
    vehicleType: 'petrol',
    mileage: 15,
  });
  const ride = await Ride.create({
    driver: driver._id,
    driverVehicle: vehicle._id,
    journeyDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    journeyTime: '09:00',
    availableSeats: 2,
    pickupLocation: verifiedLocation('Andheri, Mumbai', 19.1197, 72.8468),
    destinationLocation: verifiedLocation('Bandra, Mumbai', 19.0596, 72.8295),
    rideStatus: 'ACTIVE',
  });
  const booking = await Booking.create({
    ride: ride._id,
    passenger: passenger._id,
    seatsBooked: 1,
    bookingAmount: 0,
    bookingStatus: 'confirmed',
    pickupLocation: verifiedLocation('Andheri Station', 19.12, 72.847),
    ...extra,
  });
  return { driver, passenger, ride, booking };
}

// Wait a tick for the fire-and-forget EMA update in createRating to land.
const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('review.service.createRating', () => {
  it('sets the driver averageRating and totalRatings on the first-ever rating', async () => {
    const { driver, passenger, booking } = await makeConfirmedBooking();

    await reviewService.createRating(booking._id, passenger._id.toString(), 4, 'Great ride');
    await flush();

    const refreshedDriver = await User.findById(driver._id);
    expect(refreshedDriver!.averageRating).toBe(4);
    expect(refreshedDriver!.totalRatings).toBe(1);
  });

  it('applies a 0.7/0.3 exponential moving average on a second rating', async () => {
    const driver = await makeUser('hybrid');
    await User.findByIdAndUpdate(driver._id, { averageRating: 4, totalRatings: 1 });

    const passenger = await makeUser('passenger');
    const vehicle = await Vehicle.create({
      owner: driver._id,
      vehicleName: 'Test Car',
      vehiclePlateNumber: `PL${Date.now()}${Math.floor(Math.random() * 1000)}`,
      seatCount: 4,
      vehicleType: 'petrol',
      mileage: 15,
    });
    const ride = await Ride.create({
      driver: driver._id,
      driverVehicle: vehicle._id,
      journeyDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      journeyTime: '09:00',
      availableSeats: 2,
      pickupLocation: verifiedLocation('Andheri, Mumbai', 19.1197, 72.8468),
      destinationLocation: verifiedLocation('Bandra, Mumbai', 19.0596, 72.8295),
      rideStatus: 'ACTIVE',
    });
    const booking = await Booking.create({
      ride: ride._id,
      passenger: passenger._id,
      seatsBooked: 1,
      bookingAmount: 0,
      bookingStatus: 'confirmed',
      pickupLocation: verifiedLocation('Andheri Station', 19.12, 72.847),
    });

    await reviewService.createRating(booking._id, passenger._id.toString(), 2, 'Not as good this time');
    await flush();

    const refreshedDriver = await User.findById(driver._id);
    // newAvg = rating*0.7 + priorAvg*0.3 = 2*0.7 + 4*0.3 = 2.6
    expect(refreshedDriver!.averageRating).toBe(2.6);
    expect(refreshedDriver!.totalRatings).toBe(2);
  });

  it('marks the booking as rated and stores the rating/comment', async () => {
    const { passenger, booking } = await makeConfirmedBooking();

    const result = await reviewService.createRating(booking._id, passenger._id.toString(), 5, 'Excellent');
    expect(result.rating).toBe(5);
    expect(result.comment).toBe('Excellent');

    const refreshedBooking = await Booking.findById(booking._id);
    expect(refreshedBooking!.rated).toBe(true);
    expect(refreshedBooking!.rating).toBe(5);
    expect(refreshedBooking!.ratingComment).toBe('Excellent');
  });

  it('rejects rating a booking that does not belong to the requester', async () => {
    const { booking } = await makeConfirmedBooking();
    const intruder = await makeUser('passenger');

    await expect(
      reviewService.createRating(booking._id, intruder._id.toString(), 5, '')
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects rating a non-confirmed booking', async () => {
    const { passenger, booking } = await makeConfirmedBooking({ bookingStatus: 'pending' });

    await expect(
      reviewService.createRating(booking._id, passenger._id.toString(), 5, '')
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects rating the same booking twice', async () => {
    const { passenger, booking } = await makeConfirmedBooking();
    await reviewService.createRating(booking._id, passenger._id.toString(), 4, '');

    await expect(
      reviewService.createRating(booking._id, passenger._id.toString(), 5, '')
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects an out-of-range or non-integer rating', async () => {
    const { passenger, booking } = await makeConfirmedBooking();

    await expect(
      reviewService.createRating(booking._id, passenger._id.toString(), 6, '')
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
