---
title: Nuggets
created_at: 12/20/2024
updated_at: 12/21/2025
keywords:
  - nuggets
  - technical writing
  - documentation
---

# Nuggets

This section contains short, focused articles about interesting technical details within the tldraw library. These are "behind-the-scenes" explorations of implementation choices, surprising behaviors, and solutions to non-obvious problems.

## Workflow

Each nugget lives in a folder (e.g., `arc-arrows/`) containing:

- `{topic}-raw.md` — Raw notes, research, and source material
- `{topic}-1.md`, `{topic}-2.md`, etc. — Numbered drafts

The workflow for creating and refining nuggets:

1. **[Generate](./GENERATE.md)** — Create a draft from raw notes
2. **[Evaluate](./EVALUATE.md)** — Score the draft and record in frontmatter
3. **[Improve](./IMPROVE.md)** — Fix issues and create a new draft

Repeat evaluate → improve until all scores reach 8+.

## Frontmatter

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

See [VOICE.md](./VOICE.md) for writing style guidelines.

## What belongs here

- **Surprising details**: Unexpected behaviors or edge cases in common features
- **Unintuitive implementations**: Places where the code takes an unexpected approach due to specific constraints
- **Clever solutions**: Techniques developed to solve complex problems
- **Platform quirks**: Browser limitations, API inconsistencies, and workarounds

## Purpose

These articles serve as technical reference for contributors and curious developers who want to understand why certain parts of tldraw work the way they do. Unlike tutorials or guides, nuggets focus on the "why" behind implementation decisions rather than the "how" of using features.

## What makes a nugget worth writing

Not every implementation detail deserves an article. The best nuggets share these qualities:

**A genuine insight, not just an implementation**. "How we render arrows" isn't interesting. "Why we use circular arcs instead of bezier curves, and what that constraint buys us" is. The reader should learn something they can apply elsewhere, not just understand your code.

**A problem that's harder than it looks**. Click detection seems trivial until you handle double/triple/quadruple clicks, drag thresholds, touch vs mouse, and race conditions. If the naive solution works fine, there's no nugget.

**A decision that challenges conventional wisdom**. "React as a canvas renderer" works because the obvious choice (HTML canvas) has real problems that aren't immediately apparent. "Real-time sync" works because CRDTs are the default answer and we rejected them for specific reasons. If you made the obvious choice and it worked, that's not a story.

**Constraints that aren't obvious until you hit them**. Safari's font loading race condition, browser clipboard sanitization, canvas size limits—these are interesting because developers won't anticipate them. Implementation details that follow straightforwardly from requirements are not.

**Don't write a nugget if:**

- You're documenting a feature, not explaining a hard problem
- The "interesting" part is just that you implemented something complex
- You can't articulate why someone outside tldraw would care
- The solution is the obvious one and it worked

## Article types

Not all nuggets follow the same structure. Choose the approach that fits your topic:

**Problem → Solution**: "When building X, we ran into this problem. The obvious approach doesn't work because... Here's what we do instead." Best for counterintuitive implementations where the failure mode is the interesting part.

- Examples: jittered-indices, arc-arrows, click-state-machine, shape-culling

**How it works**: "Here's how X works under the hood." More explanatory than narrative. The interest is in the mechanism itself, not a specific problem it solves. These don't need a dramatic opening—just start with what it is.

- Examples: sync, signals, react-canvas, hit-testing

**Platform quirk**: "Browsers do this unexpected thing. Here's the workaround." Documents behavior developers won't anticipate until they hit it.

- Examples: safari-hell, browser-canvas-size, wheel-or-trackpad

The "show the failure mode first" advice applies most to problem→solution articles. For "how it works" articles, a quieter opening like "here's an interesting thing about how we do X" works fine.

## Writing approach

**Ground the reader first**. For problem→solution articles, show what goes wrong. For "how it works" articles, establish context. Don't dive into code before the reader knows why they should care.

**Code examples should illustrate insights, not just show implementation**. The averaging trick in freehand curves deserves a code block because it's the core insight. The full SVG path building doesn't—that's just plumbing.

