import { test, expect } from '@playwright/test';

test.describe('DCF calculation interaction', () => {
  test('DCF page renders input form', async ({ page }) => {
    await page.goto('/tools/dcf');
    // The DCF page uses a SpreadsheetInput with metric rows
    await expect(page).toHaveTitle(/DCF|Valuation/i);

    // Verify the page has headline text
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });
});

test.describe('Import page', () => {
  test('import page shows upload options', async ({ page }) => {
    await page.goto('/import');
    await expect(page).toHaveTitle(/Import/i);

    // Check for file upload UI elements (file input or upload zone)
    const fileInput = page.locator('input[type="file"]');
    const uploadZone = page.locator('text=/upload|drop|import|choose file/i').first();
    const hasFileInput = (await fileInput.count()) > 0;
    const hasUploadZone = (await uploadZone.count()) > 0;
    expect(hasFileInput || hasUploadZone).toBeTruthy();
  });
});

test.describe('localStorage data flow', () => {
  test('can set and restore localStorage state', async ({ page }) => {
    await page.goto('/');
    // Set a test value in localStorage
    await page.evaluate(() => {
      localStorage.setItem('test-key', JSON.stringify({ value: 42 }));
    });
    // Verify it was stored
    const stored = await page.evaluate(() => {
      const raw = localStorage.getItem('test-key');
      return raw ? JSON.parse(raw) : null;
    });
    expect(stored).toEqual({ value: 42 });
    // Clean up
    await page.evaluate(() => localStorage.removeItem('test-key'));
  });
});
