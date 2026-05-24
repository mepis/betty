import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

await page.goto('http://localhost:5173/#login', { waitUntil: 'domcontentloaded', timeout: 10000 });
await page.waitForTimeout(5000);

// Print the innerHTML of the app element
const innerHTML = await page.evaluate(() => document.getElementById('app').innerHTML);
console.log('=== APP INNER HTML ===');
console.log(innerHTML.substring(0, 5000));

// Check for specific elements
const selectors = ['#username', '#password', 'button[type="submit"]', '.auth-page', '.auth-card', '.auth-form', 'input[type="text"]', 'input[type="password"]', 'input'];
for (const sel of selectors) {
  const count = await page.$$eval(sel, els => els.length);
  console.log(`Element '${sel}': ${count} found`);
}

// Check the hash
const hash = await page.evaluate(() => window.location.hash);
console.log(`Hash: ${hash}`);

// Check if Vue is mounted
const vueMounted = await page.evaluate(() => {
  return !!document.querySelector('#app');
});
console.log(`Vue app mounted: ${vueMounted}`);

// Check for any error messages
const errors = await page.evaluate(() => {
  const errorElements = document.querySelectorAll('.auth-error');
  return Array.from(errorElements).map(el => el.textContent);
});
console.log(`Error messages: ${JSON.stringify(errors)}`);

await browser.close();
