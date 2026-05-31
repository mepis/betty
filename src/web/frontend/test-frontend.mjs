// Playwright frontend test for betty-web
import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:3000';
const SNAPSHOT_DIR = '/home/jon/git/betty/.agents/testing/SNAPSHOTS';
const issues = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Collect console errors
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    consoleErrors.push(`[${msg.type()}] ${msg.text()}`);
  }
});
page.on('pageerror', (err) => {
  consoleErrors.push(`[pageerror] ${err.message}`);
});

console.log('=== Phase 3: Frontend User-Flow Testing ===\n');

// Test 1: Page loads
console.log('Test 1: Page loads...');
try {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SNAPSHOT_DIR}/01-homepage.png`, fullPage: true });
  const title = await page.title();
  console.log(`  Title: "${title}"`);
  
  // Check for key elements
  const hasInput = await page.locator('textarea').first().isVisible().catch(() => false);
  const hasSendBtn = await page.locator('button:has-text("Send")').first().isVisible().catch(() => false);
  const hasToolbar = await page.locator('button:has-text("New Session")').first().isVisible().catch(() => false);
  
  console.log(`  Has textarea: ${hasInput}`);
  console.log(`  Has Send button: ${hasSendBtn}`);
  console.log(`  Has toolbar: ${hasToolbar}`);
  
  if (!hasInput) issues.push('Missing textarea input');
  if (!hasSendBtn) issues.push('Missing Send button');
  if (!hasToolbar) issues.push('Missing toolbar');
} catch (err) {
  issues.push(`Page load failed: ${err.message}`);
}

// Test 2: Textarea interaction
console.log('\nTest 2: Textarea interaction...');
try {
  const textarea = page.locator('textarea').first();
  await textarea.click();
  await textarea.fill('Hello, test message');
  const val = await textarea.inputValue();
  console.log(`  Textarea filled: "${val}"`);
  if (val !== 'Hello, test message') {
    issues.push(`Textarea fill failed: expected "Hello, test message", got "${val}"`);
  }
  await textarea.fill(''); // Clear
  await page.screenshot({ path: `${SNAPSHOT_DIR}/02-textarea-filled.png`, fullPage: true });
} catch (err) {
  issues.push(`Textarea interaction failed: ${err.message}`);
}

// Test 3: Send button disabled when empty
console.log('\nTest 3: Send button state...');
try {
  const sendBtn = page.locator('button:has-text("Send")').first();
  const isDisabled = await sendBtn.isDisabled();
  console.log(`  Send button disabled when empty: ${isDisabled}`);
  if (!isDisabled) issues.push('Send button should be disabled when textarea is empty');
  
  // Fill textarea and check
  await page.locator('textarea').first().fill('test');
  const isDisabledAfter = await sendBtn.isDisabled();
  console.log(`  Send button disabled after fill: ${isDisabledAfter}`);
  if (isDisabledAfter) issues.push('Send button should be enabled when textarea has content');
  await page.locator('textarea').first().fill('');
} catch (err) {
  issues.push(`Send button check failed: ${err.message}`);
}

// Test 4: Toolbar buttons exist
console.log('\nTest 4: Toolbar buttons...');
try {
  const buttons = ['New Session', 'Compact', 'Cycle Model', 'Clear View'];
  for (const btnText of buttons) {
    const btn = page.locator(`button:has-text("${btnText}")`).first();
    const exists = await btn.count() > 0;
    console.log(`  "${btnText}" button exists: ${exists}`);
    if (!exists) issues.push(`Missing toolbar button: "${btnText}"`);
  }
} catch (err) {
  issues.push(`Toolbar button check failed: ${err.message}`);
}

// Test 5: Mobile hamburger menu
console.log('\nTest 5: Mobile hamburger menu...');
try {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(500);
  
  // Check for hamburger button
  const hamburger = page.locator('button[aria-label="Menu"]').first();
  const hasHamburger = await hamburger.count() > 0;
  console.log(`  Hamburger button exists: ${hasHamburger}`);
  
  if (hasHamburger) {
    await hamburger.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SNAPSHOT_DIR}/03-mobile-menu.png`, fullPage: true });
    
    // Check dropdown items
    const dropdownItems = ['New Session', 'Compact', 'Cycle Model', 'Clear View'];
    for (const item of dropdownItems) {
      const exists = await page.locator(`div:has-text("${item}") button`).first().isVisible().catch(() => false);
      console.log(`  Mobile menu "${item}" visible: ${exists}`);
    }
  }
} catch (err) {
  issues.push(`Mobile menu test failed: ${err.message}`);
}

