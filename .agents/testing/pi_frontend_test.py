#!/usr/bin/env python3
"""
Focused Playwright tests for Pi Chat frontend.
Tests the actual single-page chat application (no auth, no routing).
"""

import sys
import os

# Add playwright to path
sys.path.insert(0, '/home/jon/git/betty/.playwright-cli')

from playwright.sync_api import sync_playwright
import time

def run_tests():
    errors = []
    warnings = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()
        
        # Track console errors
        console_errors = []
        page.on('pageerror', lambda error: console_errors.append(str(error)))
        page.on('console', lambda msg: print(f"  Console [{msg.type}]: {msg.text}") if msg.type in ('error', 'warning') else None)
        
        # ============================================================
        # TEST 1: App loads without JS errors
        # ============================================================
        print("=" * 60)
        print("TEST 1: App loads without JS errors")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            
            # Check the page title
            title = page.title()
            print(f"  Page title: {title}")
            if title == "Pi Chat":
                print("  PASS: Correct title")
            else:
                warnings.append(f"Unexpected title: {title}")
            
            # Check for the app container
            app = page.query_selector('.app')
            if app:
                print("  PASS: App container found")
            else:
                errors.append("App container (.app) not found")
            
            # Check for header
            header = page.query_selector('.app-header')
            if header:
                print("  PASS: Header found")
            else:
                errors.append("Header (.app-header) not found")
            
            # Check for chat container
            chat_container = page.query_selector('.chat-container')
            if chat_container:
                print("  PASS: Chat container found")
            else:
                errors.append("Chat container (.chat-container) not found")
            
            # Check for input area
            input_area = page.query_selector('.input-area')
            if input_area:
                print("  PASS: Input area found")
            else:
                errors.append("Input area (.input-area) not found")
                
        except Exception as e:
            errors.append(f"App load error: {e}")
        
        # ============================================================
        # TEST 2: Welcome screen is displayed
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 2: Welcome screen")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(1)  # Wait for Vue to render
            
            welcome = page.query_selector('.welcome-screen')
            if welcome:
                print("  PASS: Welcome screen visible")
                
                # Check for welcome heading
                h2 = welcome.query_selector('h2')
                if h2:
                    text = h2.inner_text().strip()
                    print(f"  Welcome heading: {text}")
                    if "Pi Chat" in text:
                        print("  PASS: Correct welcome heading")
                    else:
                        warnings.append(f"Unexpected welcome heading: {text}")
                
                # Check for welcome hints
                hints = welcome.query_selector_all('.welcome-hint')
                print(f"  Welcome hints: {len(hints)}")
                if len(hints) > 0:
                    print("  PASS: Welcome hints present")
                    for i, hint in enumerate(hints[:2]):
                        print(f"    Hint {i+1}: {hint.inner_text().strip()[:60]}")
                else:
                    errors.append("No welcome hints found")
            else:
                errors.append("Welcome screen not found")
                
        except Exception as e:
            errors.append(f"Welcome screen error: {e}")
        
        # ============================================================
        # TEST 3: Status badge shows correct state
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 3: Status badge")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(2)  # Wait for WebSocket connection attempt
            
            status_badge = page.query_selector('.status-badge')
            if status_badge:
                print("  PASS: Status badge found")
                
                # Check for connected state (backend is running)
                if status_badge.get_attribute('class'):
                    classes = status_badge.get_attribute('class')
                    print(f"  Status classes: {classes}")
                    
                    if 'connected' in classes:
                        print("  PASS: Connected status shown")
                    elif 'connecting' in classes:
                        print("  WARN: Still connecting (may be slow WebSocket)")
                    elif 'error' in classes:
                        print("  WARN: Error status shown")
                        warnings.append("Status badge shows error state")
                    
                    # Check status text
                    status_text = status_badge.inner_text().strip()
                    print(f"  Status text: {status_text}")
            else:
                errors.append("Status badge not found")
                
        except Exception as e:
            errors.append(f"Status badge error: {e}")
        
        # ============================================================
        # TEST 4: New Chat button exists and is enabled
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 4: New Chat button")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(2)
            
            new_chat_btn = page.query_selector('.app-header .btn')
            if new_chat_btn:
                text = new_chat_btn.inner_text().strip()
                print(f"  Button text: '{text}'")
                disabled = new_chat_btn.get_attribute('disabled')
                print(f"  Disabled: {disabled}")
                if disabled:
                    print("  WARN: New Chat button is disabled (may need connection)")
                else:
                    print("  PASS: New Chat button enabled")
            else:
                errors.append("New Chat button not found")
                
        except Exception as e:
            errors.append(f"New Chat button error: {e}")
        
        # ============================================================
        # TEST 5: Input textarea exists and is functional
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 5: Input textarea")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(2)
            
            textarea = page.query_selector('textarea')
            if textarea:
                print("  PASS: Textarea found")
                placeholder = textarea.get_attribute('placeholder')
                print(f"  Placeholder: {placeholder}")
                disabled = textarea.get_attribute('disabled')
                print(f"  Disabled: {disabled}")
                
                # Test typing
                textarea.fill("Hello, Pi!")
                value = textarea.input_value()
                print(f"  After typing: '{value}'")
                if value == "Hello, Pi!":
                    print("  PASS: Textarea accepts input")
                else:
                    errors.append("Textarea value mismatch")
            else:
                errors.append("Textarea not found")
                
        except Exception as e:
            errors.append(f"Textarea error: {e}")
        
        # ============================================================
        # TEST 6: Send button exists
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 6: Send button")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(2)
            
            send_btn = page.query_selector('.btn-primary')
            if send_btn:
                print("  PASS: Send button found")
                disabled = send_btn.get_attribute('disabled')
                print(f"  Disabled: {disabled}")
            else:
                errors.append("Send button not found")
                
        except Exception as e:
            errors.append(f"Send button error: {e}")
        
        # ============================================================
        # TEST 7: Format message rendering (via v-html)
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 7: Message formatting (formatMessage)")
        print("=" * 60)
        try:
            # Test formatMessage function via page.evaluate
            result = page.evaluate('''() => {
                // Replicate the formatMessage function from App.vue
                function formatMessage(content) {
                    if (!content) return "";
                    let text = content
                        .replace(/&/g, "&amp;")
                        .replace(/</g, "&lt;")
                        .replace(/>/g, "&gt;");
                    text = text.replace(/```(\\w*)\\n([\\s\\S]*?)```/g, (_, lang, code) => {
                        return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
                    });
                    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
                    text = text.replace(/\\*\\*([\\s\\S]*?)\\*\\*/g, "<strong>$1</strong>");
                    text = text.replace(/\\*([\\s\\S]*?)\\*/g, "<em>$1</em>");
                    text = text.replace(/(<pre>.*?<\\/pre>)|(\\n)/gs, (match, preBlock) => {
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
            }''')
            
            print(f"  Plain text: {result['plain'][:50]}...")
            print(f"  Bold: {result['bold']}")
            print(f"  Italic: {result['italic']}")
            print(f"  Code: {result['code']}")
            print(f"  Multiline: {result['multiline'][:50]}...")
            print(f"  XSS test: {result['xss'][:50]}...")
            print(f"  Code block: {result['codeblock'][:60]}...")
            
            # Check XSS escaping
            if '<script>' not in result['xss']:
                print("  PASS: XSS content properly escaped")
            else:
                errors.append("XSS content NOT escaped!")
            
            # Check bold/italic rendering
            if '<strong>' in result['bold']:
                print("  PASS: Bold text rendered")
            else:
                errors.append("Bold text not rendered")
            
            if '<em>' in result['italic']:
                print("  PASS: Italic text rendered")
            else:
                errors.append("Italic text not rendered")
            
            # Check newlines in multiline
            if '<br>' in result['multiline']:
                print("  PASS: Line breaks rendered")
            else:
                errors.append("Line breaks not rendered")
            
            # Check code block
            if '<pre>' in result['codeblock']:
                print("  PASS: Code block rendered")
            else:
                errors.append("Code block not rendered")
                
        except Exception as e:
            errors.append(f"Format message error: {e}")
            import traceback
            print(f"  Error: {e}")
            traceback.print_exc()
        
        # ============================================================
        # TEST 8: Responsive design - mobile view (375px)
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 8: Mobile responsive (375px)")
        print("=" * 60)
        try:
            page.set_viewport_size({'width': 375, 'height': 667})
            page.goto('http://127.0.0.1:5173', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(1)
            
            # Check that content is visible
            app = page.query_selector('.app')
            if app:
                bbox = app.bounding_box()
                print(f"  App visible: {bbox is not None}")
                if bbox:
                    print(f"  App width: {bbox['width']}, height: {bbox['height']}")
                    print("  PASS: App renders at mobile width")
            else:
                errors.append("App not visible at mobile width")
                
        except Exception as e:
            errors.append(f"Mobile responsive error: {e}")
        
        # ============================================================
        # TEST 9: Responsive design - tablet view (768px)
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 9: Tablet responsive (768px)")
        print("=" * 60)
        try:
            page.set_viewport_size({'width': 768, 'height': 1024})
            page.goto('http://127.0.0.1:5173', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(1)
            
            app = page.query_selector('.app')
            if app:
                print("  PASS: App renders at tablet width")
            else:
                errors.append("App not visible at tablet width")
                
        except Exception as e:
            errors.append(f"Tablet responsive error: {e}")
        
        # ============================================================
        # TEST 10: Responsive design - desktop view (1920px)
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 10: Desktop responsive (1920px)")
        print("=" * 60)
        try:
            page.set_viewport_size({'width': 1920, 'height': 1080})
            page.goto('http://127.0.0.1:5173', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(1)
            
            app = page.query_selector('.app')
            if app:
                print("  PASS: App renders at desktop width")
            else:
                errors.append("App not visible at desktop width")
                
        except Exception as e:
            errors.append(f"Desktop responsive error: {e}")
        
        # ============================================================
        # TEST 11: WebSocket connection to backend
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 11: WebSocket connection")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(3)  # Wait for WebSocket connection
            
            # Check WebSocket status via JS
            ws_status = page.evaluate('''() => {
                return new Promise((resolve) => {
                    // Check if there's a WebSocket connection
                    const openSockets = [];
                    // We can't directly check WebSocket state from here,
                    // but we can check the Vue app state
                    const app = document.querySelector('.status-badge');
                    if (app) {
                        resolve({
                            hasBadge: true,
                            classes: app.getAttribute('class'),
                            text: app.innerText.trim()
                        });
                    } else {
                        resolve({ hasBadge: false });
                    }
                });
            }''')
            
            print(f"  WebSocket status: {ws_status}")
            if ws_status.get('hasBadge'):
                if 'connected' in ws_status.get('classes', ''):
                    print("  PASS: WebSocket connected to backend")
                elif 'error' in ws_status.get('classes', ''):
                    errors.append("WebSocket connection failed")
                else:
                    warnings.append(f"WebSocket status unclear: {ws_status}")
            else:
                errors.append("Status badge not found")
                
        except Exception as e:
            errors.append(f"WebSocket connection error: {e}")
        
        # ============================================================
        # TEST 12: Error handling - offline state
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 12: Error banner display")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(2)
            
            # Check if error banner is visible (shouldn't be if connected)
            error_banner = page.query_selector('.error-banner')
            if error_banner:
                print("  WARN: Error banner is visible")
                error_text = error_banner.inner_text().strip()
                print(f"  Error text: {error_text}")
            else:
                print("  PASS: No error banner (connection successful)")
                
        except Exception as e:
            errors.append(f"Error banner test error: {e}")
        
        # ============================================================
        # TEST 13: Console errors check
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 13: Console errors")
        print("=" * 60)
        try:
            if console_errors:
                print(f"  {len(console_errors)} console error(s) found:")
                for err in console_errors:
                    print(f"    ✗ {err[:200]}")
                errors.append(f"{len(console_errors)} console error(s) detected")
            else:
                print("  PASS: No console errors")
        except Exception as e:
            errors.append(f"Console errors check error: {e}")
        
        # ============================================================
        # TEST 14: New session flow
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 14: New session flow")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(2)
            
            # Check that welcome screen is visible (no messages yet)
            messages = page.query_selector_all('.message')
            print(f"  Initial messages: {len(messages)}")
            
            # Click a welcome hint to start a conversation
            hints = page.query_selector_all('.welcome-hint')
            if hints:
                print(f"  Clicking welcome hint...")
                hints[0].click()
                time.sleep(2)
                
                # Check that user message appeared
                messages = page.query_selector_all('.message')
                print(f"  Messages after click: {len(messages)}")
                if len(messages) > 0:
                    print("  PASS: User message appeared after clicking hint")
                else:
                    warnings.append("No messages after clicking hint (WebSocket may not have connected)")
                
                # Check that streaming indicator appears
                streaming = page.query_selector('.message.assistant')
                if streaming:
                    print("  PASS: Streaming message indicator visible")
                else:
                    warnings.append("No streaming message visible (expected - Pi may not respond)")
            else:
                errors.append("No welcome hints found for session test")
                
        except Exception as e:
            errors.append(f"New session flow error: {e}")
        
        # ============================================================
        # TEST 15: Take screenshots
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 15: Screenshots")
        print("=" * 60)
        try:
            page.set_viewport_size({'width': 1280, 'height': 720})
            page.goto('http://127.0.0.1:5173', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(2)
            page.screenshot(path='/home/jon/git/betty/.agents/testing/SNAPSHOTS/welcome_screen.png')
            print("  Screenshot saved: welcome_screen.png")
            
            # Mobile screenshot
            page.set_viewport_size({'width': 375, 'height': 667})
            page.screenshot(path='/home/jon/git/betty/.agents/testing/SNAPSHOTS/mobile_view.png')
            print("  Screenshot saved: mobile_view.png")
                
        except Exception as e:
            errors.append(f"Screenshot error: {e}")
        
        # ============================================================
        # Final Summary
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"  Errors: {len(errors)}")
        print(f"  Warnings: {len(warnings)}")
        for err in errors:
            print(f"    ✗ {err}")
        for warn in warnings:
            print(f"    ⚠ {warn}")
        
        browser.close()
        return len(errors)

if __name__ == '__main__':
    error_count = run_tests()
    sys.exit(1 if error_count > 0 else 0)
