// @ts-nocheck
import { describe, it, expect } from 'vitest';
import * as vehicleService from '@/modules/vehicles/vehicle.service';
import Vehicle from '@/modules/vehicles/vehicle.model';
import Ride from '@/modules/rides/ride.model';
import User from '@/modules/users/user.model';

async function makeUser(overrides: any = {}) {
  return User.create({
    firstName: 'Test',
    lastName: 'User',
    email: overrides.email || `user${Date.now()}${Math.random()}@st.com`,
    password: 'password123',
    phone: '9999999999',
    address: 'Somewhere',
    role: overrides.role || 'passenger',
    isEmailVerified: true,
  });
}

function vehiclePayload(extra: any = {}) {
  return {
    vehicleName: 'Test Car',
    vehiclePlateNumber: `PL${Date.now()}${Math.floor(Math.random() * 1000)}`,
    vehicleType: 'petrol',
    mileage: 15,
    seatCount: 4,
    ...extra,
  };
}

const verifiedLocation = (address: string, lat: number, lng: number) => ({
  address,
  latitude: lat,
  longitude: lng,
  verified: true,
});

async function makeActiveRide(driverId: any, vehicleId: any) {
  return Ride.create({
    driver: driverId,
    driverVehicle: vehicleId,
    journeyDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    journeyTime: '09:00',
    availableSeats: 2,
    pickupLocation: verifiedLocation('Andheri, Mumbai', 19.1197, 72.8468),
    destinationLocation: verifiedLocation('Bandra, Mumbai', 19.0596, 72.8295),
    rideStatus: 'ACTIVE',
  });
}

describe('vehicle.service.createVehicle', () => {
  it('stores owner + fields correctly for a hybrid user without promoting', async () => {
    const owner = await makeUser({ role: 'hybrid' });
    const { vehicle, user } = await vehicleService.createVehicle(owner._id.toString(), vehiclePayload());

    expect(vehicle.owner.toString()).toBe(owner._id.toString());
    expect(vehicle.vehicleName).toBe('Test Car');
    expect(user).toBeNull();
  });

  it('promotes a passenger to hybrid on their first vehicle and returns the updated user', async () => {
    const owner = await makeUser({ role: 'passenger' });
    const { vehicle, user } = await vehicleService.createVehicle(owner._id.toString(), vehiclePayload());

    expect(vehicle.owner.toString()).toBe(owner._id.toString());
    expect(user).not.toBeNull();
    expect(user.role).toBe('hybrid');

    const reloaded = await User.findById(owner._id);
    expect(reloaded.role).toBe('hybrid');
  });
});

describe('vehicle.service.updateVehicle', () => {
  it('rejects a non-owner with 403', async () => {
    const owner = await makeUser({ role: 'hybrid' });
    const stranger = await makeUser({ role: 'hybrid' });
    const vehicle = await Vehicle.create({ ...vehiclePayload(), owner: owner._id });

    await expect(
      vehicleService.updateVehicle(vehicle._id.toString(), stranger._id.toString(), { vehicleName: 'Hacked' })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('vehicle.service.deleteVehicle', () => {
  it('succeeds when no active ride references the vehicle', async () => {
    const owner = await makeUser({ role: 'hybrid' });
    const vehicle = await Vehicle.create({ ...vehiclePayload(), owner: owner._id });

    await vehicleService.deleteVehicle(vehicle._id.toString(), owner._id.toString());

    const found = await Vehicle.findById(vehicle._id);
    expect(found).toBeNull();
  });

  it('rejects with 409 when an ACTIVE ride references the vehicle', async () => {
    const owner = await makeUser({ role: 'hybrid' });
    const vehicle = await Vehicle.create({ ...vehiclePayload(), owner: owner._id });
    await makeActiveRide(owner._id, vehicle._id);

    await expect(
      vehicleService.deleteVehicle(vehicle._id.toString(), owner._id.toString())
    ).rejects.toMatchObject({ statusCode: 409 });

    const stillExists = await Vehicle.findById(vehicle._id);
    expect(stillExists).not.toBeNull();
  });
});