// Test 6: Responsive design at different widths
console.log('\nTest 6: Responsive design...');
for (const [name, width] of [['tablet-768', 768], ['desktop-1920', 1920]]) {
  try {
    await page.setViewportSize({ width, height: 720 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SNAPSHOT_DIR}/04-${name}.png`, fullPage: true });
    console.log(`  ${name}: OK`);
  } catch (err) {
    issues.push(`Responsive test ${name} failed: ${err.message}`);
  }
}

// Test 7: Empty state
console.log('\nTest 7: Empty state...');
try {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForTimeout(2000);
  
  const hasEmptyState = await page.locator('div').filter({ hasText: /say something/i }).first().isVisible().catch(() => false);
  console.log(`  Empty state visible: ${hasEmptyState}`);
} catch (err) {
  issues.push(`Empty state test failed: ${err.message}`);
}

// Test 8: Console errors
console.log('\nTest 8: Console errors...');
if (consoleErrors.length > 0) {
  for (const err of consoleErrors) {
    console.log(`  ERROR: ${err}`);
    issues.push(`Console error: ${err}`);
  }
} else {
  console.log('  No console errors');
}

// Test 9: WebSocket connection status
console.log('\nTest 9: WebSocket connection status...');
try {
  const statusBar = page.locator('div').filter({ hasText: /connecting|connected|idle|busy/ }).first();
  const statusText = await statusBar.innerText().catch(() => 'not found');
  console.log(`  Status bar text: "${statusText}"`);
} catch (err) {
  issues.push(`Status check failed: ${err.message}`);
}

// Test 10: User journey - send a message
console.log('\nTest 10: User journey - send a message...');
try {
  const textarea = page.locator('textarea').first();
  await textarea.click();
  await textarea.fill('Test user message');
  await page.waitForTimeout(500);
  
  // Click send
  const sendBtn = page.locator('button:has-text("Send")').first();
  await sendBtn.click();
  await page.waitForTimeout(3000);
  
  // Check that the message appeared
  const hasUserMessage = await page.locator('div').filter({ hasText: 'Test user message' }).first().isVisible().catch(() => false);
  console.log(`  User message visible: ${hasUserMessage}`);
  
  // Check for error state (since pi RPC is not running)
  const hasError = await page.locator('div').filter({ hasText: /error|failed|failed/i }).first().isVisible().catch(() => false);
  console.log(`  Error notification visible: ${hasError}`);
  
  await page.screenshot({ path: `${SNAPSHOT_DIR}/05-message-sent.png`, fullPage: true });
} catch (err) {
  issues.push(`Send message test failed: ${err.message}`);
}

// Test 11: Keyboard shortcut - Enter to send
console.log('\nTest 11: Keyboard shortcut - Enter to send...');
try {
  // Clear and type
  await page.locator('textarea').first().fill('');
  await page.locator('textarea').first().fill('Enter to send test');
  await page.waitForTimeout(500);
  
  // Simulate Enter key
  await page.locator('textarea').first().press('Enter');
  await page.waitForTimeout(2000);
  
  // Check if message was sent
  const hasMessage = await page.locator('div').filter({ hasText: 'Enter to send test' }).first().isVisible().catch(() => false);
  console.log(`  Message sent via Enter key: ${hasMessage}`);
} catch (err) {
  issues.push(`Enter key test failed: ${err.message}`);
}

// Test 12: Abort button
console.log('\nTest 12: Abort button...');
try {
  const abortBtn = page.locator('button:has-text("Abort")').first();
  const abortVisible = await abortBtn.isVisible().catch(() => false);
  console.log(`  Abort button visible: ${abortVisible}`);
} catch (err) {
  issues.push(`Abort button test failed: ${err.message}`);
}

await browser.close();

// Summary
console.log('\n=== TEST SUMMARY ===');
console.log(`Total issues: ${issues.length}`);
for (const issue of issues) {
  console.log(`  - ${issue}`);
}
console.log(`Console errors: ${consoleErrors.length}`);
console.log('Snapshots saved to:', SNAPSHOT_DIR);

// Write results to file for the orchestrator
const fs = await import('fs');
fs.writeFileSync('/home/jon/git/betty/.agents/testing/FRONTEND_TEST_RESULTS.json', JSON.stringify({
  totalTests: 12,
  issues,
  consoleErrors,
  timestamp: new Date().toISOString()
}, null, 2));

process.exit(issues.length > 0 ? 1 : 0);
