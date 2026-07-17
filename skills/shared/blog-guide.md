# Blog style guide

This document defines the rules and conventions for tldraw technical blog posts.

**Prerequisite**: Read the [writing guide](./writing-guide.md) first. This document builds on those foundations with blog-specific patterns.

## What technical blog posts are

Technical blog posts are short articles about how we solved interesting problems. They need to be _interesting_ as well as informative—if the content isn't interesting or can't be made interesting, there's no point in writing it.

A technical blog post can be interesting for a number of reasons:

- It may describe a journey from discovery, investigation, and solution
- The problem area it describes may be hard, unintuitive, or notorious
- It reveals something curious about the implementation of a common feature
- It describes iteration and design decisions behind a feature

The best content combines many of these reasons into a single article.

An evergreen approach is to root the technical article in some anecdotal context. These problems don't just emerge from nowhere—they come from details, behaviors, conventions, or general "what feels right" expectations within the canvas domain. The real problem is how to write the code and convince the computer to do the thing that makes the experience feel right. Often times, that work is unintuitive and interesting in that it reveals something about the interaction or about the technologies involved.

## Opening pattern

Technical blog posts start by **framing the problem**—a sentence or two that tells the reader what this is about and why it's interesting before diving in.

**Example opening:**

> The tldraw SDK is all about making the little details work. If you've ever used dashed lines in tldraw, you might have noticed that the dashes always line up with the corners of your shape, the handles of a spline, or the start and end of an arrow. While this might seem like the obvious way that dashes _should_ work, you might be surprised to learn that SVG offers no such feature. We implement these perfect dashes entirely ourselves.
>
> Here's how it works.

The opening establishes context (what we're talking about), tension (there's a problem or unmet expectation), and stakes (why you should care) before getting into the solution.

### Concrete vs abstract tension

The tension needs to be concrete and specific, not an abstract problem statement.

**Too abstract:**

> How do you render ephemeral, performant drawing feedback that needs to behave differently depending on the tool?

**Concrete:**

> SVG's `stroke-dasharray` doesn't give you complete dashes at both ends. We had to calculate them ourselves.

Abstract tension describes a category of problem. Concrete tension names a specific thing that doesn't work, a surprising limitation, or an unexpected behavior. Concrete tension makes the reader think "oh, I didn't know that" or "huh, I've never thought about that."

### Example openings

**Too abrupt:**

> Tldraw calculates dash patterns that fit paths exactly. Complete dashes at both ends, even spacing throughout.

**Better (starts with our experience):**

> When we added dashed lines to tldraw, we wanted them to look right—complete dashes at both ends, even spacing, corners that line up on rectangles. SVG's `stroke-dasharray` doesn't do this.

**Also good (frames the problem):**

> Arrow routing sounds simple until you try it. Given two shapes, draw a line between them that doesn't pass through anything else. We spent a while getting this right.

## Structure

Technical blog posts typically follow this arc:

1. **Frame the problem** — What's this about? What problem did we encounter and solve? Why was it hard, unintuitive, or interesting?
2. **Show the insight** — What's the key idea that makes the solution work?
3. **Walk through the implementation** — Code and explanation, building up complexity
4. **Wrap up** — Where this lives in the codebase, tradeoffs, links to files. Also unexplored areas, more we could do, or related problems.

Wrap-ups can end with an opinion ("that's worth the complexity") but avoid promotional language. Don't summarize with adjective lists like "fast, flexible, and powerful" or "performant but smooth"—these read like marketing copy.

## Tone

Technical blog posts have warmth and personality. They:

- Use phrases like "the trick is..." or "the insight is..." to signal key ideas
- Include brief asides about why something is hard or interesting
- Show the journey, not just the destination ("we tried X, but Y worked better")
- End with opinions ("that's worth the tradeoff")
- Use "we" narratively throughout

They still shouldn't:

- Ramble or over-explain
- Use hollow importance claims ("this is crucial for...")
- Get too casual or jokey
- Overdo the storytelling at the expense of the technical content

## Describe what we did, not what to do

Technical blog posts explain how tldraw solved a problem. Frame solutions as "here's what we do" rather than prescriptive instructions.

**Don't:**

> The solution: don't decide immediately. Watch what the fingers do, then commit once the pattern is clear.

> Instead of guessing, implement a state machine that starts undecided.

**Do:**

> Since we don't have enough information to know either way, we defer the decision. The gesture handler watches what the pointers do, then commits once we know enough to recognize the interaction pattern.

> Instead of guessing, we use a state machine that starts undecided and resolves as more information comes in.

The reader learns from seeing our approach, not from being told what to do.

## Code in technical blog posts

Code examples illustrate our solution and build understanding. They show how we approached the problem, not just the final answer.

### Show progression

Build up complexity to reveal the insight:

```ts
// First attempt: simple but wrong
function getDashOffset(length: number, dashSize: number) {
	return length % dashSize
}
```

Then explain why that doesn't work, and show what we actually do:

```ts
// What we actually do: account for both ends
function getDashOffset(length: number, dashSize: number, gapSize: number) {
	const dashCount = Math.ceil(length / (dashSize + gapSize))
	const totalDashLength = dashCount * dashSize
	const totalGapLength = (dashCount - 1) * gapSize
	return (length - totalDashLength - totalGapLength) / 2
}
```

### Link to the actual code

End with links to where this lives in the codebase:

> You can find this implementation in [`packages/editor/src/lib/utils/dashes.ts`](https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/utils/dashes.ts).

## Length and depth

Technical blog posts should be:

- **Long enough** to fully explain the problem and solution
- **Short enough** to read in one sitting (5-10 minutes)
- **Deep enough** to be interesting to developers who've faced similar problems
- **Accessible enough** that someone unfamiliar with tldraw can follow along

A typical technical blog post is 800-1500 words, but length should follow from the complexity of the topic.

## Topics that make good technical blog posts

Good technical blog post topics share these traits:

- **Unintuitive solutions** — The obvious approach didn't work, so we had to think differently
- **Hidden complexity** — Something that looks simple has interesting depth
- **Canvas-specific problems** — Challenges unique to building visual, interactive software
- **Platform/browser quirks** — Working around limitations in SVG, Canvas, browsers
- **Performance insights** — How we made something fast (with measurements)

### Examples of good topics

- How we calculate perfect dash patterns for arbitrary paths
- Why arrow routing is harder than it looks
- How we detect whether a pinch gesture is zoom or rotate
- Making text editing feel right on an infinite canvas
- How we handle undo/redo across multiplayer sessions

### Topics that aren't technical blog posts

- Feature announcements (better as release notes or marketing content)
- Tutorials teaching how to use the SDK (better as docs)
- General programming wisdom unconnected to tldraw
- Internal refactoring without user-facing interest

## Evaluation checklist

When reviewing a technical blog post, check:

- [ ] **Opening** — Does it frame a problem before diving into solution?
- [ ] **Insight** — Is there a clear "aha" moment or key idea?
- [ ] **Specificity** — Is this grounded in tldraw's actual implementation?
- [ ] **Code** — Do examples build understanding, not just show syntax?
- [ ] **Tone** — Warm and personal, but not rambling?
- [ ] **Links** — Points to actual code in the repo?
- [ ] **Length** — Appropriate depth for the topic?

For voice and style, refer to the [writing guide](./writing-guide.md) checklist.
