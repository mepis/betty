---
name: project-docs
description: Creates comprehensive, developer-focused documentation for projects. Generates documentation pages with diagrams, indexes, QA examples, and architecture deep-dives. Use when creating or updating project documentation.
---

# Project Documentation Creator

Create thorough, developer-focused documentation for this project. Do not stop to ask questions — keep working until all documentation is complete. After creating all pages, verify each one for correctness.

## Output Location

- Default: `<repo-root>/docs/`
- Library (if `~/.betty/library/` folder exists): `~/.betty/library/` — if `~/.betty/library/` does not exist, inform the user and skip this request.
- If documentation already exists, update it to match these standards.

## Page Requirements

### Per Function / Feature

- Each function gets its own documentation page.
- Each feature gets its own documentation page.

### Index Pages

1. **Main index** (`docs/index.md` or `~/.betty/library/index.md`)
   - Links to every documentation page.
   - Each entry includes a concise summary of the linked page.

2. **Tag index** (`docs/tags.md` or `~/.betty/library/tags.md`)
   - Organized by categories.
   - Maps tags to their documentation pages.

### QA Pages

- Create QA pages with practical, runnable examples demonstrating real-world usage.

### Architecture

- Include an architecture deep-dive page covering system design, data flow, and component relationships.

## Content Standards

- **Diagrams**: Include charts describing schemas, application flow, and component relationships. Use Markdown-native diagrams (e.g., Mermaid).
- **Tags**: Every page must include tags — use both feature-based and user-based tags.
- **Language**: Concise, jargon-free. Avoid ambiguity. Repeat critical information where helpful.
- **Cross-links**: Create relevant wiki-style links between related documentation pages.
- **Target audience**: Developers and technical engineers.

## Technical Standards

- Format: Markdown (`.md`)
- Diagrams: Markdown-native (see [Markdown Diagrams](https://www.markdownlang.com/advanced/diagrams.html))
- Links: Wiki-style (`[[page-name]]`)
- Structure: Organized folder tree reflecting the project's module/feature hierarchy.

## Workflow

1. Analyze the project source code and structure.
2. Identify all functions, features, and architectural components.
3. Create the folder tree under `docs/` (or `~/.betty/library/` if applicable).
4. Create individual pages for each function and feature.
5. Create the main index with summaries.
6. Create the tag index organized by categories.
7. Create QA pages with practical examples.
8. Create the architecture deep-dive.
9. Review every page for accuracy, completeness, and correct cross-references.
