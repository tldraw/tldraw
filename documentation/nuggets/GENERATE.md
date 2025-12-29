---
title: Generating nuggets
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - workflow
  - generate
status: published
date: 12/21/2025
order: 2
---

# Generating nuggets

This guide explains how to create a nugget article from raw notes.

## Input files

Each nugget lives in a folder (e.g., `arc-arrows/`) containing:

- `{topic}-raw.md` — Raw notes, research, code snippets, and source material
- `{topic}-1.md`, `{topic}-2.md`, etc. — Numbered drafts

Your job is to read the raw notes and produce the next numbered draft.

## Required frontmatter

Every draft must have frontmatter:

```yaml
---
title: Arc arrows
created_at: 12/20/2024
updated_at: 12/21/2024
keywords:
  - arrows
  - arcs
  - bezier
---
```

After evaluation, scores and notes are added:

```yaml
---
title: Arc arrows
created_at: 12/20/2024
updated_at: 12/21/2024
keywords:
  - arrows
  - arcs
  - bezier
readability: 9
voice: 9
potential: 8
accuracy: 10
notes: 'Strong opening with bezier failure mode.'
---
```

## Before writing

1. Read the raw notes thoroughly
2. Read [write-nuggets.md](../../.claude/skills/write-nuggets.md) for voice and structure guidelines
3. Read source files mentioned in the raw notes to verify accuracy

## Writing the draft

Follow the structure from write-nuggets.md:

1. **Frame the problem** — What's this about? What problem did we encounter? Why was it hard or interesting?
2. **Show the insight** — What's the key idea that makes the solution work?
3. **Walk through the implementation** — Code and explanation, building up complexity
4. **Wrap up** — Tradeoffs, where this lives in the codebase, links to files

### Voice checklist

- Open with our experience ("When we added...", "We wanted...")
- Use "we" for tldraw decisions, "you" for the reader
- No hollow importance claims ("serves as a testament", "plays a crucial role")
- No trailing gerund phrases ("...ensuring optimal performance")
- No formulaic transitions ("Moreover," "Furthermore,")
- No rule-of-three lists unless the count is actually three
- No promotional language ("robust," "seamless," "empowers")
- Em dashes used sparingly

### What to avoid

- Announcing insights ("The key insight is...")
- Formulaic section headers ("**The tradeoff:**", "**The result:**")
- Forced broader applicability sections
- Conclusions that just summarize

## Output

Save the draft as the next numbered file (e.g., if `arc-arrows-2.md` exists, create `arc-arrows-3.md`).

The draft should be ready for evaluation using [EVALUATE.md](./EVALUATE.md).
