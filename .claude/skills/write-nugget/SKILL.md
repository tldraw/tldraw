---
name: write-nugget
description: Generate a nugget draft from raw notes. Use this when creating a new draft in documentation/nuggets/.
---

# Writing nugget drafts

Nuggets are short, focused articles about interesting technical details in tldraw. They explore the "why" behind implementation decisions, surprising behaviors, and solutions to non-obvious problems.

## File structure

Each nugget lives in `documentation/nuggets/{topic}/` containing:

- `{topic}-raw.md` — Raw notes, research, code snippets
- `{topic}-1.md`, `{topic}-2.md`, etc. — Numbered drafts

Your job: read the raw notes and produce the next numbered draft.

## Before writing

**Important**: Read VOICE.md for the writing style and voice.

1. Read the raw notes thoroughly
2. Read source files mentioned in the notes to verify accuracy
3. Determine the next draft number (if `arc-arrows-2.md` exists, create `arc-arrows-3.md`)

## Required frontmatter

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

## Article types

Choose the structure that fits your topic:

**Problem → Solution**: Show what goes wrong with the obvious approach, then explain what we do instead. Best for counterintuitive implementations.

**How it works**: Explain the mechanism directly. The interest is in how something operates, not a specific problem it solves.

**Platform quirk**: Document unexpected browser behavior and our workaround.

## Structure

1. **Frame the problem** — What's this about? Why is it interesting or hard?
2. **Show the insight** — What makes the solution work?
3. **Walk through implementation** — Code and explanation, building complexity
4. **Wrap up** — Tradeoffs, reflections, links to source files

## What makes a nugget worth writing

Not every implementation deserves an article. Good nuggets have:

- **A genuine insight** — "Why we use circular arcs instead of bezier curves" is interesting; "how we render arrows" is not
- **A problem harder than it looks** — If the naive solution works, there's no nugget
- **A decision that challenges conventional wisdom** — Something unexpected about the approach
- **Constraints that aren't obvious** — Browser quirks, edge cases, limitations developers won't anticipate

## Output

Save the draft as the next numbered file in the nugget folder.
