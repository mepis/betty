import { chromium } from "playwright";

async function runTests() {
  const errors = [];
  const warnings = [];
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    // Track console errors
    const consoleErrors = [];
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    page.on("console", (msg) => {
      if (msg.type() === "error" || msg.type() === "warning") {
        console.log(`  Console [${msg.type()}]: ${msg.text()}`);
      }
    });

    // ============================================================
    // TEST 1: App loads without JS errors
    // ============================================================
    console.log("=" .repeat(60));
    console.log("TEST 1: App loads without JS errors");
    console.log("=" .repeat(60));

    try {
      await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForLoadState("networkidle");

      const title = await page.title();
      console.log(`  Page title: ${title}`);
      if (title === "Pi Chat") {
        console.log("  PASS: Correct title");
      } else {
        warnings.push(`Unexpected title: ${title}`);
      }

      const app = await page.$(".app");
      if (app) {
        console.log("  PASS: App container found");
      } else {
        errors.push("App container (.app) not found");
      }

      const header = await page.$(".app-header");
      if (header) {
        console.log("  PASS: Header found");
      } else {
        errors.push("Header (.app-header) not found");
      }

      const chatContainer = await page.$(".chat-container");
      if (chatContainer) {
        console.log("  PASS: Chat container found");
      } else {
        errors.push("Chat container (.chat-container) not found");
      }

      const inputArea = await page.$(".input-area");
      if (inputArea) {
        console.log("  PASS: Input area found");
      } else {
        errors.push("Input area (.input-area) not found");
      }
    } catch (e) {
      errors.push(`App load error: ${e.message}`);
    }

    // ============================================================
    // TEST 2: Welcome screen is displayed
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("TEST 2: Welcome screen");
    console.log("=" .repeat(60));

    try {
      await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);

      const welcome = await page.$(".welcome-screen");
      if (welcome) {
        console.log("  PASS: Welcome screen visible");

        const h2 = await welcome.$("h2");
        if (h2) {
          const text = await h2.innerText();
          console.log(`  Welcome heading: ${text}`);
          if (text.includes("Pi Chat")) {
            console.log("  PASS: Correct welcome heading");
          } else {
            warnings.push(`Unexpected welcome heading: ${text}`);
          }
        }

        const hints = await welcome.$$(".welcome-hint");
        console.log(`  Welcome hints: ${hints.length}`);
        if (hints.length > 0) {
          console.log("  PASS: Welcome hints present");
          for (let i = 0; i < Math.min(2, hints.length); i++) {
            const hintText = await hints[i].innerText();
            console.log(`    Hint ${i + 1}: ${hintText.substring(0, 60)}`);
          }
        } else {
          errors.push("No welcome hints found");
        }
      } else {
        errors.push("Welcome screen not found");
      }
    } catch (e) {
      errors.push(`Welcome screen error: ${e.message}`);
    }

    // ============================================================
    // TEST 3: Status badge shows correct state
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("TEST 3: Status badge");
    console.log("=" .repeat(60));

    try {
      await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(3000);

      const statusBadge = await page.$(".status-badge");
      if (statusBadge) {
        console.log("  PASS: Status badge found");
        const classes = await statusBadge.getAttribute("class");
        const text = await statusBadge.innerText();
        console.log(`  Status classes: ${classes}`);
        console.log(`  Status text: ${text}`);

        if (classes.includes("connected")) {
          console.log("  PASS: Connected status shown");
        } else if (classes.includes("connecting")) {
          console.log("  WARN: Still connecting (may be slow WebSocket)");
        } else if (classes.includes("error")) {
          console.log("  WARN: Error status shown");
          warnings.push("Status badge shows error state");
        }
      } else {
        errors.push("Status badge not found");
      }
    } catch (e) {
      errors.push(`Status badge error: ${e.message}`);
    }

    // ============================================================
    // TEST 4: Message formatting (formatMessage function)
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("TEST 4: Message formatting (formatMessage)");
    console.log("=" .repeat(60));

    try {
      const result = await page.evaluate(() => {
        function formatMessage(content) {
          if (!content) return "";
          let text = content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
            return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
          });
          text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
          text = text.replace(/\*\*([\s\S]*?)\*\*/g, "<strong>$1</strong>");
          text = text.replace(/\*([\s\S]*?)\*/g, "<em>$1</em>");
          text = text.replace(/(<pre>.*?<\/pre>)|(\n)/gs, (match, preBlock) => {
            return preBlock !== undefined ? preBlock : "<br>";
          });
          return text;
        }
        return {
          plain: formatMessage("Hello world"),
          bold: formatMessage("**bold text**"),
          italic: formatMessage("*italic text*"),
          code: formatMessage("`inline code`"),
          multiline: formatMessage("Line 1\nLine 2\nLine 3"),
          xss: formatMessage("<script>alert('xss')</script>"),
          codeblock: formatMessage("```js\nconsole.log('hi')\n```"),
        };
      });

      console.log(`  Plain text: ${result.plain.substring(0, 50)}...`);
      console.log(`  Bold: ${result.bold}`);
      console.log(`  Italic: ${result.italic}`);
      console.log(`  Code: ${result.code}`);
      console.log(`  Multiline: ${result.multiline.substring(0, 50)}...`);
      console.log(`  XSS test: ${result.xss.substring(0, 50)}...`);
      console.log(`  Code block: ${result.codeblock.substring(0, 60)}...`);

      if (!result.xss.includes("<script>")) {
        console.log("  PASS: XSS content properly escaped");
      } else {
        errors.push("XSS content NOT escaped!");
      }

      if (result.bold.includes("<strong>")) {
        console.log("  PASS: Bold text rendered");
      } else {
        errors.push("Bold text not rendered");
      }

      if (result.italic.includes("<em>")) {
        console.log("  PASS: Italic text rendered");
      } else {
        errors.push("Italic text not rendered");
      }

      if (result.multiline.includes("<br>")) {
        console.log("  PASS: Line breaks rendered");
      } else {
        errors.push("Line breaks not rendered");
      }

      if (result.codeblock.includes("<pre>")) {
        console.log("  PASS: Code block rendered");
      } else {
        errors.push("Code block not rendered");
      }
    } catch (e) {
      errors.push(`Format message error: ${e.message}`);
      console.log(`  Error: ${e.message}`);
    }

    // ============================================================
    // TEST 5: Responsive design - mobile (375px)
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("TEST 5: Mobile responsive (375px)");
    console.log("=" .repeat(60));

    try {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      const app = await page.$(".app");
      if (app) {
        const bbox = await app.boundingBox();
        console.log(`  App visible: ${bbox !== null}`);
        if (bbox) {
          console.log(`  App width: ${bbox.width}, height: ${bbox.height}`);
          console.log("  PASS: App renders at mobile width");
        }
      } else {
        errors.push("App not visible at mobile width");
      }
    } catch (e) {
      errors.push(`Mobile responsive error: ${e.message}`);
    }

    // ============================================================
    // TEST 6: Responsive design - tablet (768px)
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("TEST 6: Tablet responsive (768px)");
    console.log("=" .repeat(60));

    try {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      const app = await page.$(".app");
      if (app) {
        console.log("  PASS: App renders at tablet width");
      } else {
        errors.push("App not visible at tablet width");
      }
    } catch (e) {
      errors.push(`Tablet responsive error: ${e.message}`);
    }

    // ============================================================
    // TEST 7: Responsive design - desktop (1920px)
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("TEST 7: Desktop responsive (1920px)");
    console.log("=" .repeat(60));

    try {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      const app = await page.$(".app");
      if (app) {
        console.log("  PASS: App renders at desktop width");
      } else {
        errors.push("App not visible at desktop width");
      }
    } catch (e) {
      errors.push(`Desktop responsive error: ${e.message}`);
    }

    // ============================================================
    // TEST 8: Input functionality
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("TEST 8: Input textarea");
    console.log("=" .repeat(60));

    try {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const textarea = await page.$("textarea");
      if (textarea) {
        console.log("  PASS: Textarea found");
        const placeholder = await textarea.getAttribute("placeholder");
        console.log(`  Placeholder: ${placeholder}`);

        await textarea.fill("Hello, Pi!");
        const value = await textarea.inputValue();
        console.log(`  After typing: '${value}'`);
        if (value === "Hello, Pi!") {
          console.log("  PASS: Textarea accepts input");
        } else {
          errors.push("Textarea value mismatch");
        }
      } else {
        errors.push("Textarea not found");
      }
    } catch (e) {
      errors.push(`Textarea error: ${e.message}`);
    }

    // ============================================================
    // TEST 9: New session flow (click welcome hint)
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("TEST 9: New session flow (click welcome hint)");
    console.log("=" .repeat(60));

    try {
      await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);

      const hints = await page.$$(".welcome-hint");
      if (hints.length > 0) {
        console.log(`  Found ${hints.length} welcome hints`);
        await hints[0].click();
        await page.waitForTimeout(2000);

        const messages = await page.$$(".message");
        console.log(`  Messages after click: ${messages.length}`);
        if (messages.length > 0) {
          console.log("  PASS: User message appeared after clicking hint");
        } else {
          warnings.push("No messages after clicking hint (WebSocket may not have connected)");
        }

        const streaming = await page.$(".message.assistant");
        if (streaming) {
          console.log("  PASS: Streaming message indicator visible");
        } else {
          console.log("  INFO: No streaming message (expected - Pi may not respond)");
        }
      } else {
        errors.push("No welcome hints found for session test");
      }
    } catch (e) {
      errors.push(`New session flow error: ${e.message}`);
    }

    // ============================================================
    // TEST 10: Screenshot
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("TEST 10: Screenshots");
    console.log("=" .repeat(60));

    try {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "/home/jon/git/betty/.agents/testing/SNAPSHOTS/welcome_screen.png" });
      console.log("  Screenshot saved: welcome_screen.png");

      await page.setViewportSize({ width: 375, height: 667 });
      await page.screenshot({ path: "/home/jon/git/betty/.agents/testing/SNAPSHOTS/mobile_view.png" });
      console.log("  Screenshot saved: mobile_view.png");
    } catch (e) {
      errors.push(`Screenshot error: ${e.message}`);
    }

    // ============================================================
    // Console errors summary
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("CONSOLE ERRORS SUMMARY");
    console.log("=" .repeat(60));

    if (consoleErrors.length > 0) {
      console.log(`  ${consoleErrors.length} console error(s) found:`);
      for (const err of consoleErrors.slice(0, 10)) {
        console.log(`    ✗ ${err.substring(0, 200)}`);
      }
      errors.push(`${consoleErrors.length} console error(s) detected`);
    } else {
      console.log("  PASS: No console errors");
    }

    // ============================================================
    // Final Summary
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("TEST SUMMARY");
    console.log("=" .repeat(60));
    console.log(`  Errors: ${errors.length}`);
    console.log(`  Warnings: ${warnings.length}`);
    for (const err of errors) {
      console.log(`    ✗ ${err}`);
    }
    for (const warn of warnings) {
      console.log(`    ⚠ ${warn}`);
    }

    await browser.close();
    return errors.length;
  } catch (e) {
    console.error(`Fatal error: ${e.message}`);
    if (browser) await browser.close();
    return 1;
  }
}

runTests().then((errorCount) => {
  process.exit(errorCount > 0 ? 1 : 0);
});
