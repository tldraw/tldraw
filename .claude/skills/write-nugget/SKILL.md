---
name: generate-nugget
description: Generate a nugget draft from raw notes. Use this when creating a new draft in documentation/nuggets/.
---

# Generating nugget drafts

Nuggets are short, focused articles about interesting technical details in tldraw. They explore the "why" behind implementation decisions, surprising behaviors, and solutions to non-obvious problems.

## File structure

Each nugget lives in `documentation/nuggets/{topic}/` containing:

- `{topic}-raw.md` — Raw notes, research, code snippets
- `{topic}-1.md`, `{topic}-2.md`, etc. — Numbered drafts

Your job: read the raw notes and produce the next numbered draft.

## Before writing

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

## Voice

Use "we" for tldraw decisions:

> When we added curved arrows, we wanted them to stay stable as shapes moved.

Use "you" when addressing the reader:

> If you've ever tried this, you know the naive approach fails.

Nuggets can:

- Use "the trick is..." to signal key ideas
- Show the journey ("we tried X, but Y worked better")
- Be honest about hacks ("this is a hack and we know it")

## Avoid AI tells

These patterns break trust:

**Hollow importance claims:**

- "plays a crucial role", "serves as a testament to"

**Trailing gerunds:**

- "...ensuring optimal performance", "...highlighting the importance of"

**Formulaic transitions:**

- "Moreover,", "Furthermore,", "It's important to note"

**Promotional language:**

- "robust", "seamless", "empowers developers"

**Rule of three lists** — Real writing has 2, 4, 7 items. If you have exactly three, ask if that's the right count.

**Em dash overuse** — One per paragraph is fine; several is a red flag.

## What to avoid

- **Announcing insights**: Don't write "The key insight is..." — just explain it
- **Formulaic section headers**: "**The tradeoff:**" as a standalone transition
- **Forced broader applicability**: Not every nugget needs "when to use elsewhere"
- **Conclusions that summarize**: Add perspective, don't repeat

## Mechanics

- **Sentence case headings**: "Custom shapes" not "Custom Shapes"
- **Contractions**: it's, we've, you'll, don't
- **Link to source files** at the bottom

## What makes a nugget worth writing

Not every implementation deserves an article. Good nuggets have:

- **A genuine insight** — "Why we use circular arcs instead of bezier curves" is interesting; "how we render arrows" is not
- **A problem harder than it looks** — If the naive solution works, there's no nugget
- **A decision that challenges conventional wisdom** — Something unexpected about the approach
- **Constraints that aren't obvious** — Browser quirks, edge cases, limitations developers won't anticipate

## Output

Save the draft as the next numbered file in the nugget folder.
