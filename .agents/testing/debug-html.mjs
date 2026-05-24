import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

const consoleMessages = [];
page.on('console', (msg) => {
  if (msg.type() === 'log' || msg.type() === 'error') {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  }
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

// Get the full HTML of the app element
const html = await page.evaluate(() => {
  const app = document.getElementById('app');
  if (!app) return 'NO_APP';
  return app.innerHTML;
});

console.log('\n=== App HTML (first 2000 chars) ===');
console.log(html.substring(0, 2000));

// Check for specific elements in the HTML
const checks = {
  hasAuthPage: html.includes('auth-page'),
  hasAuthCard: html.includes('auth-card'),
  hasAuthHeader: html.includes('auth-header'),
  hasAuthForm: html.includes('auth-form'),
  hasUsernameInput: html.includes('id="username"') || html.includes('id=\'username\''),
  hasPasswordInput: html.includes('id="password"') || html.includes('id=\'password\''),
  hasSignInToAccount: html.includes('Sign in to your account'),
  hasChatContainer: html.includes('chat-container'),
  hasWelcomeScreen: html.includes('welcome-screen'),
  hasInputArea: html.includes('input-area'),
  hasAskPi: html.includes('Ask Pi'),
};

console.log('\n=== HTML Checks ===');
Object.entries(checks).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

// Check all text content
const allText = await page.evaluate(() => {
  const app = document.getElementById('app');
  if (!app) return '';
  return app.textContent;
});

console.log('\n=== App Text Content ===');
console.log(allText.substring(0, 500));

await browser.close();
