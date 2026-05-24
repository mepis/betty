import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

// Clear everything first
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });

// Navigate to login with a fresh load
await page.goto('http://localhost:5173/#login', { 
  waitUntil: 'networkidle', 
  timeout: 15000 
});
await page.waitForTimeout(3000);

// Force a full reload to clear any HMR state
await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
await page.waitForTimeout(3000);

// Check localStorage
const ls = await page.evaluate(() => JSON.stringify({
  betty_token: localStorage.getItem('betty_token'),
  allKeys: Array.from({length: localStorage.length}, (_, i) => localStorage.key(i)),
}));
console.log('localStorage:', ls);

// Check the hash
const hash = await page.evaluate(() => window.location.hash);
console.log('Hash:', hash);

// Check what Vue renders
const rendered = await page.evaluate(() => {
  const app = document.getElementById('app');
  if (!app) return 'NO_APP';
  
  // Check for login-specific text
  const bodyText = document.body.textContent || '';
  return {
    hasSignInToAccount: bodyText.includes('Sign in to your account'),
    hasCreateAccount: bodyText.includes('Create your account'),
    hasWelcomeToPiChat: bodyText.includes('Welcome to Pi Chat'),
    hasAskPiAnything: bodyText.includes('Ask Pi anything'),
    hasUsernameLabel: bodyText.includes('Username'),
    hasPasswordLabel: bodyText.includes('Password'),
    hasSignUp: bodyText.includes('Sign up'),
    hasSignIn: bodyText.includes('Sign in'),
    hasNewChat: bodyText.includes('New Chat'),
    hasOffline: bodyText.includes('Offline'),
    hasPiChatHeader: bodyText.includes('Pi Chat'),
    first100Chars: bodyText.substring(0, 100),
  };
});

console.log('Rendered content:', JSON.stringify(rendered, null, 2));

// Check for any Vue errors
const vueErrors = await page.evaluate(() => {
  const errors = [];
  // Check for Vue error boundary
  const errorBoundaries = document.querySelectorAll('.vue-error');
  errorBoundaries.forEach(el => errors.push(el.textContent));
  return errors;
});
console.log('Vue errors:', vueErrors);

// Check CSS - is the login form hidden by CSS?
const cssCheck = await page.evaluate(() => {
  const inputs = document.querySelectorAll('input');
  return inputs.map(i => ({
    id: i.id,
    type: i.type,
    placeholder: i.placeholder,
    display: window.getComputedStyle(i).display,
    visibility: window.getComputedStyle(i).visibility,
    opacity: window.getComputedStyle(i).opacity,
  }));
});
console.log('Inputs:', JSON.stringify(cssCheck, null, 2));

// Check all divs for auth-related classes
const divs = await page.evaluate(() => {
  const divs = document.querySelectorAll('div');
  return divs.map(d => ({
    classes: d.className,
    text: (d.textContent || '').substring(0, 50),
    display: window.getComputedStyle(d).display,
  })).filter(d => d.classes.includes('auth') || d.classes.includes('login') || d.classes.includes('chat') || d.classes.includes('app'));
});
console.log('Relevant divs:', JSON.stringify(divs, null, 2));

// Check all spans for auth-related text
const spans = await page.evaluate(() => {
  const spans = document.querySelectorAll('span');
  return spans.map(s => ({
    text: (s.textContent || '').substring(0, 50),
    classes: s.className,
  })).filter(s => s.text.includes('Sign') || s.text.includes('Login') || s.text.includes('auth'));
});
console.log('Relevant spans:', JSON.stringify(spans, null, 2));

await browser.close();
