import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

await page.goto('http://localhost:5173/#login', { waitUntil: 'domcontentloaded', timeout: 10000 });
await page.waitForTimeout(5000);

// Check Vue app state
const state = await page.evaluate(() => {
  // Try to access Vue app instance
  const appEl = document.getElementById('app');
  const vueApp = appEl?.__vue_app__;
  
  // Check if there's a global Vue instance
  const vueInstance = window.__VUE_DEVTOOLS_GLOBAL_HOOK__?.apps?.[0]?._instance?.proxy;
  
  // Check localStorage
  const token = localStorage.getItem('betty_token');
  
  return {
    hash: window.location.hash,
    tokenInStorage: token,
    vueApp: !!vueApp,
    vueInstance: !!vueInstance,
  };
});

console.log('State:', JSON.stringify(state, null, 2));

// Try to check the rendered component
const rendered = await page.evaluate(() => {
  // Check for comment markers that Vue uses for v-if
  const html = document.getElementById('app').innerHTML;
  return {
    hasAuthViews: html.includes('Auth Views'),
    hasMainApp: html.includes('Main App'),
    hasChatView: html.includes('Chat View'),
    hasLogin: html.includes('Login'),
    hasAdmin: html.includes('Admin'),
    hasInputArea: html.includes('input-area'),
    hasAuthPage: html.includes('auth-page'),
  };
});

console.log('Rendered:', JSON.stringify(rendered, null, 2));

// Try navigating to #register
await page.goto('http://localhost:5173/#register', { waitUntil: 'domcontentloaded', timeout: 10000 });
await page.waitForTimeout(3000);

const registerState = await page.evaluate(() => {
  const html = document.getElementById('app').innerHTML;
  return {
    hasAuthPage: html.includes('auth-page'),
    hasRegister: html.includes('Create your account'),
    hasUsername: html.includes('reg-username') || html.includes('Username'),
  };
});

console.log('Register page state:', JSON.stringify(registerState, null, 2));

// Check if there's a Vue component error
const vueErrors = await page.evaluate(() => {
  const errors = [];
  // Check for Vue error handlers
  if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
    errors.push('Vue devtools hook present');
  }
  return errors;
});
console.log('Vue errors:', vueErrors);

await browser.close();
