import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();

// First, clear all storage
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// Now navigate to login
await page.goto('http://localhost:5173/#login', { waitUntil: 'domcontentloaded', timeout: 10000 });
await page.waitForTimeout(5000);

// Check what's rendered
const result = await page.evaluate(() => {
  const html = document.getElementById('app').innerHTML;
  
  // Check for specific Vue comment markers
  const hasAuthViews = html.includes('Auth Views');
  const hasMainApp = html.includes('Main App');
  const hasChatView = html.includes('Chat View');
  const hasLoginView = html.includes('Login');
  const hasRegisterView = html.includes('Register');
  const hasAdminPanel = html.includes('Admin Panel');
  
  // Check for specific elements
  const hasAuthPage = html.includes('auth-page');
  const hasAuthCard = html.includes('auth-card');
  const hasLoginForm = html.includes('auth-form');
  const hasChatContainer = html.includes('chat-container');
  const hasInputArea = html.includes('input-area');
  const hasWelcomeScreen = html.includes('welcome-screen');
  
  // Check for visible text content
  const visibleText = document.body.textContent || '';
  const hasPiChat = visibleText.includes('Pi Chat');
  const hasSignIn = visibleText.includes('Sign in');
  const hasSignUp = visibleText.includes('Sign up');
  const hasWelcome = visibleText.includes('Welcome to Pi Chat');
  const hasAskPi = visibleText.includes('Ask Pi');
  
  // Check for Vue component markers
  const hasCommentMarkers = html.includes('<!--');
  const hasVIfComments = html.includes('<!--v-if-->');
  
  return {
    hasAuthViews, hasMainApp, hasChatView, hasLoginView, hasRegisterView, hasAdminPanel,
    hasAuthPage, hasAuthCard, hasLoginForm, hasChatContainer, hasInputArea, hasWelcomeScreen,
    hasPiChat, hasSignIn, hasSignUp, hasWelcome, hasAskPi,
    hasCommentMarkers, hasVIfComments,
    htmlLength: html.length,
    first200: html.substring(0, 200),
  };
});

console.log('Analysis:');
console.log('  Auth views:', result.hasAuthViews);
console.log('  Main app:', result.hasMainApp);
console.log('  Chat view:', result.hasChatView);
console.log('  Login view:', result.hasLoginView);
console.log('  Register view:', result.hasRegisterView);
console.log('  Admin panel:', result.hasAdminPanel);
console.log('  Auth page:', result.hasAuthPage);
console.log('  Auth card:', result.hasAuthCard);
console.log('  Login form:', result.hasLoginForm);
console.log('  Chat container:', result.hasChatContainer);
console.log('  Input area:', result.hasInputArea);
console.log('  Welcome screen:', result.hasWelcomeScreen);
console.log('  Has "Pi Chat":', result.hasPiChat);
console.log('  Has "Sign in":', result.hasSignIn);
console.log('  Has "Sign up":', result.hasSignUp);
console.log('  Has "Welcome":', result.hasWelcome);
console.log('  Has "Ask Pi":', result.hasAskPi);
console.log('  HTML length:', result.htmlLength);
console.log('  First 200 chars:', result.first200);

// Check localStorage
const ls = await page.evaluate(() => {
  const items = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    items[key] = localStorage.getItem(key)?.substring(0, 50);
  }
  return items;
});
console.log('\nlocalStorage:', JSON.stringify(ls, null, 2));

// Try a direct request to the login page
const loginPageResponse = await page.goto('http://localhost:5173/#login', { 
  waitUntil: 'networkidle', 
  timeout: 10000 
});
console.log('\nLogin page status:', loginPageResponse.status());

// Check network requests
const requests = await page.evaluate(() => {
  const entries = performance.getEntriesByType('resource');
  return entries
    .filter(e => e.initiatorType === 'fetch' || e.initiatorType === 'xmlhttprequest')
    .map(e => ({ url: e.name, type: e.initiatorType }));
});
console.log('Network requests:', JSON.stringify(requests, null, 2));

await browser.close();
