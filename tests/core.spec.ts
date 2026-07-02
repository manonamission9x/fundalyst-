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

test.describe('Workspace resilience', () => {
  test('loads when persisted Fundalyst state has malformed shapes', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('fundalyst-enterprise', JSON.stringify({
        state: {
          projects: null,
          members: {},
          auditEvents: 'not-an-array',
          versions: null,
          integrations: false,
          activeProjectId: 'missing-project',
        },
        version: 1,
      }));
      localStorage.setItem('fundalyst-global-data', JSON.stringify({
        state: {
          datasets: null,
          activeDatasetId: 'missing-dataset',
        },
        version: 0,
      }));
      localStorage.setItem('fundalyst-importer', JSON.stringify({
        state: {
          savedMappings: [],
          lastDataset: { companyName: 'Broken Persisted Dataset' },
        },
        version: 0,
      }));
    });

    await page.goto('/workspace');
    await expect(page).toHaveTitle(/Workspace/i);
    await expect(page.locator('.workspace-brand')).toBeVisible();
    // Page loads without crashing despite malformed localStorage state
    await expect(page.locator('.workspace').first()).toBeVisible();
  });
});
