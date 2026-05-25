import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173';

test.describe('Login Page - User Flow', () => {
  test.beforeEach(async ({ context }) => {
    // Clear storage by granting permissions and clearing cookies
    await context.clearCookies();
  });

  test('should load the login page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: '.agents/testing/SNAPSHOTS/login-page-loaded.png', fullPage: true });

    // Check page title
    const title = await page.title();
    expect(title).toContain('Chat');

    // Check for sign in heading
    await expect(page.getByText(/sign in to your account/i)).toBeVisible();

    // Check for username and password fields
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();

    // Check for sign in button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Check for sign up link
    await expect(page.getByText(/sign up/i)).toBeVisible();
  });

  test('should have disabled button when form is empty', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Button should be disabled when form is empty
    const button = page.getByRole('button', { name: /sign in/i });
    await expect(button).toBeDisabled();

    await page.screenshot({ path: '.agents/testing/SNAPSHOTS/login-empty-form.png', fullPage: true });
  });

  test('should enable button when form is filled', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('admin123');

    // Button should be enabled when form is filled
    await expect(page.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });

  test('should fail login with wrong credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('wrongpassword');

    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForTimeout(3000);
    await page.screenshot({ path: '.agents/testing/SNAPSHOTS/login-wrong-credentials.png', fullPage: true });

    // Should still show login form (not chat content)
    const bodyText = await page.evaluate(() => document.body.textContent);
    expect(bodyText).not.toContain('Welcome to Pi Chat');
    expect(bodyText).toContain('Sign in');
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('admin123');

    // Watch for the API response
    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/auth/login') && r.status() === 200, { timeout: 10000 }),
      page.getByRole('button', { name: /sign in/i }).click()
    ]);

    console.log('Login API response status:', response.status());

    await page.waitForTimeout(3000);
    await page.screenshot({ path: '.agents/testing/SNAPSHOTS/login-success.png', fullPage: true });

    // Should show chat page content (app uses currentPage state, not URL routing)
    const bodyText = await page.evaluate(() => document.body.textContent);
    expect(bodyText).toContain('Welcome to Pi Chat');
    expect(bodyText).toContain('New Chat');

    // Token should be stored
    const token = await page.evaluate(() => localStorage.getItem('betty_token'));
    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(10);
  });

  test('should handle Enter key to submit', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('admin123');

    // Press Enter in password field
    await page.locator('#password').press('Enter');

    await page.waitForTimeout(3000);
    await page.screenshot({ path: '.agents/testing/SNAPSHOTS/login-enter-key.png', fullPage: true });

    // Should show chat page
    const bodyText = await page.evaluate(() => document.body.textContent);
    expect(bodyText).toContain('Welcome to Pi Chat');
  });

  test('should navigate to register page from login', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click "Sign up" link
    await page.getByText(/sign up/i).click();

    await page.waitForTimeout(2000);
    await page.screenshot({ path: '.agents/testing/SNAPSHOTS/register-from-login.png', fullPage: true });

    // Should show register form
    const bodyText = await page.evaluate(() => document.body.textContent);
    expect(bodyText).toMatch(/Sign Up|Sign up/i);
    expect(bodyText).toMatch(/Create.*account/i);
  });

  test('should test responsive design', async ({ page }) => {
    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '.agents/testing/SNAPSHOTS/login-mobile-375.png', fullPage: true });
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '.agents/testing/SNAPSHOTS/login-tablet-768.png', fullPage: true });
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '.agents/testing/SNAPSHOTS/login-desktop-1920.png', fullPage: true });
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should check for console errors on login page', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('Console errors on login page:', consoleErrors.length);
    for (const error of consoleErrors) {
      console.log('  -', error);
    }

    expect(consoleErrors.length).toBe(0);
  });

  test('should show register page via sign-up link', async ({ page }) => {
    // App uses hash-based routing, navigate via sign-up link from login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click "Sign Up" link
    await page.getByText(/Sign Up/i).click();
    await page.waitForTimeout(2000);

    await page.screenshot({ path: '.agents/testing/SNAPSHOTS/register-page.png', fullPage: true });

    // Check for register form
    const bodyText = await page.evaluate(() => document.body.textContent);
    expect(bodyText).toMatch(/Sign Up|Create.*account/i);

    // Check for required fields
    await expect(page.locator('#reg-username')).toBeVisible();
    await expect(page.locator('#reg-email')).toBeVisible();
    await expect(page.locator('#reg-password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Block the API to simulate network failure
    await page.route('**/api/auth/login', route => route.abort('failed'));

    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('admin123');

    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForTimeout(3000);
    await page.screenshot({ path: '.agents/testing/SNAPSHOTS/login-network-error.png', fullPage: true });

    // Should show error message, not crash
    const bodyText = await page.evaluate(() => document.body.textContent);
    // Should still show login form (not crash)
    expect(bodyText).toContain('Sign in');
  });

  test('should show error message on wrong password', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('wrongpassword');

    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForTimeout(3000);

    // Should show error message
    const bodyText = await page.evaluate(() => document.body.textContent);
    expect(bodyText.toLowerCase()).toMatch(/error|fail|invalid|wrong/i);
  });
});
