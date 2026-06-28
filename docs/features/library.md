---
tags: [feature, library, research, user]
---

# Research Library

The Research Library is Betty's built-in documentation browser for archived research documents. It provides a browsable, searchable interface to the library stored at `~/.betty/library/`.

## Overview

The library organizes research into **topics**, each containing:

- `index.md` — Topic summary and metadata
- `report.md` — Full research report (optional)
- `state.md` — Research state notes (optional)

Topics are tagged for filtering and cross-referencing.

## Library Structure

````mermaid
graph TD
    LIB["~/.betty/library/"] --> INDEX["INDEX.md"]
    LIB --> TOPICS["topics/"]
    LIB --> TAGS["tags/"]
    TOPICS --> T1["llama-cpp-performance/"]
    TOPICS --> T2["gpu-memory-management/"]
    T1 --> T1I["index.md"]
    T1 --> T1R["report.md"]
    T1 --> T1S["state.md"]
    T2 --> T2I["index.md"]
    T2 --> T2R["report.md"]
    TAGS --> TG1["llama-cpp.md"]
    TAGS --> TG2["gpu.md"]
````

```
~/.betty/library/
├── INDEX.md              # Library index
├── topics/
│   ├── llama-cpp-performance/
│   │   ├── index.md
│   │   ├── report.md
│   │   └── state.md
│   ├── gpu-memory-management/
│   │   ├── index.md
│   │   └── report.md
│   └── ...
└── tags/
    ├── llama-cpp.md
    ├── gpu.md
    └── ...
```

## Browse Topics

List all research topics:

```
GET /api/library
```

Returns topics sorted by date (newest first), each with:

| Field | Description |
|-------|-------------|
| `slug` | URL-safe identifier |
| `title` | Display title |
| `date` | Research date (YYYY-MM-DD) |
| `tags` | Array of tag strings |
| `summary` | Extracted summary paragraph |

## View Topic

Load a specific topic's content:

```
GET /api/library/:topicSlug
```

Returns:

```json
{
  "success": true,
  "data": {
    "index": "Full index.md content...",
    "report": "Full report.md content... (if exists)",
    "tags": ["llama-cpp", "performance"]
  }
}
```

## Browse Tags

List all available tags:

```
GET /api/library/tags
```

Returns an array of tag names (derived from `tags/*.md` files).

## Filter by Tag

Find all topics with a specific tag:

```
GET /api/library/tag/:tagname
```

Returns topics associated with the tag:

```json
{
  "success": true,
  "data": [
    { "title": "Llama.cpp Performance", "slug": "llama-cpp-performance" },
    { "title": "GPU Memory Management", "slug": "gpu-memory-management" }
  ]
}
```

## Frontmatter Parsing

Topic metadata is extracted from `index.md` frontmatter:

```markdown
---
title: Llama.cpp Performance Optimization
date: 2024-01-15
tags: llama-cpp, performance, gpu
---

# Llama.cpp Performance Optimization

Summary paragraph extracted here...
```

Tags are also parsed from `Tags:` lines at the end of documents or `**Tags:**` inline format.

## Library UI

The Library view provides:

- **Topic list** — sorted by date with tag badges
- **Tag filter** — click a tag to filter topics
- **Topic detail** — rendered markdown with index and report tabs
- **Refresh** — reload topics and tags from disk

## Related

- [[features/library-import-export]] — Import and export library content
- [[features/library]] — Research skill for creating new topics
- [[USER-MANUAL]] — Library usage guide
