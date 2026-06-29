import { test, expect } from '@playwright/test';

const ROUTES = [
  { path: '/', title: /Fundalyst|financial|analysis/i },
  { path: '/import', title: /Import/i },
  { path: '/workspace', title: /Workspace/i },
  { path: '/research/filing', title: /Filing/i },
  { path: '/research/trends', title: /Trend/i },
  { path: '/research/growth', title: /Growth/i },
  { path: '/tools/dcf', title: /DCF|Valuation/i },
  { path: '/tools/wc', title: /Cash|Efficiency/i },
  { path: '/tools/ratios', title: /Ratio/i },
  { path: '/tools/peer', title: /Peer/i },
  { path: '/about', title: /About/i },
];

for (const route of ROUTES) {
  test(`${route.path} renders`, async ({ page }) => {
    const response = await page.goto(route.path);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(route.title);
  });
}
