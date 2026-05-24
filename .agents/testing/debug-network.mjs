import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

// Track all network requests
const requests = [];
page.on('request', (req) => {
  requests.push({
    url: req.url(),
    method: req.method(),
    resourceType: req.resourceType(),
  });
});

// Clear everything first
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

// Navigate to login with a fresh load
await page.goto('http://localhost:5173/#login', { 
  waitUntil: 'networkidle', 
  timeout: 15000 
});
await page.waitForTimeout(3000);

// Force a full reload
await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(3000);

// Get all requests
console.log('All network requests:');
requests.forEach(r => console.log(`  ${r.method} ${r.resourceType}: ${r.url}`));

// Check for /api/auth/me requests (which would indicate the app is trying to fetch user)
const authRequests = requests.filter(r => r.url.includes('/api/auth'));
console.log('\nAuth requests:', JSON.stringify(authRequests, null, 2));

// Check for fetch/XHR requests
const fetchRequests = requests.filter(r => r.resourceType === 'fetch' || r.resourceType === 'xhr');
console.log('\nFetch/XHR requests:', JSON.stringify(fetchRequests, null, 2));

// Now check the page content
const content = await page.evaluate(() => {
  const bodyText = document.body.textContent || '';
  return {
    hasWelcomeToPiChat: bodyText.includes('Welcome to Pi Chat'),
    hasSignInToAccount: bodyText.includes('Sign in to your account'),
  };
});
console.log('\nContent:', JSON.stringify(content, null, 2));

// Check if there's a Vue error by looking at the page's error handler
const vueState = await page.evaluate(() => {
  // Try to find any Vue component instances
  const app = document.getElementById('app');
  if (!app) return 'NO_APP';
  
  // Check for Vue 3 component markers
  const vueMarkers = [];
  const walker = document.createTreeWalker(app, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    if (node.__vueParentComponent) {
      vueMarkers.push({
        tag: node.tagName,
        name: node.__vueParentComponent.type?.name || 'anonymous',
        classes: node.className || '',
      });
    }
    node = walker.nextNode();
  }
  return vueMarkers;
});
console.log('Vue components:', JSON.stringify(vueState, null, 2));

await browser.close();
