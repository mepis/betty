# Merlin Library

A persistent, growing knowledge library built from deep research sessions. Each entry is a structured research report on a specific topic, organized for easy reference and cross-referencing.

## Structure

```
library/
├── README.md           ← You are here
├── INDEX.md            ← Master index of all topics with metadata
├── topics/             ← Topic entries (one directory per topic)
│   └── <topic-slug>/
│       ├── index.md    ← Topic overview + sub-entry listing
│       ├── report.md   ← Full analytical report
│       ├── state.md    ← Research state snapshot (for reference)
│       └── entries/    ← Individual research entries (optional)
│           └── <entry-slug>.md
└── tags/               ← Tag-based cross-reference index
    └── <tag>.md        ← All entries with this tag
```

## How to Use

### As a Researcher (Human)

1. Open `INDEX.md` to browse topics by name, date, or tags
2. Navigate to `topics/<topic-slug>/` for the full research
3. Use tag files in `tags/` to find related topics

### As an Agent (pi)

When running the `deep-research` skill:

1. **Before research:** Check `INDEX.md` and `topics/` for existing related entries to reference and avoid duplication
2. **During research:** The skill auto-references existing library entries during Phase 1 scoping
3. **After research:** The skill automatically:
   - Creates a topic directory under `topics/`
   - Writes the full report to `report.md`
   - Creates or updates the topic `index.md`
   - Updates the master `INDEX.md`
   - Creates/updates tag files in `tags/`
   - Commits all changes

### As a Reader

Each topic entry contains:
- **Executive Summary** — Quick overview (3 paragraphs max)
- **Methodology** — How the research was conducted
- **Detailed Findings** — Core content, organized by sub-topic
- **Conclusion** — Definitive answer to the research question
- **Future Work** — Actionable next steps
- **Citations** — MLA-formatted source list

## Contributing

New research entries are added automatically by the deep-research skill. To add a manual entry:

1. Create `topics/<topic-slug>/` directory
2. Write `index.md` and `report.md` following the template
3. Update `INDEX.md` with the new entry
4. Update relevant tag files in `tags/`
5. Commit with a descriptive message