**Be honest about tradeoffs**. "The memory cost is worth it" or "this is a hack and we know it" (Safari's 250ms sleep). Don't pretend every solution is elegant.

**Link to source files at the bottom** so readers can explore further.

## What to avoid

These patterns make articles feel templated or artificial:

**Announcing insights**. Don't write "The key insight is..." or "The insight here is...". Just explain it. If it's genuinely insightful, the reader will recognize it.

**Formulaic section headers**. Headers like "**The tradeoff:**" or "**The result:**" as standalone transitions feel like AI organizing thoughts. Prefer natural prose or descriptive headers that tell you what the section contains.

**Promotional language**. Avoid "This is powerful for...", "This pattern is particularly valuable for...", or similar phrases that read like marketing copy.

**Forced broader applicability**. Not every nugget needs a "when to use this elsewhere" section. Some articles are interesting because of the specific problem, not a general pattern. If the broader applicability feels strained, leave it out.

**Checklists of when to use / when not to use**. These often read like boilerplate. If the article is clear, readers can judge applicability themselves.

**Conclusions that just summarize**. The conclusion should add perspective—a reflection, an honest assessment, or connection to something larger. Don't just repeat what you said.

## Structure

Each nugget should tell a complete story with a beginning, middle, and end.

**Introduction**: Open with the problem or surprising behavior. What would go wrong without this solution? Why does this matter? Ground the reader in a concrete scenario before diving into technical details.

**Body**: Explain the solution, implementation details, and any interesting edge cases. Use code examples where they clarify. This is the bulk of the article.

**Conclusion**: Wrap up with perspective. This might be:

- Reflecting on tradeoffs ("The memory cost is worth it for the UX improvement")
- Noting what surprised you or what you learned ("This seemed simple until we hit Safari")
- Connecting to the bigger picture ("This pattern appears throughout the codebase")
- Acknowledging limitations or future possibilities ("This works for our scale; larger documents might need a different approach")

The conclusion doesn't need to be long—a paragraph is often enough. But don't just stop after the last technical detail. Give the reader a sense of closure and takeaway.

## Articles

### Completed

- [Arc arrows](./arc-arrows.md) - How curved arrows calculate intersection points, handle bindings, and render clean arcs between shapes
- [Browser canvas size limits](./browser-canvas-size.md) - Probing and caching maximum canvas dimensions across browsers
- [Brush vs scribble selection](./brush-scribble-selection.md) - The algorithms behind rectangular and freeform selection
- [Cross-tab synchronization](./cross-tab-sync.md) - How tldraw keeps documents in sync across browser tabs using BroadcastChannel
- [Deep link encoding](./deep-links.md) - Compact URL-safe representation of viewport and selection state
- [Elbow arrows](./elbow-arrows.md) - How orthogonal connector arrows route around shapes with edge-based pathfinding
- [Hit testing](./hit-testing.md) - How tldraw decides which shape is under the pointer
- [Image level of detail](./image-lod.md) - How tldraw loads appropriate image resolutions based on zoom level
- [Jittered fractional indices](./jittered-indices.md) - Why shape z-ordering uses randomized keys in multiplayer
- [Perfect dash patterns](./perfect-dash-patterns.md) - Calculating dash-offset/dash-array for aesthetically pleasing strokes
- [PNG scale metadata](./png-scale.md) - How tldraw handles PNG scale information and browser clipboard limitations
- [React as a canvas renderer](./react-canvas.md) - How tldraw uses React and DOM instead of HTML canvas, and the optimizations that make it fast
- [Resize handle positioning](./resize-handles.md) - Handle placement and cursor direction on rotated shapes
- [Runtime validation](./runtime-validation.md) - Catching bad data early with fast incremental validation
- [Safari hell](./safari-hell.md) - Browser workarounds for Safari and iOS quirks
- [Seeded randomness for hand-drawn shapes](./inky-rng.md) - How we use seeded randomness to create stable, organic-looking shapes in draw style
- [Shape culling](./shape-culling.md) - Excluding off-viewport shapes from rendering
- [Shape font loading](./shape-font-loading.md) - Using microtask batching to coalesce font requests across shapes
- [Signals](./signals.md) - Why tldraw uses custom signals for fine-grained reactivity instead of MobX or React state
- [SVG paths from hand-drawn points](./freehand-ink.md) - Converting raw points to smooth Bezier curves with the averaging algorithm
- [Sync](./sync.md) - How tldraw's real-time collaboration uses a git-like rebase model instead of CRDTs
- [Scribble animation](./scribble-animation.md) - The delay queue system for animated feedback marks
- [Click detection state machine](./click-state-machine.md) - How single/double/triple/quadruple clicks are distinguished
- [Pinch gesture disambiguation](./pinch-gesture.md) - How two-finger gestures are classified as zoom or pan
- [Text measurement caching](./text-measurement.md) - Measuring text efficiently with a hidden DOM element
- [Tools as state machines](./state-chart.md) - How tools use hierarchical state machines instead of boolean flags
- [Wheel momentum filtering](./wheel-momentum.md) - Detecting and ignoring phantom scroll events from use-gesture
- [Wheel or trackpad?](./wheel-or-trackpad.md) - Why it's impossible to detect input device type, and how asking the user beats guessing
- [Edge scrolling](./edge-scrolling.md) - Auto-scrolling when dragging near viewport edges
- [Incremental bindings index](./incremental-bindings.md) - Using epochs and diffs to avoid full index rebuilds
- [IndexedDB migrations](./indexeddb-migrations.md) - Handling schema upgrades and data migration
- [Undo/redo squashing](./undo-redo-squashing.md) - Collapsing ephemeral changes into single history entries
