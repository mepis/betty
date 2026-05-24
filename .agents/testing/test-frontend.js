import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';
const SNAPSHOTS_DIR = '.agents/testing/SNAPSHOTS';

const bugs = [];
let bugId = 0;

function logBug({ page, severity, category, title, description, steps, expected, actual }) {
  bugId++;
  bugs.push({ id: bugId, page, severity, category, title, description, steps, expected, actual });
  console.log(`\n[BUG #${bugId}] [${severity}] [${category}] ${title}`);
  console.log(`  Page: ${page}`);
  console.log(`  Description: ${description}`);
}

async function screenshot(page, name) {
  await page.screenshot({ path: `${SNAPSHOTS_DIR}/${name}.png`, fullPage: true });
}

// Helper: wait for Vue to render by checking for a known element
async function waitForVue(page, selector, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

// Helper: login as admin using a fresh context
async function loginAsAdmin(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto(`${BASE_URL}/#login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  // Wait for login form
  if (!await waitForVue(page, '#username')) {
    console.log('  WARNING: Login form not found, retrying...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
  }
  
  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  
  // Wait for chat page to load
  if (!await waitForVue(page, '.app-header')) {
    console.log('  WARNING: Chat header not found after login');
  }
  
  return { context, page };
}

// ========== TEST FUNCTIONS ==========

async function testLoginPage(browser) {
  console.log('\n=== Testing Login Page ===');
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto(`${BASE_URL}/#login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await screenshot(page, '01_login_page');
  
  // Check login card
  const hasLoginCard = await waitForVue(page, '.auth-card');
  if (!hasLoginCard) {
    logBug({ page: '/#login', severity: 'Critical', category: 'Login',
      title: 'Login form not displayed', description: 'The login card/form is not visible',
      steps: ['Navigate to #login'], expected: '.auth-card visible', actual: '.auth-card not found' });
  } else {
    console.log('  ✓ Login card visible');
    
    // Title
    const title = await page.textContent('h1');
    if (!title?.includes('Pi Chat')) {
      logBug({ page: '/#login', severity: 'Major', category: 'Login',
        title: 'Page title missing', description: `h1 is "${title}"`,
        steps: ['Navigate to #login'], expected: '"Pi Chat"', actual: title });
    } else {
      console.log('  ✓ Page title correct');
    }
    
    // Form elements
    const hasUser = await waitForVue(page, '#username');
    const hasPass = await waitForVue(page, '#password');
    const hasSubmit = await waitForVue(page, 'button[type="submit"]');
    
    if (!hasUser) logBug({ page: '/#login', severity: 'Critical', category: 'Login',
      title: 'Username input missing', description: 'No #username input found',
      steps: ['Navigate to #login'], expected: '#username exists', actual: 'Not found' });
    else console.log('  ✓ Username input present');
    
    if (!hasPass) logBug({ page: '/#login', severity: 'Critical', category: 'Login',
      title: 'Password input missing', description: 'No #password input found',
      steps: ['Navigate to #login'], expected: '#password exists', actual: 'Not found' });
    else console.log('  ✓ Password input present');
    
    if (!hasSubmit) logBug({ page: '/#login', severity: 'Critical', category: 'Login',
      title: 'Submit button missing', description: 'No submit button found',
      steps: ['Navigate to #login'], expected: 'button[type="submit"] exists', actual: 'Not found' });
    else {
      console.log('  ✓ Submit button present');
      
      // Check disabled state with empty fields
      const disabled = await page.locator('button[type="submit"]').isDisabled();
      if (!disabled) {
        logBug({ page: '/#login', severity: 'Major', category: 'Login',
          title: 'Submit not disabled with empty fields', description: 'Button should be disabled when username or password is empty',
          steps: ['Navigate to #login'], expected: 'Disabled', actual: 'Enabled' });
      } else {
        console.log('  ✓ Submit button disabled with empty fields');
      }
    }
    
    // Invalid credentials test
    await page.fill('#username', 'invaliduser');
    await page.fill('#password', 'wrongpass');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    const errorMsg = await page.locator('.auth-error').textContent().catch(() => null);
    if (!errorMsg) {
      logBug({ page: '/#login', severity: 'Major', category: 'Login',
        title: 'No error for invalid credentials', description: 'Error message should appear on failed login',
        steps: ['Enter invalid credentials', 'Submit'], expected: '.auth-error visible', actual: 'No error shown' });
    } else {
      console.log(`  ✓ Error shown: "${errorMsg.trim()}"`);
    }
    
    // Sign up link
    if (await page.locator('a[href="#register"]').count() === 0) {
      logBug({ page: '/#login', severity: 'Major', category: 'Login',
        title: 'Sign up link missing', description: 'Should have link to register page',
        steps: ['Navigate to #login'], expected: 'a[href="#register"]', actual: 'Not found' });
    } else {
      console.log('  ✓ Sign up link present');
    }
  }
  
  await page.close();
  await context.close();
}

async function testRegisterPage(browser) {
  console.log('\n=== Testing Register Page ===');
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto(`${BASE_URL}/#register`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await screenshot(page, '02_register_page');
  
  const hasCard = await waitForVue(page, '.auth-card');
  if (!hasCard) {
    logBug({ page: '/#register', severity: 'Critical', category: 'Register',
      title: 'Registration form not displayed', description: '.auth-card not visible',
      steps: ['Navigate to #register'], expected: '.auth-card visible', actual: 'Not found' });
  } else {
    console.log('  ✓ Registration card visible');
    
    // Check all inputs
    const inputs = ['#reg-username', '#reg-email', '#reg-password', '#reg-confirm'];
    for (const sel of inputs) {
      if (!await waitForVue(page, sel)) {
        logBug({ page: '/#register', severity: 'Critical', category: 'Register',
          title: `Input ${sel} missing`, description: `${sel} not found in registration form`,
          steps: ['Navigate to #register'], expected: `${sel} exists`, actual: 'Not found' });
      } else {
        console.log(`  ✓ ${sel} present`);
      }
    }
    
    // Submit disabled with empty form
    const disabled = await page.locator('button[type="submit"]').isDisabled();
    if (!disabled) {
      logBug({ page: '/#register', severity: 'Major', category: 'Register',
        title: 'Submit not disabled with empty form', description: 'Should be disabled when form is incomplete',
        steps: ['Navigate to #register'], expected: 'Disabled', actual: 'Enabled' });
    } else {
      console.log('  ✓ Submit disabled with empty form');
    }
    
    // Mismatched passwords
    await page.fill('#reg-username', 'testuser123');
    await page.fill('#reg-email', 'test@example.com');
    await page.fill('#reg-password', 'password123');
    await page.fill('#reg-confirm', 'different123');
    
    const mismatchDisabled = await page.locator('button[type="submit"]').isDisabled();
    if (!mismatchDisabled) {
      logBug({ page: '/#register', severity: 'Major', category: 'Register',
        title: 'Submit not disabled for mismatched passwords', description: 'Should be disabled when passwords differ',
        steps: ['Fill form with different passwords'], expected: 'Disabled', actual: 'Enabled' });
    } else {
      console.log('  ✓ Submit disabled for mismatched passwords');
    }
    
    // Successful registration
    const uname = 'testuser_' + Date.now();
    await page.fill('#reg-username', uname);
    await page.fill('#reg-email', `${uname}@example.com`);
    await page.fill('#reg-password', 'password123');
    await page.fill('#reg-confirm', 'password123');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(4000);
    
    const hash = await page.evaluate(() => window.location.hash);
    const err = await page.locator('.auth-error').textContent().catch(() => null);
    if (hash.includes('chat')) {
      console.log('  ✓ Registration succeeded, redirected to chat');
    } else if (err) {
      logBug({ page: '/#register', severity: 'Major', category: 'Register',
        title: 'Registration failed', description: `Valid registration failed: ${err}`,
        steps: ['Fill valid form', 'Submit'], expected: 'Redirect to #chat', actual: err });
    } else {
      console.log(`  ? Registration unclear (hash: ${hash})`);
    }
    
    // Sign in link
    if (await page.locator('a[href="#login"]').count() === 0) {
      logBug({ page: '/#register', severity: 'Minor', category: 'Register',
        title: 'Sign in link missing', description: 'Should have link back to login',
        steps: ['Navigate to #register'], expected: 'a[href="#login"]', actual: 'Not found' });
    } else {
      console.log('  ✓ Sign in link present');
    }
  }
  
  await screenshot(page, '02b_register_result');
  await page.close();
  await context.close();
}

async function testChatPage(browser) {
  console.log('\n=== Testing Chat Page ===');
  const { context, page } = await loginAsAdmin(browser);
  await screenshot(page, '03_chat_page');
  
  const hasHeader = await waitForVue(page, '.app-header');
  if (!hasHeader) {
    logBug({ page: '/#chat', severity: 'Critical', category: 'Chat',
      title: 'Chat header not visible after login', description: '.app-header not found',
      steps: ['Login as admin'], expected: '.app-header visible', actual: 'Not found' });
  } else {
    console.log('  ✓ Chat header visible');
    
    // Title
    const title = await page.textContent('.app-header h1');
    if (!title?.includes('Pi Chat')) {
      logBug({ page: '/#chat', severity: 'Major', category: 'Chat',
        title: 'Header title missing', description: `Title is "${title}"`,
        steps: ['Login'], expected: '"Pi Chat"', actual: title });
    } else {
      console.log('  ✓ Header title present');
    }
    
    // Welcome screen
    if (!await waitForVue(page, '.welcome-screen')) {
      logBug({ page: '/#chat', severity: 'Major', category: 'Chat',
        title: 'Welcome screen not shown', description: 'Should show welcome screen on empty chat',
        steps: ['Login'], expected: '.welcome-screen visible', actual: 'Not found' });
    } else {
      console.log('  ✓ Welcome screen shown');
      
      const hints = await page.locator('.welcome-hint').count();
      if (hints === 0) {
        logBug({ page: '/#chat', severity: 'Minor', category: 'Chat',
          title: 'No welcome hints', description: 'Should show clickable hint suggestions',
          steps: ['Login', 'Check welcome screen'], expected: '.welcome-hint elements', actual: 'None found' });
      } else {
        console.log(`  ✓ ${hints} welcome hints shown`);
      }
    }
    
    // Input textarea
    if (!await waitForVue(page, 'textarea')) {
      logBug({ page: '/#chat', severity: 'Critical', category: 'Chat',
        title: 'Input textarea missing', description: 'No textarea for typing messages',
        steps: ['Login'], expected: 'textarea exists', actual: 'Not found' });
    } else {
      console.log('  ✓ Input textarea present');
      const placeholder = await page.locator('textarea').getAttribute('placeholder');
      if (!placeholder) {
        logBug({ page: '/#chat', severity: 'Minor', category: 'Chat',
          title: 'Textarea missing placeholder', description: 'Should have helpful placeholder text',
          steps: ['Login'], expected: 'Placeholder text', actual: 'None' });
      } else {
        console.log(`  ✓ Placeholder: "${placeholder}"`);
      }
    }
    
    // Send button
    if (!await waitForVue(page, '.btn-primary')) {
      logBug({ page: '/#chat', severity: 'Major', category: 'Chat',
        title: 'Send button missing', description: 'No .btn-primary send button',
        steps: ['Login'], expected: '.btn-primary exists', actual: 'Not found' });
    } else {
      console.log('  ✓ Send button present');
      const disabled = await page.locator('.btn-primary').first().isDisabled();
      if (!disabled) {
        logBug({ page: '/#chat', severity: 'Minor', category: 'Chat',
          title: 'Send not disabled with empty input', description: 'Should be disabled when no text entered',
          steps: ['Login'], expected: 'Disabled', actual: 'Enabled' });
      } else {
        console.log('  ✓ Send disabled with empty input');
      }
    }
    
    // New Chat button
    if (!await waitForVue(page, 'button[title="Start a new chat session"]')) {
      logBug({ page: '/#chat', severity: 'Minor', category: 'Chat',
        title: 'New Chat button missing', description: 'Should have "New Chat" button',
        steps: ['Login'], expected: '"New Chat" button', actual: 'Not found' });
    } else {
      console.log('  ✓ New Chat button present');
    }
    
    // Admin button
    if (!await waitForVue(page, 'button[title="Admin Panel"]')) {
      logBug({ page: '/#chat', severity: 'Major', category: 'Chat/Admin',
        title: 'Admin button not visible for admin', description: 'Admin should see gear icon',
        steps: ['Login as admin'], expected: 'Admin button visible', actual: 'Not found' });
    } else {
      console.log('  ✓ Admin button visible');
    }
    
    // User menu
    if (!await waitForVue(page, '.user-btn')) {
      logBug({ page: '/#chat', severity: 'Major', category: 'Chat',
        title: 'User menu button missing', description: 'Should show user button with username',
        steps: ['Login'], expected: '.user-btn visible', actual: 'Not found' });
    } else {
      const userText = (await page.locator('.user-btn').textContent()).trim();
      console.log(`  ✓ User menu: "${userText}"`);
      
      await page.locator('.user-btn').click();
      await page.waitForTimeout(500);
      
      if (!await waitForVue(page, '.user-dropdown')) {
        logBug({ page: '/#chat', severity: 'Major', category: 'Chat',
          title: 'User dropdown does not open', description: 'Clicking user button should open dropdown',
          steps: ['Login', 'Click user button'], expected: '.user-dropdown appears', actual: 'Not found' });
      } else {
        console.log('  ✓ User dropdown opens');
        
        if (!await waitForVue(page, '.btn-logout')) {
          logBug({ page: '/#chat', severity: 'Major', category: 'Chat',
            title: 'Logout button missing from dropdown', description: 'Dropdown should have logout button',
            steps: ['Login', 'Click user button'], expected: '.btn-logout in dropdown', actual: 'Not found' });
        } else {
          console.log('  ✓ Logout button in dropdown');
        }
      }
    }
    
    // Status badge
    if (!await waitForVue(page, '.status-badge')) {
      logBug({ page: '/#chat', severity: 'Minor', category: 'Chat',
        title: 'Status badge missing', description: 'Should show connection status',
        steps: ['Login'], expected: '.status-badge exists', actual: 'Not found' });
    } else {
      const status = (await page.locator('.status-badge').textContent()).trim();
      console.log(`  ✓ Status badge: "${status}"`);
    }
  }
  
  await context.close();
}

async function testAdminPage(browser) {
  console.log('\n=== Testing Admin Page ===');
  const { context, page } = await loginAsAdmin(browser);
  
  await page.goto(`${BASE_URL}/#admin`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await screenshot(page, '04_admin_page');
  
  const hasAdmin = await waitForVue(page, '.admin-page');
  if (!hasAdmin) {
    logBug({ page: '/#admin', severity: 'Critical', category: 'Admin',
      title: 'Admin panel not displayed', description: '.admin-page not visible',
      steps: ['Login as admin', 'Navigate to #admin'], expected: '.admin-page visible', actual: 'Not found' });
  } else {
    console.log('  ✓ Admin panel visible');
    
    // Title
    const title = await page.locator('.admin-header h1').textContent().catch(() => null);
    if (!title?.includes('Admin')) {
      logBug({ page: '/#admin', severity: 'Major', category: 'Admin',
        title: 'Admin title missing', description: `Title is "${title}"`,
        steps: ['Login as admin', 'Navigate to #admin'], expected: '"Admin"', actual: title });
    } else {
      console.log('  ✓ Admin title present');
    }
    
    // Tabs
    const hasUsersTab = await waitForVue(page, 'button:has-text("Users")');
    const hasRolesTab = await waitForVue(page, 'button:has-text("Roles")');
    if (!hasUsersTab || !hasRolesTab) {
      logBug({ page: '/#admin', severity: 'Major', category: 'Admin',
        title: 'Admin tabs missing', description: `Users: ${hasUsersTab}, Roles: ${hasRolesTab}`,
        steps: ['Login as admin', 'Navigate to #admin'], expected: 'Both tabs', actual: 'Missing' });
    } else {
      console.log('  ✓ Both tabs present');
      
      const usersClass = await page.locator('button:has-text("Users")').getAttribute('class');
      if (!usersClass?.includes('active')) {
        logBug({ page: '/#admin', severity: 'Minor', category: 'Admin',
          title: 'Users tab not active by default', description: `Classes: ${usersClass}`,
          steps: ['Login as admin', 'Navigate to #admin'], expected: '"active" class', actual: usersClass });
      } else {
        console.log('  ✓ Users tab active by default');
      }
    }
    
    // User table
    if (!await waitForVue(page, '.data-table')) {
      logBug({ page: '/#admin', severity: 'Major', category: 'Admin/Users',
        title: 'User table missing', description: '.data-table not found',
        steps: ['Login as admin', 'Navigate to #admin'], expected: '.data-table visible', actual: 'Not found' });
    } else {
      console.log('  ✓ User table present');
      
      if (!await waitForVue(page, 'button:has-text("New User")')) {
        logBug({ page: '/#admin', severity: 'Major', category: 'Admin/Users',
          title: '"New User" button missing', description: 'Should have button to create users',
          steps: ['Login as admin'], expected: '"New User" button', actual: 'Not found' });
      } else {
        console.log('  ✓ "New User" button present');
        
        await page.locator('button:has-text("New User")').click();
        await page.waitForTimeout(1000);
        
        if (!await waitForVue(page, '.modal-overlay')) {
          logBug({ page: '/#admin', severity: 'Major', category: 'Admin/Users',
            title: 'Create user modal does not open', description: 'Clicking "New User" should open modal',
            steps: ['Login as admin', 'Click "New User"'], expected: '.modal-overlay appears', actual: 'Not found' });
        } else {
          console.log('  ✓ Create user modal opens');
          const inputs = await page.locator('.modal input, .modal select').count();
          if (inputs < 4) {
            logBug({ page: '/#admin', severity: 'Major', category: 'Admin/Users',
              title: 'Create user modal missing fields', description: `Only ${inputs} inputs found (need 4+)`,
              steps: ['Login as admin', 'Click "New User"'], expected: '4+ form inputs', actual: `${inputs} inputs` });
          } else {
            console.log(`  ✓ Modal has ${inputs} fields`);
          }
          
          await page.locator('.modal-overlay').click();
          await page.waitForTimeout(500);
        }
      }
    }
    
    // Roles tab
    if (await waitForVue(page, 'button:has-text("Roles")')) {
      await page.locator('button:has-text("Roles")').click();
      await page.waitForTimeout(1500);
      
      if (!await waitForVue(page, '.data-table')) {
        logBug({ page: '/#admin', severity: 'Major', category: 'Admin/Roles',
          title: 'Roles table missing', description: '.data-table not found on Roles tab',
          steps: ['Login as admin', 'Click Roles tab'], expected: '.data-table visible', actual: 'Not found' });
      } else {
        console.log('  ✓ Roles table present');
        
        if (!await waitForVue(page, 'button:has-text("New Role")')) {
          logBug({ page: '/#admin', severity: 'Major', category: 'Admin/Roles',
            title: '"New Role" button missing', description: 'Should have button to create roles',
            steps: ['Login as admin', 'Click Roles tab'], expected: '"New Role" button', actual: 'Not found' });
        } else {
          console.log('  ✓ "New Role" button present');
          
          await page.locator('button:has-text("New Role")').click();
          await page.waitForTimeout(1000);
          
          if (!await waitForVue(page, '.modal-overlay')) {
            logBug({ page: '/#admin', severity: 'Major', category: 'Admin/Roles',
              title: 'Create role modal does not open', description: 'Clicking "New Role" should open modal',
              steps: ['Login as admin', 'Click Roles tab', 'Click "New Role"'], expected: '.modal-overlay appears', actual: 'Not found' });
          } else {
            console.log('  ✓ Create role modal opens');
            const checks = await page.locator('.permission-grid input[type="checkbox"]').count();
            if (checks === 0) {
              logBug({ page: '/#admin', severity: 'Major', category: 'Admin/Roles',
                title: 'Permission checkboxes missing', description: 'Role modal should have permission checkboxes',
                steps: ['Login as admin', 'Click Roles tab', 'Click "New Role"'], expected: 'Checkboxes in .permission-grid', actual: 'None' });
            } else {
              console.log(`  ✓ ${checks} permission checkboxes`);
            }
            
            await page.locator('.modal-overlay').click();
            await page.waitForTimeout(500);
          }
        }
      }
    }
    
    // Back to Chat button
    if (!await waitForVue(page, 'button:has-text("Back to Chat")')) {
      logBug({ page: '/#admin', severity: 'Major', category: 'Admin',
        title: '"Back to Chat" button missing', description: 'Should have button to return to chat',
        steps: ['Login as admin', 'Navigate to #admin'], expected: '"Back to Chat" button', actual: 'Not found' });
    } else {
      console.log('  ✓ "Back to Chat" button present');
      
      await page.locator('button:has-text("Back to Chat")').click();
      await page.waitForTimeout(1500);
      
      const hash = await page.evaluate(() => window.location.hash);
      if (!hash.includes('chat')) {
        logBug({ page: '/#admin', severity: 'Major', category: 'Admin/Navigation',
          title: '"Back to Chat" navigation broken', description: `Hash is "${hash}" instead of "#chat"`,
          steps: ['Login as admin', 'Navigate to #admin', 'Click "Back to Chat"'], expected: '#chat', actual: hash });
      } else {
        console.log('  ✓ "Back to Chat" navigates correctly');
      }
    }
  }
  
  await screenshot(page, '04b_admin_final');
  await context.close();
}

async function testNavigation(browser) {
  console.log('\n=== Testing Navigation ===');
  
  // Test 1: Default route shows login
  const ctx1 = await browser.newContext();
  const p1 = await ctx1.newPage();
  await p1.goto(`${BASE_URL}/#login`, { waitUntil: 'domcontentloaded' });
  await p1.waitForTimeout(2000);
  
  if (!await waitForVue(p1, '#username')) {
    logBug({ page: '/', severity: 'Major', category: 'Navigation',
      title: 'Default route not showing login', description: 'Unauthenticated users should see login',
      steps: ['Navigate to root'], expected: 'Login form', actual: 'Not found' });
  } else {
    console.log('  ✓ Default route shows login');
  }
  await ctx1.close();
  
  // Test 2: Navigate to register
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE_URL}/#register`, { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(2000);
  
  if (!await waitForVue(p2, '#reg-username')) {
    logBug({ page: '/#register', severity: 'Major', category: 'Navigation',
      title: 'Cannot navigate to register', description: '#register route not working',
      steps: ['Navigate to #register'], expected: 'Register form', actual: 'Not found' });
  } else {
    console.log('  ✓ Can navigate to register');
  }
  await ctx2.close();
  
  // Test 3: Login then navigate to admin
  const { context: ctx3, page: p3 } = await loginAsAdmin(browser);
  await p3.goto(`${BASE_URL}/#admin`, { waitUntil: 'domcontentloaded' });
  await p3.waitForTimeout(2000);
  
  if (!await waitForVue(p3, '.admin-header')) {
    logBug({ page: '/#admin', severity: 'Major', category: 'Navigation',
      title: 'Cannot navigate to admin page', description: '#admin route not working for admin user',
      steps: ['Login as admin', 'Navigate to #admin'], expected: 'Admin panel', actual: 'Not found' });
  } else {
    console.log('  ✓ Can navigate to admin');
  }
  
  // Test 4: Logout flow
  if (await waitForVue(p3, '.user-btn')) {
    await p3.locator('.user-btn').click();
    await p3.waitForTimeout(500);
    
    if (await waitForVue(p3, '.btn-logout')) {
      await p3.locator('.btn-logout').click();
      await p3.waitForTimeout(3000);
      
      const hash = await p3.evaluate(() => window.location.hash);
      if (hash !== '#login') {
        logBug({ page: '/#logout', severity: 'Major', category: 'Auth/Navigation',
          title: 'Logout redirect broken', description: `After logout, hash is "${hash}" instead of "#login"`,
          steps: ['Login', 'Click user menu', 'Sign Out'], expected: '#login', actual: hash });
      } else {
        console.log('  ✓ Logout redirects to login');
      }
    }
  }
  
  await ctx3.close();
}

async function testResponsive(browser) {
  console.log('\n=== Testing Responsive Design ===');
  
  const viewports = [
    { name: 'Mobile (375px)', width: 375, height: 812 },
    { name: 'Tablet (768px)', width: 768, height: 1024 },
    { name: 'Desktop (1920px)', width: 1920, height: 1080 }
  ];
  
  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    
    // Login page
    await page.goto(`${BASE_URL}/#login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await screenshot(page, `05_${vp.width}_login`);
    
    if (!await waitForVue(page, '#username')) {
      logBug({ page: `/#login (${vp.name})`, severity: 'Major', category: 'Responsive',
        title: `Login broken at ${vp.name}`, description: `Viewport ${vp.width}x${vp.height}`,
        steps: [`Set viewport ${vp.width}x${vp.height}`, 'Navigate to #login'], expected: 'Login form', actual: 'Not found' });
    } else {
      console.log(`  ✓ Login at ${vp.name}`);
    }
    
    // Chat page (login first)
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await screenshot(page, `05_${vp.width}_chat`);
    
    if (!await waitForVue(page, '.chat-container')) {
      logBug({ page: `/#chat (${vp.name})`, severity: 'Major', category: 'Responsive',
        title: `Chat broken at ${vp.name}`, description: `Viewport ${vp.width}x${vp.height}`,
        steps: [`Set viewport ${vp.width}x${vp.height}`, 'Login'], expected: '.chat-container', actual: 'Not found' });
    } else {
      console.log(`  ✓ Chat at ${vp.name}`);
    }
    
    // Admin page
    await page.goto(`${BASE_URL}/#admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    await screenshot(page, `05_${vp.width}_admin`);
    
    if (!await waitForVue(page, '.admin-page')) {
      logBug({ page: `/#admin (${vp.name})`, severity: 'Major', category: 'Responsive',
        title: `Admin broken at ${vp.name}`, description: `Viewport ${vp.width}x${vp.height}`,
        steps: [`Set viewport ${vp.width}x${vp.height}`, 'Login', 'Navigate to #admin'], expected: '.admin-page', actual: 'Not found' });
    } else {
      console.log(`  ✓ Admin at ${vp.name}`);
    }
    
    await ctx.close();
  }
}

