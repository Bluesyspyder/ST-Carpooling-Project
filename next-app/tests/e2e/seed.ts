// @ts-nocheck
import mongoose from 'mongoose';
import User from '../../src/modules/users/user.model';
import Vehicle from '../../src/modules/vehicles/vehicle.model';
import Ride from '../../src/modules/rides/ride.model';
import Booking from '../../src/modules/bookings/booking.model';

/**
 * All E2E fixtures share this email prefix so global-teardown can find and
 * remove exactly what this suite created, without touching real user data
 * in the shared MONGODB_URI the dev server is configured with.
 */
export const E2E_PREFIX = 'e2e-test-';

export const E2E_DRIVER_EMAIL = `${E2E_PREFIX}driver@st.com`;
export const E2E_PASSENGER_EMAIL = `${E2E_PREFIX}passenger@st.com`;
export const E2E_PASSWORD = 'e2ePassword123';

async function connect() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI is not set — cannot seed E2E fixtures.');
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
}

export async function seedE2eFixtures() {
  await connect();

  const driver = await User.create({
    firstName: 'E2E',
    lastName: 'Driver',
    email: E2E_DRIVER_EMAIL,
    password: E2E_PASSWORD,
    phone: '9000000001',
    address: 'ST Campus, Greater Noida',
    role: 'hybrid',
    isEmailVerified: true,
  });

  const passenger = await User.create({
    firstName: 'E2E',
    lastName: 'Passenger',
    email: E2E_PASSENGER_EMAIL,
    password: E2E_PASSWORD,
    phone: '9000000002',
    address: 'Sector 62, Noida',
    role: 'passenger',
    isEmailVerified: true,
  });

  const vehicle = await Vehicle.create({
    owner: driver._id,
    vehicleName: 'E2E Test Car',
    vehiclePlateNumber: `E2E${Date.now()}`,
    seatCount: 4,
    vehicleType: 'petrol',
    mileage: 18,
  });

  const journeyDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const ride = await Ride.create({
    driver: driver._id,
    driverVehicle: vehicle._id,
    journeyDate,
    journeyTime: '09:00',
    availableSeats: 3,
    pickupLocation: {
      address: 'Sector 62, Noida',
      latitude: 28.6139,
      longitude: 77.209,
      verified: true,
    },
    destinationLocation: {
      address: 'STMicroelectronics Private Limited, Plot No. 1, Knowledge Park III, Greater Noida',
      latitude: 28.4812,
      longitude: 77.4815,
      verified: true,
    },
    rideStatus: 'ACTIVE',
  });

  return { driver, passenger, vehicle, ride };
}

export async function teardownE2eFixtures() {
  await connect();

  const users = await User.find({ email: { $regex: `^${E2E_PREFIX}` } }).select('_id');
  const userIds = users.map((u) => u._id);

  const vehicles = await Vehicle.find({ owner: { $in: userIds } }).select('_id');
  const vehicleIds = vehicles.map((v) => v._id);

  const rides = await Ride.find({ driver: { $in: userIds } }).select('_id');
  const rideIds = rides.map((r) => r._id);

  await Booking.deleteMany({ $or: [{ ride: { $in: rideIds } }, { passenger: { $in: userIds } }] });
  await Ride.deleteMany({ _id: { $in: rideIds } });
  await Vehicle.deleteMany({ _id: { $in: vehicleIds } });
  await User.deleteMany({ _id: { $in: userIds } });

  await mongoose.disconnect();
}
