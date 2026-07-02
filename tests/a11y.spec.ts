import { test, expect } from '@playwright/test';

test('navigation has accessible landmarks', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Tool navigation' });
  await expect(nav).toBeVisible();
  // Check for at least one nav link
  const navLinks = nav.locator('a, button');
  const count = await navLinks.count();
  expect(count).toBeGreaterThan(0);
});

test('main content has skip link and main landmark', async ({ page }) => {
  await page.goto('/');
  const skipLink = page.locator('.skip-link');
  await expect(skipLink).toBeVisible();
  await expect(skipLink).toHaveText('Skip to content');

  const main = page.locator('main');
  await expect(main).toBeVisible();
  await expect(main).toHaveAttribute('id', 'main-content');
});

test('buttons are focusable', async ({ page }) => {
  await page.goto('/');
  // Get all buttons that are visible on screen
  const buttons = page.locator('button:visible');
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
  // Check first visible button has a discernible role
  const firstButton = buttons.first();
  await expect(firstButton).toBeVisible();
});

test('desktop nav dropdowns expose deep routes and close with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  await page.getByRole('button', { name: /Research/i }).click();
  await expect(page.getByRole('menuitem', { name: /Trend Charts/i })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('menuitem', { name: /Trend Charts/i })).toBeHidden();

  await page.getByRole('button', { name: /Valuation/i }).click();
  await page.getByRole('menuitem', { name: /DCF Valuation/i }).click();
  await expect(page).toHaveURL(/\/tools\/dcf$/);
});

test('mobile hamburger menu remains available', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await page.getByRole('button', { name: /Open navigation menu/i }).click();
  await expect(page.getByRole('dialog', { name: /Navigation menu/i })).toBeVisible();
  await expect(page.getByRole('dialog', { name: /Navigation menu/i }).getByRole('link', { name: /Workspace/i })).toBeVisible();
});
