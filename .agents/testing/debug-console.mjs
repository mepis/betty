import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

const consoleMessages = [];
page.on('console', (msg) => {
  consoleMessages.push({ type: msg.type(), text: msg.text() });
});

// Clear everything first
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

// Navigate to login
await page.goto('http://localhost:5173/#login', { 
  waitUntil: 'networkidle', 
  timeout: 15000 
});
await page.waitForTimeout(3000);

// Full reload
await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(3000);

// Print console messages
console.log('=== Console Messages ===');
consoleMessages.forEach(m => console.log(`  [${m.type}] ${m.text}`));

// Check page content
const content = await page.evaluate(() => {
  const bodyText = document.body.textContent || '';
  return {
    hasWelcomeToPiChat: bodyText.includes('Welcome to Pi Chat'),
    hasSignInToAccount: bodyText.includes('Sign in to your account'),
  };
});
console.log('\nPage content:', JSON.stringify(content, null, 2));

await browser.close();
