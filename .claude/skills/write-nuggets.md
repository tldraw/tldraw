---
name: write-nugget
description: Guidelines for writing nuggets - short technical articles about interesting implementation details in tldraw. Use this when writing or reviewing nuggets in documentation/nuggets/.
---

# Writing nuggets

Nuggets are short, focused articles about interesting technical details within the tldraw library. These are "behind-the-scenes" explorations of implementation choices, surprising behaviors, and solutions to non-obvious problems.

Unlike tutorials or guides, nuggets focus on the "why" behind implementation decisions rather than the "how" of using features.

## What belongs in a nugget

- **Surprising details**: Unexpected behaviors or edge cases in common features
- **Unintuitive implementations**: Places where the code takes an unexpected approach due to specific constraints
- **Clever solutions**: Techniques developed to solve complex problems
- **Platform quirks**: Browser limitations, API inconsistencies, and workarounds

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

**How it works**: "Here's how X works under the hood." More explanatory than narrative. The interest is in the mechanism itself, not a specific problem it solves. These don't need a dramatic opening—just start with what it is.

**Platform quirk**: "Browsers do this unexpected thing. Here's the workaround." Documents behavior developers won't anticipate until they hit it.

The "show the failure mode first" advice applies most to problem→solution articles. For "how it works" articles, a quieter opening like "here's an interesting thing about how we do X" works fine.

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

## Voice and tone

Nuggets are warmer than reference docs. They describe what we did, not what the reader should do.

### Opening pattern

Nuggets start by **framing the problem**—a sentence or two that tells the reader what this is about and why it's interesting before diving in.

**Good nugget opening:**

> The tldraw SDK is all about making the little details work. If you've ever used dashed lines in tldraw, you might have noticed that the dashes always line up with the corners of your shape...

**Too abrupt (reads like docs):**

> Tldraw calculates dash patterns that fit paths exactly. Complete dashes at both ends, even spacing throughout.

### Describe what we did, not what to do

Frame solutions as "here's what we do" rather than prescriptive instructions:

**Don't:**

> The solution: don't decide immediately. Watch what the fingers do.

**Do:**

> Since we don't have enough information to know either way, we defer the decision. The gesture handler watches what the pointers do, then commits once we know enough.

### Pronouns

Use "we" for tldraw decisions:

> When we added curved arrows to tldraw, we wanted them to stay stable as shapes moved.

Use "you" when addressing the reader directly:

> If you've ever tried to implement this yourself, you know the naive approach fails.

### Tone

Nuggets can:

- Use "the trick is..." or "the insight is..." to signal key ideas
- Include brief asides about why something is hard or interesting
- Show the journey ("we tried X, but Y worked better")
- Be honest about hacks ("this is a hack and we know it")

They still shouldn't ramble, use hollow importance claims, or get too casual.

## Avoiding AI writing tells

AI-generated text has recognizable patterns. Avoid these to keep nuggets sounding human.

### Hollow importance claims

These phrases are red flags:

- "serves as a testament to"
- "plays a vital/crucial/significant role"
- "underscores its importance"
- "watershed moment," "key turning point," "pivotal moment"

**Don't:**

> The store plays a crucial role in tldraw's architecture, serving as a testament to the power of reactive state management.

**Do:**

> The store holds all shapes, bindings, and other records. The store is reactive: when data changes, the UI updates automatically.

### Trailing gerund phrases

AI ends sentences with vague gerund clauses that claim importance without substance:

- "...emphasizing the significance of X"
- "...ensuring a seamless experience"
- "...highlighting the importance of Z"

**Don't:**

> The editor batches updates automatically, ensuring optimal performance while highlighting the importance of reactive state management.

**Do:**

> The editor batches updates automatically. This keeps renders fast even when many shapes change at once.

### Formulaic transitions

These are overused by AI and often unnecessary:

- "Moreover," "Furthermore," "Additionally,"
- "It's important to note that..."
- "It is worth mentioning that..."