async function testEdgeCases(browser) {
  console.log('\n=== Testing Edge Cases ===');
  
  // Test 1: XSS in username
  const ctx1 = await browser.newContext();
  const p1 = await ctx1.newPage();
  await p1.goto(`${BASE_URL}/#login`, { waitUntil: 'domcontentloaded' });
  await p1.waitForTimeout(2000);
  
  await p1.fill('#username', '<script>alert("xss")</script>');
  const val = await p1.evaluate(() => document.getElementById('username').value);
  if (val.includes('<script>')) {
    logBug({ page: '/#login', severity: 'Major', category: 'Security',
      title: 'XSS payload not sanitized in input', description: 'Raw script tags stored in input value',
      steps: ['Navigate to #login', 'Enter <script>alert("xss")</script>'], expected: 'Sanitized', actual: val });
  } else {
    console.log('  ✓ XSS handled in input');
  }
  await ctx1.close();
  
  // Test 2: Long input
  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  await p2.goto(`${BASE_URL}/#login`, { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(2000);
  
  await p2.fill('#username', 'a'.repeat(10000));
  const len = await p2.evaluate(() => document.getElementById('username').value.length);
  if (len > 30) {
    logBug({ page: '/#login', severity: 'Minor', category: 'Validation',
      title: 'No max length on login username', description: `Input allows ${len} chars (backend limits to 30)`,
      steps: ['Navigate to #login', 'Enter 10000 chars'], expected: 'Max 30 chars', actual: `${len} chars` });
  } else {
    console.log('  ✓ Long input limited');
  }
  await ctx2.close();
  
  // Test 3: Session persistence
  const { context: ctx3, page: p3 } = await loginAsAdmin(browser);
  const beforeHeader = await waitForVue(p3, '.app-header');
  
  await p3.reload({ waitUntil: 'domcontentloaded' });
  await p3.waitForTimeout(3000);
  
  const afterHeader = await waitForVue(p3, '.app-header');
  if (!afterHeader) {
    logBug({ page: '/#chat', severity: 'Major', category: 'Auth/Session',
      title: 'Session lost on reload', description: 'User logged out after page reload',
      steps: ['Login as admin', 'Reload page'], expected: 'Stay logged in', actual: 'Logged out' });
  } else {
    console.log('  ✓ Session persists after reload');
  }
  await ctx3.close();
  
  // Test 4: Enter key submits login
  const ctx4 = await browser.newContext();
  const p4 = await ctx4.newPage();
  await p4.goto(`${BASE_URL}/#login`, { waitUntil: 'domcontentloaded' });
  await p4.waitForTimeout(2000);
  
  await p4.fill('#username', 'admin');
  await p4.fill('#password', 'admin123');
  await p4.press('#password', 'Enter');
  await p4.waitForTimeout(3000);
  
  if (!await waitForVue(p4, '.app-header')) {
    logBug({ page: '/#login', severity: 'Major', category: 'UX',
      title: 'Enter key does not submit login', description: 'Pressing Enter should submit the form',
      steps: ['Fill credentials', 'Press Enter'], expected: 'Form submitted', actual: 'Still on login' });
  } else {
    console.log('  ✓ Enter key submits form');
  }
  await ctx4.close();
}

async function testAPI() {
  console.log('\n=== Testing API Endpoints ===');
  
  // Register
  const reg = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `api_${Date.now()}`, email: `api_${Date.now()}@x.com`, password: 'pass123' })
  });
  if (reg.status !== 201) logBug({ page: 'API', severity: 'Major', category: 'Backend',
    title: 'Registration API failed', description: `Status: ${reg.status}`, steps: ['POST /api/auth/register'], expected: '201', actual: reg.status });
  else console.log('  ✓ Registration works');
  
  // Login
  const login = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  if (login.status !== 200) logBug({ page: 'API', severity: 'Critical', category: 'Backend',
    title: 'Login API failed', description: `Status: ${login.status}`, steps: ['POST /api/auth/login'], expected: '200', actual: login.status });
  else {
    console.log('  ✓ Login works');
    const data = await login.json();
    
    // Me
    const me = await fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${data.token}` } });
    if (me.status !== 200) logBug({ page: 'API', severity: 'Major', category: 'Backend',
      title: 'GET /api/auth/me failed', description: `Status: ${me.status}`, steps: ['GET /api/auth/me'], expected: '200', actual: me.status });
    else console.log('  ✓ GET /api/auth/me works');
    
    // Users
    const users = await fetch(`${API_URL}/api/users`, { headers: { Authorization: `Bearer ${data.token}` } });
    if (users.status !== 200) logBug({ page: 'API', severity: 'Major', category: 'Backend',
      title: 'GET /api/users failed', description: `Status: ${users.status}`, steps: ['GET /api/users'], expected: '200', actual: users.status });
    else console.log(`  ✓ GET /api/users works (${(await users.json()).length} users)`);
    
    // Roles
    const roles = await fetch(`${API_URL}/api/roles`, { headers: { Authorization: `Bearer ${data.token}` } });
    if (roles.status !== 200) logBug({ page: 'API', severity: 'Major', category: 'Backend',
      title: 'GET /api/roles failed', description: `Status: ${roles.status}`, steps: ['GET /api/roles'], expected: '200', actual: roles.status });
    else console.log(`  ✓ GET /api/roles works (${(await roles.json()).length} roles)`);
  }
  
  // Unauthenticated access
  const unauth = await fetch(`${API_URL}/api/users`);
  if (unauth.status !== 401) logBug({ page: 'API', severity: 'Critical', category: 'Security',
    title: 'Unauthenticated access allowed', description: `Status: ${unauth.status}`, steps: ['GET /api/users without token'], expected: '401', actual: unauth.status });
  else console.log('  ✓ Unauthenticated access blocked');
  
  // Health check
  const health = await fetch(`${API_URL}/health`);
  if (health.status !== 200) logBug({ page: 'API', severity: 'Major', category: 'Backend',
    title: 'Health check failed', description: `Status: ${health.status}`, steps: ['GET /health'], expected: '200', actual: health.status });
  else console.log('  ✓ Health check works');
  
  // Duplicate username
  const dup = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', email: 'dup@x.com', password: 'pass123' })
  });
  if (dup.status !== 409) logBug({ page: 'API', severity: 'Major', category: 'Backend',
    title: 'Duplicate username not rejected', description: `Status: ${dup.status}`, steps: ['POST /api/auth/register with "admin"'], expected: '409', actual: dup.status });
  else console.log('  ✓ Duplicate username rejected (409)');
  
  // Short password
  const short = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: `short_${Date.now()}`, email: 'short@x.com', password: 'abc' })
  });
  if (short.status !== 400) logBug({ page: 'API', severity: 'Major', category: 'Backend',
    title: 'Short password not rejected', description: `Status: ${short.status}`, steps: ['POST with 3-char password'], expected: '400', actual: short.status });
  else console.log('  ✓ Short password rejected (400)');
}

// ========== MAIN ==========
async function main() {
  console.log('Starting frontend testing...');
  console.log(`Frontend: ${BASE_URL}`);
  console.log(`Backend: ${API_URL}\n`);
  
  const browser = await chromium.launch({ headless: true });
  
  try {
    await testAPI();
    await testLoginPage(browser);
    await testRegisterPage(browser);
    await testChatPage(browser);
    await testAdminPage(browser);
    await testNavigation(browser);
    await testResponsive(browser);
    await testEdgeCases(browser);
  } finally {
    await browser.close();
  }
  
  // Write report
  let report = `# Frontend Test Report\n\nGenerated: ${new Date().toISOString()}\nTotal bugs: ${bugs.length}\n\n`;
  report += '## Summary\n';
  report += `- Critical: ${bugs.filter(b => b.severity === 'Critical').length}\n`;
  report += `- Major: ${bugs.filter(b => b.severity === 'Major').length}\n`;
  report += `- Minor: ${bugs.filter(b => b.severity === 'Minor').length}\n`;
  report += `- Cosmetic: ${bugs.filter(b => b.severity === 'Cosmetic').length}\n\n`;
  
  report += '## Bugs\n\n';
  for (const b of bugs) {
    report += `### #${b.id}: ${b.title}\n`;
    report += `- **Severity**: ${b.severity}\n- **Category**: ${b.category}\n`;
    report += `- **Page**: ${b.page}\n- **Description**: ${b.description}\n`;
    report += `- **Steps**: ${b.steps.join(' → ')}\n`;
    report += `- **Expected**: ${b.expected}\n- **Actual**: ${b.actual}\n`;
    report += `- **Status**: Open\n\n`;
  }
  
  writeFileSync('.agents/testing/BUGS_FOUND.md', report);
  
  console.log('\n' + '='.repeat(60));
  console.log('TESTING COMPLETE');
  console.log(`Bugs found: ${bugs.length}`);
  console.log(`  Critical: ${bugs.filter(b => b.severity === 'Critical').length}`);
  console.log(`  Major: ${bugs.filter(b => b.severity === 'Major').length}`);
  console.log(`  Minor: ${bugs.filter(b => b.severity === 'Minor').length}`);
  console.log('='.repeat(60));
  console.log('\nReport: .agents/testing/BUGS_FOUND.md');
  console.log('Screenshots: .agents/testing/SNAPSHOTS/');
}

main().catch(err => {
  console.error('Test error:', err);
  writeFileSync('.agents/testing/BUGS_FOUND.md', `# Test Error\n\n${err.stack}`);
  process.exit(1);
});
