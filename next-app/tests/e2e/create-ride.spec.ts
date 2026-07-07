import { test, expect } from '@playwright/test';
import { loginAs, mockAutocomplete, blockMapTiles } from './helpers';

test('driver creates a ride via the pickup autocomplete + map-confirm flow', async ({ page }) => {
  await loginAs(page, 'driver');
  await blockMapTiles(page);
  await mockAutocomplete(page, 'Sector 18, Noida, Uttar Pradesh, India', 28.5697, 77.3261);

  await page.goto('/create-ride');

  // ── Step 1: Route & Map ──
  const pickupInput = page.locator('input[placeholder="Start typing your pickup address…"]');
  await pickupInput.fill('Sector 18');
  await page.getByText('Sector 18, Noida, Uttar Pradesh, India').click();

  const confirmButton = page.getByRole('button', { name: 'Confirm Location' });
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();
  // Destination (ST_OFFICE) is pre-verified, so "Location Verified" now
  // appears for both pickup and destination — scope to the first match.
  await expect(page.getByText('Location Verified').first()).toBeVisible();

  const continueButton = page.getByRole('button', { name: 'CONTINUE →' });
  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  // ── Step 2: Schedule & Details ──
  const journeyDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  await page.locator('#journeyDate').fill(journeyDate);
  await page.locator('#journeyTime').fill('09:30');
  await page.locator('#availableSeats').fill('2');

  await page.getByRole('button', { name: 'CONTINUE →' }).click();

  // ── Step 3: Review & Post ──
  await page.getByRole('button', { name: /POST RIDE/ }).click();

  await expect(page.getByText('Ride Posted!')).toBeVisible({ timeout: 10000 });
});
