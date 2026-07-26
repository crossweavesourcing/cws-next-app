import { test, expect } from '@playwright/test';

test.describe('Section-aware page content', () => {
  test('the public home page never renders duplicate Contact sections', async ({ page }) => {
    await page.goto('/');
    expect(await page.locator('section#contracting').count()).toBeLessThanOrEqual(1);
  });

  test('shows each Home section once in the responsive editor', async ({ page }) => {
    const email = process.env.ADMIN_SEED_EMAIL || 'admin@crossweavesourcing.com';
    const password = process.env.ADMIN_SEED_PASSWORD || 'LocalDevSeedPass123!';
    await page.goto('/dashboard/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    test.skip(page.url().includes('/dashboard/login'), 'Seeded admin credentials are not available in this environment.');
    await page.goto('/dashboard/page-content');

    await expect(page.getByRole('heading', { name: 'Page Content' })).toBeVisible();
    await expect(page.locator('[data-section-id="home-hero"]')).toHaveCount(1);
    await expect(page.locator('[data-section-id^="home-"]')).toHaveCount(7);
    await expect(page.getByTestId('section-editor')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('section-navigator')).toBeVisible();
    await expect(page.getByRole('button', { name: /Save live/i })).toBeVisible();
  });
});
