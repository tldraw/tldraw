---
name: write-tbp
description: Writing technical blog posts about tldraw features and implementation details. Use when creating blog content about how tldraw solves interesting problems.
---

# Write technical blog post

This skill covers how to write technical blog posts about tldraw's implementation details.

## Process

### 1. Create the workspace

Create an assets folder for this topic:

```
.claude/skills/write-tbp/assets/<topic>/
├── research.md   # Gathered context and notes
└── draft.md      # The blog post draft
```

Use a short, kebab-case name for the topic (e.g., `scribbles`, `arrow-routing`, `dash-patterns`).

### 2. Research the topic

Use an Explore subagent to gather all relevant information:

```
Task (subagent_type: Explore, thoroughness: very thorough)

Find all code, documentation, and context related to [TOPIC] in the tldraw codebase.

Look for:
- Implementation files in packages/editor and packages/tldraw
- Type definitions in packages/tlschema
- Related examples in apps/examples
- Any existing documentation in apps/docs/content
- Tests that reveal behavior
- Comments explaining why things work the way they do

For each relevant file, note:
- What it does
- Key functions/classes
- Interesting implementation details
- Any "why" comments or non-obvious decisions

Output a comprehensive summary of how [TOPIC] works. This document will be read by another agent. No need to over-optimize for human readability.
```

Save the research output to `assets/<topic>/research.md`.

### 3. Identify the interesting angle

Before writing, answer these questions from the research:

- **What problem does this solve?** Not "what does it do" but "what would go wrong without it?"
- **What's surprising or unintuitive?** The obvious approach that doesn't work, or the hidden complexity.
- **What's the key insight?** The "aha" that makes the solution work.
- **What did we try first?** Any journey or iteration visible in the code or comments.

If you can't find an interesting angle, the topic may not be suitable for a technical blog post.

### 4. Write the draft

Create `assets/<topic>/draft.md` following the blog-guide structure:

1. **Frame the problem** — Hook the reader with context and tension
2. **Show the insight** — The key idea that makes it work
3. **Walk through the implementation** — Code and explanation, building complexity
4. **Wrap up** — Where it lives, tradeoffs, links to files

Target 800-1500 words.

### 5. Self-evaluate

Check the draft against the blog-guide checklist:

- [ ] **Opening** — Does it frame a problem before diving into solution?
- [ ] **Insight** — Is there a clear "aha" moment or key idea?
- [ ] **Specificity** — Is this grounded in tldraw's actual implementation?
- [ ] **Code** — Do examples build understanding, not just show syntax?
- [ ] **Tone** — Warm and personal, but not rambling?
- [ ] **Links** — Points to actual code in the repo?
- [ ] **Length** — Appropriate depth for the topic?

Revise the draft to address any gaps.

### 6. Output

Present the final draft to the user for review. The draft remains in `assets/<topic>/draft.md` until the user is satisfied, at which point they can move it to the appropriate location.

## References

- **Style guide**: See `../shared/blog-guide.md` for voice, tone, and structure.
- **Writing guide**: See `../shared/writing-guide.md` for general writing conventions.
