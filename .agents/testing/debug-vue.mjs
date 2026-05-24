import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

// Add a script to inject before the app loads
await page.addInitScript(() => {
  window.__DEBUG = {
    currentPage: null,
    isAuthenticated: null,
    token: null,
  };
});

await page.goto('http://localhost:5173/#login', { waitUntil: 'domcontentloaded', timeout: 10000 });
await page.waitForTimeout(5000);

// Check for any Vue error in console
const errors = await page.evaluate(() => {
  const logs = [];
  // Check for Vue warnings/errors in the page
  const appEl = document.getElementById('app');
  if (appEl) {
    // Check for Vue component instances
    const children = appEl.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.__vueParentComponent) {
        logs.push(`Component at index ${i}: ${child.__vueParentComponent?.type?.name || 'unknown'}`);
      }
    }
  }
  return logs;
});
console.log('Vue components found:', errors);

// Check the actual visible content
const visibleContent = await page.evaluate(() => {
  const app = document.getElementById('app');
  if (!app) return 'No app element';
  
  // Check which elements are actually visible (not display:none)
  const elements = [];
  const walker = document.createTreeWalker(app, NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode;
  while (node) {
    const style = window.getComputedStyle(node);
    if (style.display !== 'none' && style.visibility !== 'hidden') {
      const tag = node.tagName.toLowerCase();
      const classes = node.className?.baseVal || node.className || '';
      const text = node.textContent?.trim().substring(0, 50) || '';
      if (tag !== 'script' && tag !== 'style' && text.length > 0) {
        elements.push(`${tag}.${classes.split(' ').slice(0, 3).join('.')} : "${text}"`);
      }
    }
    node = walker.nextNode();
  }
  return elements;
});

console.log('Visible elements:');
visibleContent.forEach(e => console.log('  ', e));

// Check for Vue devtools
const hasVueDevtools = await page.evaluate(() => {
  return !!window.__VUE_DEVTOOLS_GLOBAL_HOOK__;
});
console.log('Has Vue devtools:', hasVueDevtools);

// Check localStorage
const ls = await page.evaluate(() => {
  const items = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    items[key] = localStorage.getItem(key)?.substring(0, 50);
  }
  return items;
});
console.log('localStorage:', JSON.stringify(ls, null, 2));

// Check if there's a CSP or security issue
const csp = await page.evaluate(() => {
  const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  return meta?.content || 'none';
});
console.log('CSP:', csp);

// Check for any JavaScript errors in the page
const jsErrors = await page.evaluate(() => {
  return window.__DEBUG || 'not set';
});
console.log('Debug:', JSON.stringify(jsErrors, null, 2));

// Let's check the actual rendered DOM more carefully
const domStructure = await page.evaluate(() => {
  const app = document.getElementById('app');
  if (!app) return 'NO APP';
  
  // Get all text nodes that are visible
  const texts = [];
  const walker = document.createTreeWalker(app, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (parent && window.getComputedStyle(parent).display !== 'none') {
      const text = node.textContent.trim();
      if (text.length > 2) {
        texts.push(text.substring(0, 100));
      }
    }
    node = walker.nextNode();
  }
  return texts;
});

console.log('Visible text content:');
domStructure.forEach(t => console.log('  ', t));

await browser.close();
