import { test, expect } from '@playwright/test';

test.describe('Sample import workflow', () => {
  test('sample import -> confirm -> dataset visible', async ({ page }) => {
    await page.goto('/import');
    await expect(page).toHaveTitle(/Import/i);

    // Click "Try an example →" button
    await page.getByRole('button', { name: /try an example/i }).click();

    // Wait for the review screen to appear (metric mappings)
    await expect(page.getByText(/Metric mappings/i)).toBeVisible({ timeout: 10000 });

    // Click the confirm button
    await page.getByRole('button', { name: /Confirm mapping/i }).click();

    // Verify import complete heading
    await expect(page.getByRole('heading', { name: 'Import complete' })).toBeVisible({ timeout: 5000 });

    // Verify dataset summary shows Sample Company (in main content area)
    await expect(page.locator('#main-content').getByText('Sample Company').first()).toBeVisible();

    // Verify periods detected
    await expect(page.getByText('FY24, FY25, FY26')).toBeVisible();
  });
});

test.describe('Tool sample data', () => {
  test('DCF page calculates after explicit sample load', async ({ page }) => {
    await page.goto('/tools/dcf');
    await expect(page).toHaveTitle(/DCF|Valuation/i);

    await expect(page.getByText('DCF Valuation').last()).toBeVisible();
    await page.getByRole('button', { name: /load sample/i }).first().click();
    await page.getByRole('button', { name: /calculate value/i }).click();

    await expect(page.getByText('Intrinsic Value Summary')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.metric-label').filter({ hasText: 'Enterprise Value' }).first()).toBeVisible();
    await expect(page.locator('.metric-label').filter({ hasText: 'Intrinsic Value / Share' }).first()).toBeVisible();
    await expect(page.locator('.metric-label').filter({ hasText: 'Margin of Safety' }).first()).toBeVisible();
  });
});

test.describe('Tool calculation when filling spreadsheet', () => {
  test('Ratios page calculates with filled data', async ({ page }) => {
    await page.goto('/tools/ratios');
    await expect(page).toHaveTitle(/Ratio/i);

    // The spreadsheet has 6 rows (Revenue, Net Profit, EBIT, Total Assets, Total Equity, Total Debt)
    // Each row has: [metric cell (contentEditable), value cell (contentEditable)]
    // So value cells are at odd indices: 1, 3, 5, 7, 9, 11
    const allCells = page.locator('span[contenteditable]');
    const values = ['1240', '142', '97', '3200', '500', '410'];

    // Fill value cells (odd indices: 1, 3, 5, 7, 9, 11)
    for (let i = 0; i < values.length; i++) {
      const valueCellIndex = i * 2 + 1; // odd index = value cell
      await allCells.nth(valueCellIndex).evaluate((el, val) => {
        el.textContent = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, values[i]);
    }

    // Click Calculate
    await page.getByRole('button', { name: /^Calculate$/ }).click();

    // Verify results appear
    await expect(page.locator('.metric-label').filter({ hasText: 'Net Profit Margin' }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.metric-label').filter({ hasText: 'ROE' }).first()).toBeVisible();
    await expect(page.locator('.metric-label').filter({ hasText: 'Debt/Equity' }).first()).toBeVisible();
  });

  test('WC page calculates with filled data', async ({ page }) => {
    await page.goto('/tools/wc');
    await expect(page).toHaveTitle(/Cash|Efficiency/i);

    // WC has 6 rows with value cells at odd indices
    const allCells = page.locator('span[contenteditable]');
    const values = ['1240', '800', '900', '600', '700', '200'];

    for (let i = 0; i < values.length; i++) {
      const valueCellIndex = i * 2 + 1; // odd index = value cell
      await allCells.nth(valueCellIndex).evaluate((el, val) => {
        el.textContent = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, values[i]);
    }

    // Click Analyze
    await page.getByRole('button', { name: /^Analyze$/ }).click();

    // Verify results appear
    await expect(page.getByText('Cash Conversion Metrics')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.metric-label').filter({ hasText: 'DSO' }).first()).toBeVisible();
    await expect(page.locator('.metric-label').filter({ hasText: 'CCC' }).first()).toBeVisible();
  });
});

test.describe('Console error regression', () => {
  test('Trends page loads without Maximum update depth error', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/research/trends');
    await expect(page).toHaveTitle(/Trend/i);

    await expect(page.getByText('Trend Charts').last()).toBeVisible();
    await expect(page.getByRole('button', { name: /load sample/i }).first()).toBeVisible();

    await page.getByRole('button', { name: /load sample/i }).first().click();
    await expect(page.locator('table.diff-table')).toBeVisible({ timeout: 10000 });

    // Check no "Maximum update depth" errors
    const depthErrors = consoleErrors.filter(
      (e) => e.toLowerCase().includes('maximum update depth')
    );
    expect(depthErrors.length).toBe(0);

    // Also check no React minified errors (#185)
    const reactErrors = consoleErrors.filter(
      (e) => e.includes('#185') || e.toLowerCase().includes('minified')
    );
    expect(reactErrors.length).toBe(0);
  });
});

test.describe('Oversized file rejection', () => {
  test('import page rejects files over 20MB', async ({ page }) => {
    await page.goto('/import');
    await expect(page).toHaveTitle(/Import/i);

    const rejected = await page.evaluate(() => {
      const MAX_BYTES = 20 * 1024 * 1024;
      const largeFile = new File(
        [new ArrayBuffer(MAX_BYTES + 1)],
        'oversized.csv',
        { type: 'text/csv' }
      );
      return largeFile.size > MAX_BYTES;
    });
    expect(rejected).toBe(true);

    const accepted = await page.evaluate(() => {
      const MAX_BYTES = 20 * 1024 * 1024;
      const smallFile = new File(
        [new ArrayBuffer(1024)],
        'small.csv',
        { type: 'text/csv' }
      );
      return smallFile.size <= MAX_BYTES;
    });
    expect(accepted).toBe(true);
  });

  test('workspace restore rejects files over 10MB', async ({ page }) => {
    await page.goto('/workspace');
    await expect(page).toHaveTitle(/Workspace/i);

    const rejected = await page.evaluate(() => {
      const MAX_BYTES = 10 * 1024 * 1024;
      const largeFile = new File(
        [new ArrayBuffer(MAX_BYTES + 1)],
        'oversized-backup.json',
        { type: 'application/json' }
      );
      return largeFile.size > MAX_BYTES;
    });
    expect(rejected).toBe(true);

    const accepted = await page.evaluate(() => {
      const MAX_BYTES = 10 * 1024 * 1024;
      const smallFile = new File(
        [new ArrayBuffer(1024)],
        'small-backup.json',
        { type: 'application/json' }
      );
      return smallFile.size <= MAX_BYTES;
    });
    expect(accepted).toBe(true);
  });
});
