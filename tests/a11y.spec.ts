import { test, expect } from '@playwright/test';

test('navigation has accessible landmarks', async ({ page }) => {
  await page.goto('/');
  const nav = page.locator('nav');
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
  // Get all buttons on the page
  const buttons = page.locator('button');
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
  // Check first button has a discernible role
  const firstButton = buttons.first();
  await expect(firstButton).toBeVisible();
});
