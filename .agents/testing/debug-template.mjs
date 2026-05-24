import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

const consoleMessages = [];
page.on('console', (msg) => {
  if (msg.type() === 'log' || msg.type() === 'error' || msg.type() === 'warn') {
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

// Check the Vue app's internal state
const vueState = await page.evaluate(() => {
  // Try to access the Vue app instance
  const appEl = document.getElementById('app');
  
  // Check all child elements of #app
  const children = [];
  for (let i = 0; i < appEl.children.length; i++) {
    const child = appEl.children[i];
    children.push({
      tag: child.tagName,
      class: child.className,
      id: child.id,
      text: (child.textContent || '').substring(0, 100),
    });
  }
  
  // Check for any hidden elements (display: none)
  const hiddenElements = [];
  const walker = document.createTreeWalker(appEl, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    const style = window.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden') {
      hiddenElements.push({
        tag: node.tagName,
        class: node.className,
        text: (node.textContent || '').substring(0, 50),
      });
    }
    node = walker.nextNode();
  }
  
  return {
    children,
    hiddenElements: hiddenElements.slice(0, 20),
  };
});

console.log('=== Vue App Children ===');
vueState.children.forEach(c => console.log(`  <${c.tag}> class="${c.class}" text="${c.text}"`));

console.log('\n=== Hidden Elements ===');
vueState.hiddenElements.forEach(c => console.log(`  <${c.tag}> class="${c.class}" text="${c.text}"`));

// Check if there's a Login component hidden somewhere
const hasLoginComponent = await page.evaluate(() => {
  const app = document.getElementById('app');
  if (!app) return false;
  
  // Check for Login component markers
  const walker = document.createTreeWalker(app, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    const text = (node.textContent || '').toLowerCase();
    if (text.includes('sign in to your account') || 
        text.includes('enter your username') ||
        text.includes('enter your password') ||
        text.includes('sign in')) {
      return true;
    }
    node = walker.nextNode();
  }
  return false;
});

console.log('\n=== Login Component Found ===');
console.log('  Login component visible:', hasLoginComponent);

// Print all console messages
console.log('\n=== All Console Messages ===');
consoleMessages.forEach(m => console.log(`  [${m.type}] ${m.text}`));

await browser.close();
