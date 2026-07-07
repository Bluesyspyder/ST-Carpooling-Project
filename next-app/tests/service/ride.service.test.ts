// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest';
import * as rideService from '@/modules/rides/ride.service';
import Ride from '@/modules/rides/ride.model';
import Vehicle from '@/modules/vehicles/vehicle.model';
import User from '@/modules/users/user.model';

async function makeDriverWithVehicle(overrides: any = {}) {
  const driver = await User.create({
    firstName: 'Driver',
    lastName: 'One',
    email: overrides.email || `driver${Date.now()}${Math.random()}@st.com`,
    password: 'password123',
    phone: '9999999999',
    address: 'Somewhere',
    role: 'hybrid',
    isEmailVerified: true,
  });
  const vehicle = await Vehicle.create({
    owner: driver._id,
    vehicleName: 'Test Car',
    vehiclePlateNumber: `PL${Date.now()}${Math.floor(Math.random() * 1000)}`,
    seatCount: overrides.seatCount ?? 4,
    vehicleType: 'petrol',
    mileage: 15,
  });
  return { driver, vehicle };
}

const verifiedLocation = (address: string, lat: number, lng: number) => ({
  address,
  latitude: lat,
  longitude: lng,
  verified: true,
});

function futureRidePayload(driverId: any, vehicleId: any, extra: any = {}) {
  const journeyDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days out
  return {
    driver: driverId,
    driverVehicle: vehicleId,
    journeyDate: journeyDate.toISOString(),
    journeyTime: '09:00',
    availableSeats: 2,
    pickupLocation: verifiedLocation('Andheri, Mumbai', 19.1197, 72.8468),
    destinationLocation: verifiedLocation('Bandra, Mumbai', 19.0596, 72.8295),
    ...extra,
  };
}

describe('ride.service.createRide', () => {
  it('creates a ride when the vehicle belongs to the driver and seats are valid', async () => {
    const { driver, vehicle } = await makeDriverWithVehicle();
    const ride = await rideService.createRide(futureRidePayload(driver._id, vehicle._id));
    expect(ride.rideStatus).toBe('ACTIVE');
    expect(ride.pickupLocation.verified).toBe(true);
  });

  it('rejects if the vehicle does not belong to the driver', async () => {
    const { vehicle } = await makeDriverWithVehicle();
    const { driver: otherDriver } = await makeDriverWithVehicle();
    await expect(
      rideService.createRide(futureRidePayload(otherDriver._id, vehicle._id))
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects if availableSeats exceeds the vehicle seat count', async () => {
    const { driver, vehicle } = await makeDriverWithVehicle({ seatCount: 2 });
    await expect(
      rideService.createRide(futureRidePayload(driver._id, vehicle._id, { availableSeats: 5 }))
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects unverified pickup locations', async () => {
    const { driver, vehicle } = await makeDriverWithVehicle();
    const payload = futureRidePayload(driver._id, vehicle._id, {
      pickupLocation: { address: 'Somewhere', latitude: 19.1, longitude: 72.8, verified: false },
    });
    await expect(rideService.createRide(payload)).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('ride.service.getRides', () => {
  it('only returns ACTIVE rides by default', async () => {
    const { driver, vehicle } = await makeDriverWithVehicle();
    const ride = await rideService.createRide(futureRidePayload(driver._id, vehicle._id));
    await Ride.findByIdAndUpdate(ride._id, { rideStatus: 'COMPLETED' });

    const results = await rideService.getRides({});
    expect(results.find((r: any) => r._id.toString() === ride._id.toString())).toBeUndefined();
  });

  it('filters by bounding box around pickupLat/pickupLng', async () => {
    const { driver, vehicle } = await makeDriverWithVehicle();
    const nearby = await rideService.createRide(futureRidePayload(driver._id, vehicle._id));
    const far = await rideService.createRide(
      futureRidePayload(driver._id, vehicle._id, {
        pickupLocation: verifiedLocation('Delhi', 28.6139, 77.209),
      })
    );

    const results = await rideService.getRides({ pickupLat: 19.1197, pickupLng: 72.8468 });
    const ids = results.map((r: any) => r._id.toString());
    expect(ids).toContain(nearby._id.toString());
    expect(ids).not.toContain(far._id.toString());
  });

  it('filters by minimum seats', async () => {
    const { driver, vehicle } = await makeDriverWithVehicle({ seatCount: 4 });
    await rideService.createRide(futureRidePayload(driver._id, vehicle._id, { availableSeats: 1 }));
    const bigRide = await rideService.createRide(futureRidePayload(driver._id, vehicle._id, { availableSeats: 3 }));

    const results = await rideService.getRides({ seats: 3 });
    const ids = results.map((r: any) => r._id.toString());
    expect(ids).toEqual([bigRide._id.toString()]);
  });

  it('returns an empty array when driverName filters out all drivers', async () => {
    const { driver, vehicle } = await makeDriverWithVehicle();
    await rideService.createRide(futureRidePayload(driver._id, vehicle._id));
    const results = await rideService.getRides({ driverName: 'NoSuchPersonXYZ' });
    expect(results).toEqual([]);
  });
});

describe('ride.service.updateRideStatus', () => {
  it('updates status when the requester is the ride owner', async () => {
    const { driver, vehicle } = await makeDriverWithVehicle();
    const ride = await rideService.createRide(futureRidePayload(driver._id, vehicle._id));
    const updated = await rideService.updateRideStatus(ride._id, driver._id.toString(), 'COMPLETED');
    expect(updated.rideStatus).toBe('COMPLETED');
  });

  it('rejects update from a non-owner driver', async () => {
    const { driver, vehicle } = await makeDriverWithVehicle();
    const { driver: otherDriver } = await makeDriverWithVehicle();
    const ride = await rideService.createRide(futureRidePayload(driver._id, vehicle._id));
    await expect(
      rideService.updateRideStatus(ride._id, otherDriver._id.toString(), 'COMPLETED')
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects an invalid status value', async () => {
    const { driver, vehicle } = await makeDriverWithVehicle();
    const ride = await rideService.createRide(futureRidePayload(driver._id, vehicle._id));
    await expect(
      rideService.updateRideStatus(ride._id, driver._id.toString(), 'BOGUS')
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
