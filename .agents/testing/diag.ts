import { chromium } from "playwright";
import * as fs from "fs";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    executablePath: '/usr/bin/google-chrome-stable',
  });
  const page = await browser.newPage();
  
  // Collect console messages
  page.on("console", msg => {
    console.log(`  [${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", err => {
    console.log(`  [PAGE ERROR] ${err.message}`);
  });

  // Navigate
  console.log("Navigating to http://localhost:5173...");
  await page.goto("http://localhost:5173", { waitUntil: "domcontentloaded", timeout: 15000 });
  console.log("DOM loaded. Waiting for network...");
  await page.waitForTimeout(3000);
  
  // Take screenshot
  fs.mkdirSync(".agents/testing/SNAPSHOTS", { recursive: true });
  await page.screenshot({ path: ".agents/testing/SNAPSHOTS/diag-home.png", fullPage: true });
  console.log("Screenshot saved: diag-home.png");
  
  // Get page title
  const title = await page.title();
  console.log(`Page title: ${title}`);
  
  // Check what elements exist
  const elements = await page.evaluate(() => {
    const body = document.body;
    const text = body.innerText?.substring(0, 500) || "No text";
    const html = body.innerHTML?.substring(0, 2000) || "No HTML";
    return { text, html, classes: Array.from(document.querySelectorAll('[class]')).map(el => el.className).slice(0, 20) };
  });
  
  console.log(`\nPage text (first 500 chars):\n${elements.text}\n`);
  console.log(`\nPage HTML (first 2000 chars):\n${elements.html}\n`);
  console.log(`\nClasses found: ${elements.classes.join(", ")}\n`);
  
  // Check for specific elements
  const checks = [
    ".login-page", ".login-container", ".login-card", ".login-header", ".login-form",
    "#username", "#password", ".btn-login", ".app", ".sidebar", ".main", ".messages",
    ".input-area", ".empty-state", ".model-badge", ".user-info", ".connection-status"
  ];
  
  console.log("Element checks:");
  for (const selector of checks) {
    const exists = await page.locator(selector).count();
    if (exists > 0) {
      console.log(`  ✅ ${selector}: found (${exists})`);
    }
  }
  
  await browser.close();
})();
