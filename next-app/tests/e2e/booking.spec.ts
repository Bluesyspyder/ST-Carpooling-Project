import { test, expect } from '@playwright/test';
import { loginAs, mockAutocomplete, blockMapTiles, readFixtures } from './helpers';

test('passenger books a ride via the pickup autocomplete + map-confirm flow', async ({ page }) => {
  const { rideId } = readFixtures();

  await loginAs(page, 'passenger');
  await blockMapTiles(page);
  await mockAutocomplete(page, 'Sector 62, Noida, Uttar Pradesh, India', 28.6139, 77.209);

  await page.goto(`/ride-details?id=${rideId}`);

  const pickupInput = page.locator('input[placeholder="Search your pickup location…"]');
  await pickupInput.fill('Sector 62');
  await page.getByText('Sector 62, Noida, Uttar Pradesh, India').click();

  const confirmButton = page.getByRole('button', { name: 'Confirm Location' });
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();
  await expect(page.getByText('Location Verified').first()).toBeVisible();

  await page.getByRole('button', { name: 'Request Booking' }).click();

  await expect(page.getByText('Booking Requested!')).toBeVisible({ timeout: 10000 });
});
