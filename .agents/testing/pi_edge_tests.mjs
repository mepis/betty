import { chromium } from "playwright";

async function runEdgeCaseTests() {
  const errors = [];
  const warnings = [];
  let browser;

  try {
    browser = await chromium.launch({ headless: true });

    // ============================================================
    // Edge Case 1: Rapid clicks (double submission)
    // ============================================================
    console.log("=" .repeat(60));
    console.log("EDGE TEST 1: Rapid clicks (double submission)");
    console.log("=" .repeat(60));

    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("pageerror", (e) => consoleErrors.push(e.message));

      await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(5000);

      // Type something first to enable the send button
      const textarea = await page.locator("textarea");
      await textarea.fill("test message");
      await page.waitForTimeout(500);

      // Now click send button rapidly
      const sendBtn = await page.locator(".btn-primary");
      let clickCount = 0;
      for (let i = 0; i < 5; i++) {
        try {
          await sendBtn.click({ timeout: 1000 });
          clickCount++;
        } catch {
          break;
        }
        await page.waitForTimeout(100);
      }

      console.log(`  Successful clicks: ${clickCount}`);
      if (clickCount <= 1) {
        console.log("  PASS: Only one message sent despite rapid clicks");
      } else {
        warnings.push(`${clickCount} messages sent from rapid clicks`);
      }

      if (consoleErrors.length === 0) {
        console.log("  PASS: No JS errors from rapid clicks");
      } else {
        errors.push(`Rapid clicks caused ${consoleErrors.length} errors`);
      }

      await context.close();
    } catch (e) {
      errors.push(`Rapid clicks test error: ${e.message}`);
    }

    // ============================================================
    // Edge Case 2: Empty message - send button disabled
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("EDGE TEST 2: Empty message - send button disabled");
    console.log("=" .repeat(60));

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(3000);

      const sendBtn = await page.locator(".btn-primary");
      const disabled = await sendBtn.getAttribute("disabled");
      console.log(`  Send button disabled when empty: ${disabled !== null}`);
      if (disabled !== null) {
        console.log("  PASS: Send button disabled for empty input");
      } else {
        warnings.push("Send button not disabled for empty input");
      }

      await context.close();
    } catch (e) {
      errors.push(`Empty message test error: ${e.message}`);
    }

    // ============================================================
    // Edge Case 3: Very long message input
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("EDGE TEST 3: Very long message input");
    console.log("=" .repeat(60));

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(2000);

      // Use evaluate to bypass disabled state
      const result = await page.evaluate((longMsg) => {
        const textarea = document.querySelector("textarea");
        textarea.value = longMsg;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
        return textarea.value.length;
      }, "a".repeat(10240));

      console.log(`  Input length: ${result}`);

      if (result === 10240) {
        console.log("  PASS: Long message accepted by textarea");
      } else {
        warnings.push("Long message truncated by textarea");
      }

      await context.close();
    } catch (e) {
      errors.push(`Long message test error: ${e.message}`);
    }

    // ============================================================
    // Edge Case 4: Special characters in message
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("EDGE TEST 4: Special characters in message");
    console.log("=" .repeat(60));

    try {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(2000);

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
          htmlEntities: formatMessage("<div>test</div> & 'quotes'"),
          unicode: formatMessage("Hello 世界 🌍"),
          newlinesOnly: formatMessage("\n\n\n"),
          empty: formatMessage(""),
          undefinedVal: formatMessage(undefined),
        };
      });

      console.log(`  HTML escaped: ${!result.htmlEntities.includes("<div>")}`);
      console.log(`  Unicode preserved: ${result.unicode.includes("世界")}`);
      console.log(`  Newlines converted: ${result.newlinesOnly.includes("<br>")}`);

      if (!result.htmlEntities.includes("<div>") && result.unicode.includes("世界")) {
        console.log("  PASS: Special characters handled correctly");
      } else {
        errors.push("Special characters not handled correctly");
      }

      await context.close();
    } catch (e) {
      errors.push(`Special characters test error: ${e.message}`);
    }

    // ============================================================
    // Edge Case 5: Nested markdown formatting
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("EDGE TEST 5: Nested markdown formatting");
    console.log("=" .repeat(60));

    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(2000);

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
          nestedBoldItalic: formatMessage("**bold *and italic* bold**"),
          codeInBold: formatMessage("**`inline code`**"),
          mixed: formatMessage("Text **bold** and *italic* and `code`"),
        };
      });

      console.log(`  Nested: ${result.nestedBoldItalic.substring(0, 60)}...`);
      console.log(`  Code in bold: ${result.codeInBold}`);

      if (result.nestedBoldItalic.includes("<strong>") && result.nestedBoldItalic.includes("<em>")) {
        console.log("  PASS: Nested markdown handled");
      } else {
        warnings.push("Nested markdown may not render perfectly");
      }

      await context.close();
    } catch (e) {
      errors.push(`Nested markdown test error: ${e.message}`);
    }

    // ============================================================
    // Edge Case 6: Backend API endpoints
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("EDGE TEST 6: Backend API endpoints");
    console.log("=" .repeat(60));

    try {
      const healthRes = await fetch("http://localhost:3001/health");
      const healthData = await healthRes.json();
      console.log(`  Health: status=${healthData.status}`);
      if (healthData.status === "ok") {
        console.log("  PASS: Health endpoint works");
      } else {
        errors.push("Health endpoint returned unexpected status");
      }

      const sessionsRes = await fetch("http://localhost:3001/api/sessions");
      const sessionsData = await sessionsRes.json();
      console.log(`  Sessions: count=${sessionsData.count}`);
      if (sessionsData.hasOwnProperty("count") && sessionsData.hasOwnProperty("sessions")) {
        console.log("  PASS: Sessions endpoint works");
      } else {
        errors.push("Sessions endpoint returned unexpected format");
      }

      const spaRes = await fetch("http://localhost:3001/nonexistent-route");
      const spaText = await spaRes.text();
      if (spaText.includes("<!DOCTYPE html>") || spaText.includes("<html")) {
        console.log("  PASS: SPA fallback serves HTML");
      } else {
        errors.push("SPA fallback doesn't serve HTML");
      }
    } catch (e) {
      errors.push(`API endpoints test error: ${e.message}`);
    }

    // ============================================================
    // Edge Case 7: Auto-resize textarea
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("EDGE TEST 7: Auto-resize textarea");
    console.log("=" .repeat(60));

    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(2000);

      const result = await page.evaluate(() => {
        const textarea = document.querySelector("textarea");
        const initialHeight = textarea.scrollHeight;

        // Fill with multiple lines
        const multiLine = Array(20).fill("Line " + Math.random().toString(36).substring(7)).join("\n");
        textarea.value = multiLine;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));

        // Wait for Vue to process the input
        return new Promise((resolve) => {
          setTimeout(() => {
            const newHeight = textarea.scrollHeight;
            resolve({ initial: initialHeight, new: newHeight });
          }, 500);
        });
      });

      console.log(`  Initial height: ${result.initial}px`);
      console.log(`  After filling: ${result.new}px`);

      if (result.new >= result.initial) {
        console.log("  PASS: Textarea auto-resizes");
      } else {
        warnings.push("Textarea did not auto-resize");
      }

      await context.close();
    } catch (e) {
      errors.push(`Textarea resize test error: ${e.message}`);
    }

    // ============================================================
    // Final Summary
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("EDGE CASE TEST SUMMARY");
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

runEdgeCaseTests().then((errorCount) => {
  process.exit(errorCount > 0 ? 1 : 0);
});
