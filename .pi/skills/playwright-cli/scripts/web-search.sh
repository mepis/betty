#!/usr/bin/env bash
# Web search using playwright-cli + search engine
# Usage: web-search.sh "search query" [num_results] [engine]
# Engines: bing (default), searxng
#
# Examples:
#   web-search.sh "latest React features" 5
#   web-search.sh "playwright-cli documentation"
#   web-search.sh "Rust programming" 3 searxng
#   web-search.sh "Go vs Rust" 5 bing

set -euo pipefail

QUERY="${1:?Usage: web-search.sh \"search query\" [num_results] [engine]}"
NUM_RESULTS="${2:-10}"
ENGINE="${3:-bing}"

echo "=== Searching: $QUERY (engine: $ENGINE) ==="
echo ""

case "$ENGINE" in
  searxng)
    # ── SearxNG (fast, clean JSON API with real URLs) ──────────────────────
    SEARCH_URL="http://100.91.131.108/searxng/search?q=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$QUERY")&format=json"
    
    SEARCH_RESULT=$(curl -s --max-time 15 "$SEARCH_URL" | python3 -c "
import sys, json

try:
    data = json.loads(sys.stdin.read())
    results = data.get('results', [])[:$NUM_RESULTS]
    output = []
    for r in results:
        output.append({
            'title': r.get('title', 'Untitled').strip(),
            'url': r.get('url', ''),
            'content': (r.get('content', '') or '').strip()
        })
    print(json.dumps(output))
except json.JSONDecodeError:
    print('[]')
except Exception as e:
    print(f'[\"Error: {e}\"]')
")
    
    # Format and print results
    echo "$SEARCH_RESULT" | python3 -c "
import sys, json

try:
    results = json.loads(sys.stdin.read())
    if not results:
        print('No results found. Try a different query.')
        sys.exit(0)
    
    for i, r in enumerate(results, 1):
        title = r.get('title', 'Untitled').strip()
        url = r.get('url', '')
        content = r.get('content', '').strip()
        
        if len(title) > 100:
            title = title[:97] + '...'
        
        print(f'{i}. {title}')
        if url:
            print(f'   {url}')
        if content:
            if len(content) > 150:
                content = content[:147] + '...'
            print(f'   {content}')
        print()
        
except json.JSONDecodeError:
    print('Error parsing results:', sys.stdin.read()[:200])
"
    ;;
  
  bing)
    # ── Bing (headless-browser friendly via playwright-cli) ─────────────────
    ENCODED_QUERY=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$QUERY")
    
    playwright-cli open "https://www.bing.com/search?q=$(echo "$ENCODED_QUERY")" 2>/dev/null
    
    PLAYWRIGHT_RESULT=$(playwright-cli --raw eval "
      (() => {
        const results = [];
        const seen = new Set();
        const resultEls = document.querySelectorAll('li.b_algo');
        for (const li of resultEls) {
          const titleEl = li.querySelector('h2 a');
          const snippetEl = li.querySelector('.b_caption p, .b_lineClamp, p');
          if (!titleEl) continue;
          const title = titleEl.textContent?.trim();
          const url = titleEl.href || '';
          const snippet = snippetEl?.textContent?.trim();
          if (title && title.length > 5 && title.length < 200 && !seen.has(title)) {
            seen.add(title);
            results.push({ title, url, snippet: snippet || '' });
          }
          if (results.length >= $NUM_RESULTS) break;
        }
        return JSON.stringify(results);
      })()
    ")
    
    playwright-cli close >/dev/null 2>&1 || true
    
    echo "$PLAYWRIGHT_RESULT" | python3 -c "
import sys, json

try:
    raw = sys.stdin.read()
    results = json.loads(json.loads(raw))
    if not results:
        print('No results found. Try a different query.')
        sys.exit(0)
    
    for i, r in enumerate(results, 1):
        title = r.get('title', 'Untitled').strip()
        raw_url = r.get('url', '')
        url = raw_url
        snippet = r.get('snippet', '').strip()
        
        if len(title) > 100:
            title = title[:97] + '...'
        
        print(f'{i}. {title}')
        if url:
            print(f'   {url}')
        if snippet:
            if len(snippet) > 150:
                snippet = snippet[:147] + '...'
            print(f'   {snippet}')
        print()
        
except json.JSONDecodeError:
    print('Error parsing results:', raw[:200] if 'raw' in dir() else sys.stdin.read()[:200])
"
    ;;
  
  *)
    echo "Error: Unknown engine '$ENGINE'. Use 'bing' or 'searxng'."
    echo "Usage: web-search.sh \"query\" [num_results] [bing|searxng]"
    exit 1
    ;;
esac