Usually you can just delete these and the sentence is stronger.

### The rule of three

AI overuses three-part lists. Real writing has lists of two, or four, or seven items. If you find yourself writing exactly three things, ask whether that's actually the right number.

### Promotional language

We're writing technical articles, not ad copy:

- "breathtaking," "stunning," "beautiful"
- "seamless," "frictionless," "effortless"
- "robust," "comprehensive," "cutting-edge"
- "empowers developers to..."

### Em dash overuse

One em dash per paragraph is fine; several is a red flag.

### Bullet points with bolded headers

In prose, this format is a ChatGPT signature:

**Don't:**

> - **Reactive updates**: The store automatically notifies subscribers when data changes.
> - **Type safety**: All records are fully typed with TypeScript.

**Do:**

> The store is reactive: it automatically notifies subscribers when data changes. All records are fully typed.

## What to avoid

These patterns make articles feel templated or artificial:

**Announcing insights**. Don't write "The key insight is..." or "The insight here is...". Just explain it. If it's genuinely insightful, the reader will recognize it.

**Formulaic section headers**. Headers like "**The tradeoff:**" or "**The result:**" as standalone transitions feel like AI organizing thoughts. Prefer natural prose or descriptive headers.

**Promotional language**. Avoid "This is powerful for...", "This pattern is particularly valuable for..." or similar marketing copy.

**Forced broader applicability**. Not every nugget needs a "when to use this elsewhere" section. If the broader applicability feels strained, leave it out.

**Checklists of when to use / when not to use**. These often read like boilerplate.

**Conclusions that just summarize**. The conclusion should add perspective—a reflection, an honest assessment, or connection to something larger. Don't just repeat what you said.

## Writing approach

**Ground the reader first**. For problem→solution articles, show what goes wrong. For "how it works" articles, establish context. Don't dive into code before the reader knows why they should care.

**Code examples should illustrate insights, not just show implementation**. The averaging trick in freehand curves deserves a code block because it's the core insight. The full SVG path building doesn't—that's just plumbing.

**Be honest about tradeoffs**. "The memory cost is worth it" or "this is a hack and we know it" (Safari's 250ms sleep). Don't pretend every solution is elegant.

**Link to source files at the bottom** so readers can explore further.

## Grammar and mechanics

### Headings

**Always use sentence case** (not Title Case):

- "Custom shapes" not "Custom Shapes"
- "Arc arrow geometry" not "Arc Arrow Geometry"

**Exception:** Proper nouns and technical names remain capitalized.

### Sentence structure

Write like a person. Prefer short, clear sentences, but natural prose has rhythm—some sentences are short, others flow longer. Break up ideas when a sentence asks the reader to hold too much in their head at once.

### Contractions

Use contractions naturally: it's, we've, you'll, won't, don't, can't, shouldn't

## Workflow

Each nugget lives in a folder under `documentation/nuggets/` (e.g., `arc-arrows/`) containing:

- `{topic}-raw.md` — Raw notes, research, and source material
- `{topic}-1.md`, `{topic}-2.md`, etc. — Numbered drafts

The workflow for creating and refining nuggets:

1. **Generate** — Create a draft from raw notes
2. **Evaluate** — Score the draft on readability, voice, potential, and accuracy
3. **Improve** — Fix issues and create a new draft

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

## Scoring criteria

Each draft is scored on four dimensions (0-10):

**Readability**: How clear and easy to understand is the writing? Clear opening, smooth transitions, code examples that clarify rather than overwhelm.

**Voice**: Does it sound like tldraw? Opens with our experience, uses "we" for tldraw decisions and "you" for the reader, no AI tells.

**Potential**: How well would this do on a technical blog or Hacker News? Genuine insight developers can apply elsewhere, problem harder than it looks.

**Accuracy**: Is the story true to the source code? Technical claims verified, code examples match actual implementation, tradeoffs honestly represented.

Drafts scoring 8+ across all dimensions are ready for final review.
