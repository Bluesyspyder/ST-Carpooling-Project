import { Page, expect } from '@playwright/test';
import fs from 'fs';
import { FIXTURES_PATH } from './global-setup';
import { E2E_DRIVER_EMAIL, E2E_PASSENGER_EMAIL, E2E_PASSWORD } from './seed';

export function readFixtures() {
  return JSON.parse(fs.readFileSync(FIXTURES_PATH, 'utf-8')) as {
    driverId: string;
    passengerId: string;
    vehicleId: string;
    rideId: string;
  };
}

export async function loginAs(page: Page, role: 'driver' | 'passenger') {
  const email = role === 'driver' ? E2E_DRIVER_EMAIL : E2E_PASSENGER_EMAIL;
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(E2E_PASSWORD);
  await page.locator('button[type="submit"]').click();
  // Generous timeout: the very first request of a test run can hit a cold
  // Turbopack dev compile of shared auth/layout chunks, taking well over 10s.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 30000 });
}

/** Blocks live Ola Maps tile image requests — irrelevant to test assertions, only slows things down. */
export async function blockMapTiles(page: Page) {
  await page.route('https://api.olamaps.io/tiles/**', (route) => route.abort());
}

/**
 * Mocks the app's own /api/v1/locations/autocomplete route so tests never
 * depend on the live Ola Maps API. Returns a single verified suggestion for
 * any query, with the given coordinates baked in.
 */
export async function mockAutocomplete(page: Page, address: string, lat: number, lng: number) {
  await page.route('**/api/v1/locations/autocomplete**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: [
          {
            address,
            latitude: lat,
            longitude: lng,
            provider: 'Ola Maps',
            providerPlaceId: 'e2e-mock-place-id',
          },
        ],
      }),
    });
  });

  await page.route('**/api/v1/locations/reverse-geocode**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        data: { address, latitude: lat, longitude: lng, provider: 'Ola Maps' },
      }),
    });
  });
}
