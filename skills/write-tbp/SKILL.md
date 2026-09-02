---
name: write-tbp
description: Writing technical blog posts about tldraw features and implementation details. Use when creating blog content about how tldraw solves interesting problems.
---

# Write technical blog post

This skill covers how to write technical blog posts about tldraw's implementation details.

## Process

### 1. Create the workspace

Create an assets folder for this topic in this skill directory:

```
assets/<topic>/
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

1. **State the problem** — What the system does and what would go wrong without it
2. **Show the insight** — The key idea that makes it work
3. **Walk through the implementation** — Code and explanation, building complexity
4. **Wrap up** — Where it lives, tradeoffs, links to files

Target 800-1500 words.

#### Draft plainly

The draft is raw material for a human editor, not the finished post. Keep it clean and let the content carry it. The editor will add the personality, anecdotes, and punch where they want them; that is much easier to do on top of a plain, correct draft than to strip out of an overwritten one.

Concretely:

- Open by saying what the system does and what the post covers. Do not open with a scene, an anecdote, or a hypothetical user ("your train goes into a tunnel..."). Those read as AI filler and the editor will cut them.
- Build the story from the mechanism: what problem each piece solves, in the order the pieces depend on each other. Tension comes from the design (a scan can't see deletions; the pruner used to leave a hole), not from prose.
- State journeys and bugs flatly. "An earlier version of the pruner did not advance the watermark, so stale clients received diffs with no deletes" is enough. Skip "we learned this the hard way" and similar narration.
- No punchline sentences, no chiasmus, no closing zingers. If a sentence exists to sound good rather than to say something, cut it.
- One em dash per paragraph at most; usually zero.
- Keep opinions to the wrap-up, and keep them short and specific ("we accept a full redownload for clients gone long enough, in exchange for bounded metadata").
- Where the human parts belong (opening, provenance, tradeoffs), leave the paragraph plain rather than inventing color. Mention those spots in your handoff.

### 5. Self-evaluate

Check the draft against the blog-guide checklist:

- [ ] **Opening** — Does it state the problem plainly before the solution, without a staged anecdote?
- [ ] **Insight** — Is there a clear key idea, and does the structure build toward it?
- [ ] **Specificity** — Is this grounded in tldraw's actual implementation?
- [ ] **Code** — Do examples build understanding, not just show syntax?
- [ ] **Tone** — Plain and direct? No pathos, no punchlines, nothing an editor would recognize as AI cruft?
- [ ] **Links** — Points to actual code in the repo?
- [ ] **Length** — Appropriate depth for the topic?

Revise the draft to address any gaps.

### 6. Output

Present the final draft to the user for review, and point out where a human editor is most likely to want to add color (usually the opening, any provenance or bug story, and the tradeoffs). The draft remains in `assets/<topic>/draft.md` until the user is satisfied, at which point they can move it to the appropriate location.

## References

- **Style guide**: See `../shared/blog-guide.md` for voice, tone, and structure.
- **Writing guide**: See `../../VOICE.md` for general writing conventions.
