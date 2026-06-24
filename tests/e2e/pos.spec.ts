import { test, expect } from '@playwright/test';

// =============================================================================
// POS VIEW E2E TESTS (pre-authentication / routing)
// =============================================================================
test.describe('POS Route Protection', () => {
  test('redirects to auth when visiting /pos unauthenticated', async ({ page }) => {
    await page.goto('/pos');
    await expect(page).toHaveURL(/\/(auth|home)/, { timeout: 10000 });
  });

  test('redirects to auth when visiting /data unauthenticated', async ({ page }) => {
    await page.goto('/data');
    await expect(page).toHaveURL(/\/(auth|home)/, { timeout: 10000 });
  });
});

// =============================================================================
// INVENTORY ROUTE TESTS
// =============================================================================
test.describe('Inventory Route Protection', () => {
  test('redirects to auth when visiting /inventory unauthenticated', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page).toHaveURL(/\/(auth|home)/, { timeout: 10000 });
  });
});

// =============================================================================
// UI SMOKE TESTS - HOME PAGE
// =============================================================================
test.describe('Home Page UI Smoke Tests', () => {
  test('has correct page title', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('home page renders without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/home');
    await page.waitForLoadState('networkidle');
    // Allow firebase and external errors but not module errors
    const criticalErrors = errors.filter(e =>
      !e.includes('firebase') &&
      !e.includes('network') &&
      !e.includes('Failed to fetch') &&
      e.includes('TypeError') || e.includes('ReferenceError')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('home page renders navigation elements', async ({ page }) => {
    await page.goto('/home');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    // Check for links or navigation
    const links = await page.getByRole('link').count();
    expect(links).toBeGreaterThan(0);
  });

  test('auth page renders within acceptable time', async ({ page }) => {
    const start = Date.now();
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');
    const elapsed = Date.now() - start;
    // Should load within 10 seconds
    expect(elapsed).toBeLessThan(10000);
  });
});
