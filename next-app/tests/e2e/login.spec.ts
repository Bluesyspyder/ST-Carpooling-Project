import { test, expect } from '@playwright/test';
import { E2E_PASSENGER_EMAIL, E2E_PASSWORD } from './seed';

test('logs in with valid credentials and redirects away from /login', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(E2E_PASSENGER_EMAIL);
  await page.locator('input[name="password"]').fill(E2E_PASSWORD);
  await page.locator('button[type="submit"]').click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).toBeTruthy();
});

test('shows an error for invalid credentials', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(E2E_PASSENGER_EMAIL);
  await page.locator('input[name="password"]').fill('wrong-password');
  await page.locator('button[type="submit"]').click();

  await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveURL(/\/login/);
});
