from playwright.sync_api import sync_playwright
import sys
import time

def run_tests():
    errors = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True, 
            executable_path='/usr/bin/google-chrome',
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        context = browser.new_context()
        page = context.new_page()
        
        # Track console errors
        console_errors = []
        page.on('pageerror', lambda error: console_errors.append(str(error)))
        page.on('console', lambda msg: print(f"  Console [{msg.type}]: {msg.text}") if msg.type == 'error' else None)
        
        # ============================================================
        # TEST 1: Home Page (unauthenticated redirect)
        # ============================================================
        print("=" * 60)
        print("TEST 1: Home Page - Unauthenticated Redirect")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            current_url = page.url
            print(f"  URL after navigation: {current_url}")
            print(f"  Page title: {page.title()}")
            if '/login' in current_url:
                print("  PASS: Redirected to login page")
            else:
                print(f"  FAIL: Expected redirect to /login, got {current_url}")
                errors.append("Home page did not redirect to login")
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Home page error: {e}")
        
        # ============================================================
        # TEST 2: Login Page - Elements Check
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 2: Login Page - Elements Check")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/login', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            
            # Check for form elements
            email_inputs = page.query_selector_all('input[type="email"], input[name*="email" i], input[placeholder*="email" i]')
            password_inputs = page.query_selector_all('input[type="password"]')
            buttons = page.query_selector_all('button')
            
            print(f"  Email inputs found: {len(email_inputs)}")
            print(f"  Password inputs found: {len(password_inputs)}")
            print(f"  Buttons found: {len(buttons)}")
            
            if len(email_inputs) > 0 and len(password_inputs) > 0 and len(buttons) > 0:
                print("  PASS: Login form elements present")
            else:
                print("  FAIL: Missing login form elements")
                errors.append("Login form missing elements")
            
            # Print button text
            for btn in buttons:
                text = btn.inner_text().strip()[:50]
                if text:
                    print(f"  Button: '{text}'")
                    
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Login page elements error: {e}")
        
        # ============================================================
        # TEST 3: Login - Invalid Credentials
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 3: Login - Invalid Credentials")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/login', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            
            # Find and fill email
            email_input = page.query_selector('input[type="email"], input[name*="email" i], input[placeholder*="email" i]')
            if email_input:
                email_input.fill('wrong@example.com')
                print("  Filled email: wrong@example.com")
            else:
                # Try PrimeVue inputs
                all_inputs = page.query_selector_all('input')
                if len(all_inputs) >= 2:
                    all_inputs[0].fill('wrong@example.com')
                    print("  Filled email (index 0)")
            
            # Find and fill password
            password_input = page.query_selector('input[type="password"]')
            if password_input:
                password_input.fill('wrongpassword')
                print("  Filled password")
            
            # Submit
            submit_btn = page.query_selector('button[type="submit"], button.p-button')
            if submit_btn:
                submit_btn.click()
                print("  Clicked submit button")
                page.wait_for_load_state('networkidle', timeout=10000)
                time.sleep(1)
            
            current_url = page.url
            print(f"  URL after login attempt: {current_url}")
            
            if '/login' in current_url:
                print("  PASS: Stayed on login page (invalid credentials)")
            else:
                print(f"  WARN: Navigated away from login page to {current_url}")
                
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Invalid login error: {e}")
        
        # ============================================================
        # TEST 4: Login - Valid Credentials
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 4: Login - Valid Admin Credentials")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/login', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            # Find and fill email
            all_inputs = page.query_selector_all('input')
            if len(all_inputs) >= 2:
                all_inputs[0].fill('admin')
                all_inputs[1].fill('admin123')
                print("  Filled credentials: admin / admin123")
            
            # Submit
            submit_btn = page.query_selector('button[type="submit"], button.p-button')
            if submit_btn:
                submit_btn.click()
                print("  Clicked submit button")
            
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(1)
            
            current_url = page.url
            print(f"  URL after login: {current_url}")
            print(f"  Page title: {page.title()}")
            
            if '/login' not in current_url:
                print("  PASS: Successfully logged in")
            else:
                print("  FAIL: Still on login page after valid credentials")
                errors.append("Login with valid credentials failed")
                
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Valid login error: {e}")
        
        # ============================================================
        # TEST 5: Header & Navigation
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 5: Header & Navigation")
        print("=" * 60)
        try:
            # Get all navigation links
            nav_links = page.query_selector_all('a')
            print(f"  Total links found: {len(nav_links)}")
            
            main_nav = []
            for link in nav_links:
                href = link.get_attribute('href')
                text = link.inner_text().strip()
                if href and text and not text.startswith('http'):
                    main_nav.append((text, href))
            
            print(f"  Main navigation items: {len(main_nav)}")
            for text, href in main_nav[:20]:
                print(f"    - {text} -> {href}")
                
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Navigation error: {e}")
        
        # ============================================================
        # TEST 6: Home View
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 6: Home View")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
            # Check for home page content
            headings = page.query_selector_all('h1, h2, h3')
            print(f"  Headings found: {len(headings)}")
            for h in headings[:5]:
                print(f"    - {h.tag_name}: {h.inner_text().strip()[:80]}")
                
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Home view error: {e}")
        
        # ============================================================
        # TEST 7: Chat Sessions
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 7: Chat Sessions")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/chat', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
            # Check for chat-related elements
            new_chat_btn = page.query_selector('button, .p-button')
            if new_chat_btn:
                btn_text = new_chat_btn.inner_text().strip()[:50]
                print(f"  First button text: '{btn_text}'")
            
            # Look for session list or chat messages
            messages = page.query_selector_all('.message, [class*="message"], [class*="chat"]')
            print(f"  Chat/message elements: {len(messages)}")
            
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Chat view error: {e}")
        
        # ============================================================
        # TEST 8: Register Page
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 8: Register Page")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/register', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
            all_inputs = page.query_selector_all('input')
            print(f"  Form inputs found: {len(all_inputs)}")
            for inp in all_inputs:
                inp_type = inp.get_attribute('type')
                inp_name = inp.get_attribute('name')
                inp_placeholder = inp.get_attribute('placeholder')
                print(f"    - type={inp_type}, name={inp_name}, placeholder={inp_placeholder}")
                
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Register page error: {e}")
        
        # ============================================================
        # TEST 9: User Management
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 9: User Management")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/users', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
            # Check for user table/list
            tables = page.query_selector_all('table, .p-datatable')
            print(f"  Table elements: {len(tables)}")
            
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"User management error: {e}")
        
        # ============================================================
        # TEST 10: RAG / Documents
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 10: RAG / Documents")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/rag', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"RAG page error: {e}")
        
        # ============================================================
        # TEST 11: Prompts
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 11: Prompt Management")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/prompts', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Prompts page error: {e}")
        
        # ============================================================
        # TEST 12: Tools
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 12: Tool Management")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/tools', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Tools page error: {e}")
        
        # ============================================================
        # TEST 13: Logs
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 13: System Logs")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/logs', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Logs page error: {e}")
        
        # ============================================================
        # TEST 14: Llama Settings
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 14: LLM Integration Settings")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/llama', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Llama settings error: {e}")
        
        # ============================================================
        # TEST 15: Skills
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 15: Skills Management")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/skills', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Skills page error: {e}")
        
        # ============================================================
        # TEST 16: Matrix Integration
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 16: Matrix Integration")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/matrix', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Matrix page error: {e}")
        
        # ============================================================
        # TEST 17: Config Management
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 17: Config Management")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/config', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Config page error: {e}")
        
        # ============================================================
        # TEST 18: Roles Management
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 18: Role Management")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/roles', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Roles page error: {e}")
        
        # ============================================================
        # TEST 19: Document Groups
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 19: Document Groups")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/document-groups', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Document groups error: {e}")
        
        # ============================================================
        # TEST 20: Memory Management
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 20: Memory Management")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/memory', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Memory page error: {e}")
        
        # ============================================================
        # TEST 21: Monitor/Health
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 21: System Monitor")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/monitor', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Monitor page error: {e}")
        
        # ============================================================
        # TEST 22: Debug Page
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 22: Debug Page")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/debug', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Debug page error: {e}")
        
        # ============================================================
        # TEST 23: User Profile / Me
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 23: User Profile")
        print("=" * 60)
        try:
            page.goto('http://127.0.0.1:5173/profile', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            print(f"  URL: {page.url}")
            print(f"  Title: {page.title()}")
            
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Profile page error: {e}")
        
        # ============================================================
        # TEST 24: Logout
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST 24: Logout")
        print("=" * 60)
        try:
            # First ensure we're logged in
            page.goto('http://127.0.0.1:5173/login', timeout=15000)
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(0.5)
            
            all_inputs = page.query_selector_all('input')
            if len(all_inputs) >= 2:
                all_inputs[0].fill('admin')
                all_inputs[1].fill('admin123')
            
            submit_btn = page.query_selector('button[type="submit"], button.p-button')
            if submit_btn:
                submit_btn.click()
            
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(1)
            print(f"  Logged in, current URL: {page.url}")
            
            # Now find and click logout
            logout_link = page.query_selector('a:has-text("Logout"), button:has-text("Logout"), [class*="logout"]')
            if logout_link:
                logout_text = logout_link.inner_text().strip()[:50]
                print(f"  Found logout: '{logout_text}'")
                href = logout_link.get_attribute('href')
                if href and href.startswith('/'):
                    page.goto(f"http://127.0.0.1:5173{href}", timeout=15000)
                else:
                    logout_link.click()
                page.wait_for_load_state('networkidle', timeout=10000)
                time.sleep(0.5)
                print(f"  After logout URL: {page.url}")
                if '/login' in page.url:
                    print("  PASS: Logout redirected to login")
                else:
                    print("  FAIL: Logout did not redirect to login")
                    errors.append("Logout did not redirect to login")
            else:
                print("  WARN: No logout button/link found")
                
        except Exception as e:
            print(f"  FAIL: {e}")
            errors.append(f"Logout error: {e}")
        
        # ============================================================
        # Console Errors Summary
        # ============================================================
        print("\n" + "=" * 60)
        print("CONSOLE ERRORS SUMMARY")
        print("=" * 60)
        if console_errors:
            print(f"  {len(console_errors)} console error(s) found:")
            for err in console_errors[:10]:
                print(f"    - {err[:200]}")
        else:
            print("  No console errors detected")
        
        browser.close()
        
        # ============================================================
        # Final Summary
        # ============================================================
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        if errors:
            print(f"  ERRORS FOUND: {len(errors)}")
            for err in errors:
                print(f"    ✗ {err}")
        else:
            print("  All tests passed!")
        
        return len(errors)

if __name__ == '__main__':
    error_count = run_tests()
    sys.exit(1 if error_count > 0 else 0)
