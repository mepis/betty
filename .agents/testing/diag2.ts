import { chromium } from "playwright";
import * as fs from "fs";

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    executablePath: '/usr/bin/google-chrome-stable',
  });
  const page = await browser.newPage();
  
  // Collect ALL errors
  const errors: string[] = [];
  page.on("console", msg => {
    if (msg.type() !== "debug") {
      console.log(`  [${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", err => {
    const msg = err.message;
    errors.push(msg);
    console.log(`  [PAGE ERROR] ${msg}`);
  });

  // Navigate
  console.log("Navigating to http://localhost:5173...");
  try {
    await page.goto("http://localhost:5173", { waitUntil: "networkidle", timeout: 30000 });
  } catch (e) {
    console.log(`  Navigation timeout/error: ${e}`);
  }
  await page.waitForTimeout(3000);
  
  // Get full page content
  const fullHtml = await page.content();
  console.log(`\nPage HTML length: ${fullHtml.length}`);
  console.log(`Page HTML (first 3000 chars):\n${fullHtml.substring(0, 3000)}\n`);
  
  // Evaluate JS to find the error
  const evalResult = await page.evaluate(() => {
    return {
      appEl: document.getElementById('app')?.innerHTML?.substring(0, 500),
      body: document.body?.innerHTML?.substring(0, 500),
      vueDevtools: typeof (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__ !== 'undefined',
    };
  });
  console.log(`\nEval result: ${JSON.stringify(evalResult, null, 2)}`);
  
  // Check if there are any Vue components rendered
  const rendered = await page.evaluate(() => {
    const app = document.getElementById('app');
    if (!app) return { exists: false };
    return {
      exists: true,
      innerHTML: app.innerHTML.substring(0, 3000),
      childCount: app.childElementCount,
      children: Array.from(app.children).map(c => ({ tag: c.tagName, className: c.className, text: c.textContent?.substring(0, 100) }))
    };
  });
  console.log(`\nRendered: ${JSON.stringify(rendered, null, 2)}`);
  
  // Take screenshot
  fs.mkdirSync(".agents/testing/SNAPSHOTS", { recursive: true });
  await page.screenshot({ path: ".agents/testing/SNAPSHOTS/diag-home2.png", fullPage: true });
  console.log("\nScreenshot: diag-home2.png");
  
  console.log(`\nErrors found: ${errors.length}`);
  errors.forEach(e => console.log(`  - ${e}`));
  
  await browser.close();
})();
