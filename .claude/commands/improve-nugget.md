---
name: improve-nugget
description: Improve a nugget draft based on its evaluation scores. Use this when a draft has scores below 8 in any dimension.
---

# Improving nuggets

This command improves a nugget draft based on its evaluation scores.

## Before improving

1. Read the current draft's frontmatter for scores and notes
2. Read the `write-nugget` skill for voice and structure guidelines
3. Read source files to verify any accuracy concerns

## Output

Save as the next numbered file (e.g., `arc-arrows-2.md` → `arc-arrows-3.md`).

Add a `draft-notes` field to the frontmatter explaining what changed:

```yaml
---
title: Arc arrows
draft-notes: 'Rewrote opening. Removed AI tells. Tightened prose.'
---
```

Then evaluate the new draft using the `evaluate-nugget` command.
The draft-notes should briefly describe:

- What major changes were made
- Which specific issues were fixed
- What approach was taken to improve scores

The improved draft should then be evaluated fresh using the evaluate-nugget skill. Use a separate evaluation pass—don't self-evaluate immediately after improving.
