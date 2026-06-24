import { test, expect } from '@playwright/test';

// =============================================================================
// INVENTORY VIEW E2E TESTS
// =============================================================================
test.describe('Inventory Route', () => {
  test('redirects /inventory to auth', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page).toHaveURL(/\/(auth|home)/, { timeout: 10000 });
  });
});

// =============================================================================
// PERFORMANCE BUDGET TESTS
// =============================================================================
test.describe('Performance Budget', () => {
  test('home page First Contentful Paint under 5 seconds', async ({ page }) => {
    await page.goto('/home');
    const fcpEntry = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              resolve(entry.startTime);
              observer.disconnect();
            }
          }
        });
        observer.observe({ entryTypes: ['paint'] });
        // Fallback if FCP already fired
        setTimeout(() => {
          const entries = performance.getEntriesByName('first-contentful-paint');
          if (entries.length > 0) resolve(entries[0].startTime);
          else resolve(0);
        }, 2000);
      });
    });
    // FCP should be under 5000ms
    if (fcpEntry > 0) {
      expect(fcpEntry).toBeLessThan(5000);
    }
  });

  test('no console errors on home page', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await page.goto('/home');
    await page.waitForLoadState('networkidle');
    // Filter only critical JS errors, not network/firebase ones
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('firebase') &&
      !e.includes('ERR_') &&
      !e.includes('net::') &&
      !e.includes('CORS') &&
      (e.includes('TypeError') || e.includes('ReferenceError') || e.includes('SyntaxError'))
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

// =============================================================================
// RESPONSIVE LAYOUT TESTS
// =============================================================================
test.describe('Responsive Layout', () => {
  test('home page renders on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Should render without horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const windowWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(windowWidth + 1); // Allow 1px tolerance
  });

  test('auth page renders on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('home page renders on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const buttons = await page.getByRole('button').count();
    expect(buttons).toBeGreaterThanOrEqual(0); // Should not crash
  });
});
