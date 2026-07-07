import fs from 'fs';
import path from 'path';
import { seedE2eFixtures } from './seed';

export const FIXTURES_PATH = path.resolve(__dirname, '.fixtures.json');

export default async function globalSetup() {
  const { driver, passenger, vehicle, ride } = await seedE2eFixtures();
  fs.writeFileSync(
    FIXTURES_PATH,
    JSON.stringify({
      driverId: driver._id.toString(),
      passengerId: passenger._id.toString(),
      vehicleId: vehicle._id.toString(),
      rideId: ride._id.toString(),
    })
  );
}
