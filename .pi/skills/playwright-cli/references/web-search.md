# Web Search with playwright-cli

## Quick Search

Use the helper script for instant results:

```bash
cd /root/git/betty/.pi/skills/playwright-cli
./scripts/web-search.sh "your search query" [num_results] [engine]
```

Search engines available:
- **SearxNG** (default) — fast, clean JSON API, real URLs, no browser needed
- **Bing** — browser-based via playwright-cli (fallback option)

Examples:
```bash
./scripts/web-search.sh "playwright vs puppeteer" 5
./scripts/web-search.sh "latest TypeScript features"
./scripts/web-search.sh "Rust programming" 3 searxng
./scripts/web-search.sh "Go vs Rust" 5 bing
```

## SearxNG (Preferred)

SearxNG is a metasearch engine that aggregates results from multiple sources. It's the recommended option because it returns clean JSON with real URLs.

### Via curl (fastest)

```bash
curl -s "http://100.91.131.108/searxng/search?q=your+search+terms&format=json" | jq '.results[:5][] | {title, url, content}'
```

### Via helper script

```bash
./scripts/web-search.sh "your query" 10 searxng
```

### Available fields

Each result object contains:
- `title` — result title
- `url` — direct URL to the page
- `content` — snippet/description text
- `engine` — source search engine (e.g., google, duckduckgo)
- `category` — result category (general, images, news, etc.)
- `publishedDate` — publication date if available
- `score` — relevance score

### Filter by category

```bash
# News results
curl -s "http://100.91.131.108/searxng/search?q=ai+news&format=json&categories=news" | jq '.results[:5]'

# Images
curl -s "http://100.91.131.108/searxng/search?q=typescript&format=json&categories=images" | jq '.results[:5]'
```

## Manual Search Workflow

### 1. Search Bing

```bash
# Search directly
playwright-cli open --headed "https://www.bing.com/search?q=your+search+terms"
playwright-cli snapshot
```

> **Note:** SearxNG is preferred over Bing. Use Bing only when SearxNG is unavailable.

### 2. Extract Results as JSON (Bing)

```bash
# Get titles, URLs, and snippets
playwright-cli --raw eval "
  [...document.querySelectorAll('li.b_algo')].map(li => ({
    title: li.querySelector('h2 a')?.textContent?.trim(),
    url: li.querySelector('h2 a')?.href,
    snippet: li.querySelector('.b_caption p, .b_lineClamp, p')?.textContent?.trim()
  })).filter(r => r.title)
"
```

### 3. Browse Individual Results

```bash
# Open a result in a new tab
playwright-cli tab-new "https://example.com/article"
playwright-cli snapshot
```

### 4. Extract Page Content

```bash
# Get full page text
playwright-cli --raw eval "document.body.innerText"

# Get article content specifically
playwright-cli --raw eval "
  document.querySelector('article')?.innerText || 
  document.querySelector('.article-content')?.innerText || 
  document.body.innerText
"
```

## Tips

- **SearxNG is preferred** — faster, returns real URLs, no browser overhead
- Bing results use redirect URLs — they work when opened in the browser
- Use `--raw` to strip formatting and get clean output for parsing
- Use `--json` with `list` command for structured session output
- Results from `eval` are plain text; pipe to `jq` for JSON processing
- Use `snapshot` between steps to see the current page state
- Always close with `playwright-cli close` when done

## Common Search Patterns

### Compare multiple sources

```bash
# SearxNG: get results from multiple engines
curl -s "http://100.91.131.108/searxng/search?q=playwright+vs+puppeteer&format=json" | jq '.results[:10] | group_by(.engine)[] | {engine: .[0].engine, results: [.[].title]}'
```

### Search within a specific site

```bash
curl -s "http://100.91.131.108/searxng/search?q=playwright+site:github.com&format=json" | jq '.results[:5]'
```

### Extract structured data from search results

```bash
# SearxNG: get all results as clean JSON
curl -s "http://100.91.131.108/searxng/search?q=your+query&format=json" | jq '.results[:10] | map({title, url, content})'
```

### Search and open top result

```bash
# SearxNG: search and open the first result
TOP_URL=$(curl -s "http://100.91.131.108/searxng/search?q=your+query&format=json" | jq -r '.results[0].url')
playwright-cli open --headed "$TOP_URL"
playwright-cli snapshot
```
