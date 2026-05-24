import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3002';
const SNAPSHOTS_DIR = '.agents/testing/SNAPSHOTS';

try { mkdirSync(SNAPSHOTS_DIR, { recursive: true }); } catch {}

const bugs = [];
let bugId = 0;

function logBug(severity, category, title, description, expected, actual) {
  bugId++;
  bugs.push({ id: bugId, severity, category, title, description, expected, actual });
  console.log(`\n[BUG #${bugId}] [${severity}] [${category}] ${title}`);
}

function pass(category, description) {
  console.log(`  ✓ [${category}] ${description}`);
}

async function screenshot(page, name) {
  await page.screenshot({ path: `${SNAPSHOTS_DIR}/${name}.png`, fullPage: true });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  // Track console errors
  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[CONSOLE ERROR] ${msg.text()}`);
    }
  });

  try {
    // ============================================================
    // TEST 1: Login page loads
    // ============================================================
    console.log("\n=== TEST 1: Login page loads ===");
    await page.goto(`${BASE_URL}/#login`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for Vue to render

    await screenshot(page, 'login-page');

    const loginVisible = await page.isVisible('#username');
    if (loginVisible) {
      pass('login', 'Username input is visible');
    } else {
      logBug('Critical', 'login', 'Login form not rendered', 'Username input #username is not visible on login page', 'Username input visible', 'Not visible');
    }

    const passwordVisible = await page.isVisible('#password');
    if (passwordVisible) {
      pass('login', 'Password input is visible');
    } else {
      logBug('Critical', 'login', 'Password input not rendered', 'Password input #password is not visible', 'Password input visible', 'Not visible');
    }

    const submitBtn = await page.isVisible('button[type="submit"]');
    if (submitBtn) {
      pass('login', 'Submit button is visible');
    } else {
      logBug('Critical', 'login', 'Submit button not rendered', 'Submit button not visible', 'Submit button visible', 'Not visible');
    }

    const pageTitle = await page.title();
    if (pageTitle === 'Pi Chat') {
      pass('login', `Page title is "${pageTitle}"`);
    } else {
      logBug('Minor', 'login', 'Unexpected page title', `Expected "Pi Chat", got "${pageTitle}"`, 'Pi Chat', pageTitle);
    }

    // Check for console errors
    if (consoleErrors.length === 0) {
      pass('login', 'No console errors on page load');
    } else {
      logBug('Major', 'login', 'Console errors on login page load', `Errors: ${consoleErrors.join('; ')}`, 'No console errors', consoleErrors.join('; '));
    }

    // Check that the "Sign up" link exists
    const signupLink = await page.getByText('Sign up').first();
    if (await signupLink.isVisible()) {
      pass('login', 'Sign up link is visible');
      // Test that clicking it navigates to register
      await signupLink.click();
      await page.waitForTimeout(1000);
      const regVisible = await page.isVisible('#reg-username');
      if (regVisible) {
        pass('login', 'Navigation to register page works');
      } else {
        logBug('Critical', 'login', 'Register page not accessible', 'Clicking Sign up link does not show register form', 'Register form visible', 'Not visible');
      }
      // Go back to login
      await page.goto(`${BASE_URL}/#login`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
    } else {
      logBug('Major', 'login', 'Sign up link not found', 'Cannot find "Sign up" text on login page', 'Sign up link present', 'Not found');
    }

    // ============================================================
    // TEST 2: Login form validation
    // ============================================================
    console.log("\n=== TEST 2: Login form validation ===");

    // Check button is disabled when empty
    const emptyBtnDisabled = await page.getAttribute('button[type="submit"]', 'disabled');
    if (emptyBtnDisabled !== null) {
      pass('login', 'Submit button is disabled when form is empty');
    } else {
      logBug('Minor', 'login', 'Submit button not disabled when empty', 'Submit button should be disabled with empty username/password', 'Button disabled', 'Button enabled');
    }

    // Fill username only
    await page.fill('#username', 'admin');
    const usernameOnlyDisabled = await page.getAttribute('button[type="submit"]', 'disabled');
    if (usernameOnlyDisabled !== null) {
      pass('login', 'Submit button still disabled with only username');
    } else {
      logBug('Minor', 'login', 'Submit button enabled with only username', 'Should require both fields', 'Disabled', 'Enabled');
    }

    // Fill password
    await page.fill('#password', 'admin123');
    const filledBtnDisabled = await page.getAttribute('button[type="submit"]', 'disabled');
    if (filledBtnDisabled === null) {
      pass('login', 'Submit button enabled when both fields filled');
    } else {
      logBug('Major', 'login', 'Submit button still disabled with both fields', 'Should be enabled when username and password are filled', 'Enabled', 'Disabled');
    }

    // ============================================================
    // TEST 3: Login with valid credentials
    // ============================================================
    console.log("\n=== TEST 3: Login with valid credentials ===");
    await page.goto(`${BASE_URL}/#login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Check if we're on the chat page
    const chatContainer = await page.isVisible('.chat-container');
    if (chatContainer) {
      pass('login', 'Login with valid credentials succeeds');
    } else {
      logBug('Critical', 'login', 'Login with valid credentials fails', 'After entering admin/admin123, should navigate to chat page', 'Chat page visible', 'Not visible');
      await screenshot(page, 'login-failed');
    }

    // Check if user is displayed
    const userDisplay = await page.textContent('.user-btn');
    if (userDisplay && userDisplay.includes('admin')) {
      pass('login', `User "admin" displayed in header`);
    } else {
      logBug('Major', 'login', 'Username not displayed after login', `Expected to see "admin" in user menu, got: "${userDisplay}"`, 'admin in user menu', userDisplay || 'null');
    }

    // ============================================================
    // TEST 4: Login with invalid credentials
    // ============================================================
    console.log("\n=== TEST 4: Login with invalid credentials ===");
    await page.goto(`${BASE_URL}/#login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.fill('#username', 'admin');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    const errorMsg = await page.isVisible('.auth-error');
    if (errorMsg) {
      const errorText = await page.textContent('.auth-error');
      pass('login', `Error message shown: "${errorText}"`);
    } else {
      logBug('Critical', 'login', 'No error shown for invalid credentials', 'Should display error message for wrong password', 'Error message visible', 'No error');
      await screenshot(page, 'login-invalid-no-error');
    }

    // Check we're still on login page
    const stillOnLogin = await page.isVisible('#username');
    if (stillOnLogin) {
      pass('login', 'Still on login page after failed login');
    } else {
      logBug('Major', 'login', 'Navigated away after failed login', 'Should stay on login page after failed credentials', 'Stay on login page', 'Navigated away');
    }

    // ============================================================
    // TEST 5: Login with empty fields
    // ============================================================
    console.log("\n=== TEST 5: Login with empty fields ===");
    await page.goto(`${BASE_URL}/#login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Don't fill anything, just click submit
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // Should show HTML5 validation (browser handles this)
    const stillOnLogin2 = await page.isVisible('#username');
    if (stillOnLogin2) {
      pass('login', 'Stays on login page with empty fields');
    } else {
      logBug('Major', 'login', 'Navigated away with empty fields', 'Should not navigate with empty form', 'Stay on login page', 'Navigated away');
    }

    // ============================================================
    // TEST 6: Registration page
    // ============================================================
    console.log("\n=== TEST 6: Registration page ===");
    await page.goto(`${BASE_URL}/#register`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await screenshot(page, 'register-page');

    const regFormVisible = await page.isVisible('#reg-username');
    if (regFormVisible) {
      pass('register', 'Registration form is visible');
    } else {
      logBug('Critical', 'register', 'Registration form not rendered', 'Registration form fields not visible', 'Form visible', 'Not visible');
    }

    // Check all required fields
    const fields = ['#reg-username', '#reg-email', '#reg-password', '#reg-confirm'];
    const fieldLabels = ['Username', 'Email', 'Password', 'Confirm Password'];
    for (let i = 0; i < fields.length; i++) {
      const visible = await page.isVisible(fields[i]);
      if (visible) {
        pass('register', `${fieldLabels[i]} field is visible`);
      } else {
        logBug('Critical', 'register', `${fieldLabels[i]} field not rendered`, `${fieldLabels[i]} input not visible on registration page`, 'Field visible', 'Not visible');
      }
    }

    // Check sign in link
    const signInLink = await page.getByText('Sign in').first();
    if (await signInLink.isVisible()) {
      pass('register', 'Sign in link is visible');
    } else {
      logBug('Major', 'register', 'Sign in link not found', 'Cannot find "Sign in" text on register page', 'Sign in link present', 'Not found');
    }

    // ============================================================
    // TEST 7: Registration form validation
    // ============================================================
    console.log("\n=== TEST 7: Registration form validation ===");

    // Check canSubmit logic (button disabled until all fields match)
    const regBtnDisabled = await page.getAttribute('button[type="submit"]', 'disabled');
    if (regBtnDisabled !== null) {
      pass('register', 'Register button disabled when form incomplete');
    } else {
      logBug('Minor', 'register', 'Register button not disabled when incomplete', 'Should require all fields + matching passwords', 'Disabled', 'Enabled');
    }

    // Fill only username
    await page.fill('#reg-username', 'testuser');
    const btnAfterUsername = await page.getAttribute('button[type="submit"]', 'disabled');
    if (btnAfterUsername !== null) {
      pass('register', 'Button still disabled with only username');
    } else {
      logBug('Minor', 'register', 'Button enabled with only username', 'Should require all fields', 'Disabled', 'Enabled');
    }

    // Fill all but confirm password
    await page.fill('#reg-email', 'test@example.com');
    await page.fill('#reg-password', 'testpass1');
    const btnAfterAllButConfirm = await page.getAttribute('button[type="submit"]', 'disabled');
    if (btnAfterAllButConfirm !== null) {
      pass('register', 'Button disabled when passwords do not match');
    } else {
      logBug('Major', 'register', 'Button enabled with mismatched passwords', 'Should require matching passwords', 'Disabled', 'Enabled');
    }

    // Fill confirm password
    await page.fill('#reg-confirm', 'testpass1');
    const btnAfterMatch = await page.getAttribute('button[type="submit"]', 'disabled');
    if (btnAfterMatch === null) {
      pass('register', 'Button enabled when all fields filled and passwords match');
    } else {
      logBug('Major', 'register', 'Button still disabled with matching passwords', 'Should be enabled when all fields valid', 'Enabled', 'Disabled');
    }

    // Change password to mismatch
    await page.fill('#reg-password', 'differentpass');
    const btnAfterMismatch = await page.getAttribute('button[type="submit"]', 'disabled');
    if (btnAfterMismatch !== null) {
      pass('register', 'Button re-disabled when passwords mismatch');
    } else {
      logBug('Major', 'register', 'Button enabled with mismatched passwords', 'Should disable when passwords no longer match', 'Disabled', 'Enabled');
    }

    // ============================================================
    // TEST 8: Logout flow
    // ============================================================
    console.log("\n=== TEST 8: Logout flow ===");
    // Login first
    await page.goto(`${BASE_URL}/#login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Click user menu
    await page.click('.user-btn');
    await page.waitForTimeout(500);

    // Click sign out
    const logoutBtn = await page.getByText('Sign Out').first();
    if (await logoutBtn.isVisible()) {
      pass('login', 'Sign Out button is visible in user menu');
      await logoutBtn.click();
      await page.waitForTimeout(2000);

      // Should be back on login page
      const backOnLogin = await page.isVisible('#username');
      if (backOnLogin) {
        pass('login', 'Logout returns to login page');
      } else {
        logBug('Critical', 'login', 'Logout does not return to login page', 'After logout, should be on login page', 'Login page visible', 'Not visible');
      }
    } else {
      logBug('Major', 'login', 'Sign Out button not found', 'Cannot find "Sign Out" in user menu', 'Sign Out button present', 'Not found');
    }

    // ============================================================
    // TEST 9: Responsive design
    // ============================================================
    console.log("\n=== TEST 9: Responsive design ===");
    await page.goto(`${BASE_URL}/#login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const widths = [375, 768, 1920];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 667 });
      await page.waitForTimeout(500);
      await screenshot(page, `login-${width}w`);

      const visible = await page.isVisible('#username');
      if (visible) {
        pass('responsive', `Login form visible at ${width}px width`);
      } else {
        logBug('Major', 'responsive', `Login form not visible at ${width}px`, 'Form should be visible at all breakpoints', 'Visible', 'Not visible');
      }
    }

    // ============================================================
    // TEST 10: Auth persistence (localStorage)
    // ============================================================
    console.log("\n=== TEST 10: Auth persistence ===");
    // Login
    await page.goto(`${BASE_URL}/#login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Check localStorage has token
    const token = await page.evaluate(() => localStorage.getItem('betty_token'));
    if (token && token.length > 0) {
      pass('auth', 'Token stored in localStorage after login');
    } else {
      logBug('Critical', 'auth', 'Token not stored in localStorage', 'betty_token should be in localStorage after login', 'Token in localStorage', 'Not found');
    }

    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Should still be on chat page (session restored)
    const stillAuthenticated = await page.isVisible('.chat-container');
    if (stillAuthenticated) {
      pass('auth', 'Session restored after page reload');
    } else {
      logBug('Major', 'auth', 'Session not restored after reload', 'Should remain logged in after page reload via localStorage token', 'Still on chat page', 'On login page');
    }

    // ============================================================
    // TEST 11: Error states and edge cases
    // ============================================================
    console.log("\n=== TEST 11: Error states and edge cases ===");

    // Check for any console errors across all tests
    const significantErrors = consoleErrors.filter(e =>
      !e.includes('favicon') && !e.includes('icon') && !e.includes('404')
    );
    if (significantErrors.length === 0) {
      pass('general', 'No significant console errors during testing');
    } else {
      logBug('Major', 'general', 'Console errors detected', `Errors: ${significantErrors.join('; ')}`, 'No console errors', significantErrors.join('; '));
    }

    // ============================================================
    // Summary
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("TEST SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total bugs found: ${bugs.length}`);
    for (const bug of bugs) {
      console.log(`  [${bug.severity}] #${bug.id}: ${bug.title}`);
    }

    // Write bugs to file
    writeFileSync(
      '.agents/testing/BUGS_FOUND_FRONTEND.md',
      JSON.stringify(bugs, null, 2)
    );

  } catch (err) {
    console.error('Test error:', err.message);
    logBug('Critical', 'test', 'Test execution error', err.message, 'No errors', err.message);
  } finally {
    await browser.close();
  }
}

main();
