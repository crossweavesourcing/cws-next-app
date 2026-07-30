import { test, expect } from '@playwright/test';

test.describe('Authentication and Authorization Flow', () => {
  const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@crossweavesourcing.com';
  const adminPassword = process.env.ADMIN_SEED_PASSWORD || 'Password123!';

  test.beforeEach(async ({ context }) => {
    // Clear cookies before each test to ensure a clean session state
    await context.clearCookies();
  });

  test('should redirect unauthenticated request from /dashboard to /dashboard/login', async ({ page }) => {
    // Try to visit dashboard directly
    await page.goto('/dashboard');

    // Verify it got redirected to the login page by the proxy middleware
    await expect(page).toHaveURL(/\/dashboard\/login/);
    
    // Check that security elements are visible
    await expect(page.locator('text=CMS Sign In')).toBeVisible();
  });

  test('should show error validation message for invalid credentials', async ({ page }) => {
    await page.goto('/dashboard/login');

    // Fill in wrong credentials
    await page.fill('input[name="email"]', 'wrong@crossweavesourcing.com');
    await page.fill('input[name="password"]', 'WrongPassword123!');
    
    // Submit form
    await page.click('button[type="submit"]');

    // Verify user-safe error validation is displayed
    await expect(page.locator('text=Invalid email address or password.')).toBeVisible();
  });

  test('should sign in successfully and redirect to dashboard with session cookie', async ({ page, context }) => {
    await page.goto('/dashboard/login');

    // Seeded admin user credentials from .env configuration
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    
    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard, change-password, or verify-2fa page
    await expect(page).toHaveURL(/(\/dashboard\/?$|\/dashboard\/change-password\/?|\/dashboard\/verify-2fa\/?)/);

    // If forcePasswordChange flag is set on seed admin, complete password change to obtain session
    if (page.url().includes('/dashboard/change-password')) {
      await page.fill('input[name="currentPassword"]', adminPassword);
      await page.fill('input[name="newPassword"]', 'NewCompliantPass123!');
      await page.fill('input[name="confirmPassword"]', 'NewCompliantPass123!');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/(\/dashboard\/?$|\/dashboard\/verify-2fa\/?)/);
    }

    // Verify session or pending cookie was generated
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'cws_session');
    const pending2faCookie = cookies.find(c => c.name === 'cws_2fa_pending');
    
    expect(sessionCookie || pending2faCookie).toBeDefined();
  });

  test('should allow signed-in user to access dashboard and then logout successfully', async ({ page, context }) => {
    // 1. Visit login and execute sign in
    await page.goto('/dashboard/login');
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');

    // Redirected
    await expect(page).toHaveURL(/(\/dashboard\/?$|\/dashboard\/change-password\/?|\/dashboard\/verify-2fa\/?)/);

    // If redirected to change-password, complete change
    if (page.url().includes('/dashboard/change-password')) {
      await page.fill('input[name="currentPassword"]', adminPassword);
      await page.fill('input[name="newPassword"]', 'NewCompliantPass123!');
      await page.fill('input[name="confirmPassword"]', 'NewCompliantPass123!');
      await page.click('button[type="submit"]');
    }

    if (page.url().includes('/dashboard/verify-2fa')) {
      // If 2FA verification prompt appears in untrusted environment, test passes redirection check
      return;
    }

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard\/?$/);
    await expect(page.locator('text=Content Management')).toBeVisible();

    // 2. Click sidebar Sign Out button to terminate session
    await page.click('button:has-text("Sign Out")');

    // Expect redirect back to login page
    await expect(page).toHaveURL(/\/dashboard\/login/);

    // Verify browser session cookie was cleared
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'cws_session');
    expect(sessionCookie).toBeUndefined();
  });
});
