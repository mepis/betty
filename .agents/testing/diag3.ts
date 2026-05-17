import { chromium } from "playwright";
import * as fs from "fs";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    executablePath: '/usr/bin/google-chrome-stable',
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Collect ALL messages
  const allMessages: string[] = [];
  page.on("console", msg => {
    allMessages.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`  [${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", err => {
    allMessages.push(`[PAGE ERROR] ${err.message}`);
    console.log(`  [PAGE ERROR] ${err.message}`);
    console.log(`  Full error object: ${JSON.stringify(err)}`);
  });

  // Navigate
  console.log("Navigating to http://localhost:5173...");
  try {
    await page.goto("http://localhost:5173", { waitUntil: "networkidle", timeout: 30000 });
  } catch (e) {
    console.log(`  Navigation issue: ${e}`);
  }
  await page.waitForTimeout(5000);
  
  // Inject error handler
  await page.evaluate(() => {
    // Override console.error to capture stack traces
    const origError = console.error;
    console.error = function(...args: any[]) {
      args.forEach(arg => {
        if (arg && typeof arg === 'object' && arg.stack) {
          console.log(`  [STACK] ${arg.stack}`);
        }
      });
      origError.apply(console, args);
    };
    
    // Override unhandledrejection
    window.addEventListener('unhandledrejection', (e) => {
      console.log(`  [UNHANDLED REJECTION] ${e.reason}`);
      if (e.reason && e.reason.stack) {
        console.log(`  [REJECTION STACK] ${e.reason.stack}`);
      }
    });
  });
  
  // Reload to catch errors with the new handler
  console.log("\nReloading page with error handler...");
  try {
    await page.reload({ waitUntil: "networkidle", timeout: 30000 });
  } catch (e) {
    console.log(`  Reload issue: ${e}`);
  }
  await page.waitForTimeout(5000);
  
  // Check app state
  const appState = await page.evaluate(() => {
    const app = document.getElementById('app');
    return {
      innerHTML: app?.innerHTML?.substring(0, 1000) || 'EMPTY',
      childCount: app?.childElementCount || 0,
      hasVueAttrs: document.querySelector('[data-v-app]') !== null,
    };
  });
  console.log(`\nApp state: ${JSON.stringify(appState, null, 2)}`);
  
  // Check for network errors
  const networkErrors = await page.evaluate(() => {
    const entries = performance.getEntriesByType('resource');
    const failed = entries.filter((e: any) => e.responseStatus >= 400);
    return failed.map((e: any) => `${e.name} (${e.responseStatus})`);
  });
  console.log(`\nNetwork errors: ${networkErrors.length}`);
  networkErrors.forEach(e => console.log(`  - ${e}`));
  
  // Take screenshot
  fs.mkdirSync(".agents/testing/SNAPSHOTS", { recursive: true });
  await page.screenshot({ path: ".agents/testing/SNAPSHOTS/diag-home3.png", fullPage: true });
  console.log("\nScreenshot: diag-home3.png");
  
  // Write all messages to file
  fs.writeFileSync('.agents/testing/SNAPSHOTS/console-messages.txt', allMessages.join('\n'));
  console.log(`\nTotal messages captured: ${allMessages.length}`);
  
  await browser.close();
})();
