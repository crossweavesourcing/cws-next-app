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

    // Should redirect to dashboard page
    // (Note: If forcePasswordChange flag is set, it redirects to /dashboard/change-password/)
    await expect(page).toHaveURL(/(\/dashboard\/?$|\/dashboard\/change-password\/?)/);

    // Verify session cookie was generated and is present in browser jar
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'cws_session');
    
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie?.httpOnly).toBe(true);
  });

  test('should allow signed-in user to access dashboard and then logout successfully', async ({ page, context }) => {
    // 1. Visit login and execute sign in
    await page.goto('/dashboard/login');
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');

    // Redirected
    await expect(page).toHaveURL(/(\/dashboard\/?$|\/dashboard\/change-password\/?)/);

    // If redirected to change-password, navigate to dashboard to verify it allows access
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
