# Documentation style guide

This document defines the rules and conventions for tldraw SDK documentation in `apps/docs/content/`.

**Prerequisite**: Read the [writing guide](./writing-guide.md) first. This document builds on those foundations with docs-specific patterns.

## Document structure

### Opening pattern

Start with a clear, direct definition:

> The Editor class is the main way of controlling tldraw's editor.

> In tldraw, a shape is something that can exist on the page, like an arrow, an image, or some text.

> In tldraw, persistence means storing information about the editor's state to a database and then restoring it later.

**One concept per sentence.** If your opening packs definition, use cases, and API references together, split it:

**Don't:**

> The scribble system draws temporary freehand paths for pointer-based interactions, used for visual feedback during erasing, laser drawing, or scribble-brush selection, accessed through Editor#scribbles.

**Do:**

> The scribble system draws temporary freehand paths for pointer-based interactions. Use scribbles to show visual feedback during tool operations like erasing, laser pointer drawing, or scribble-brush selection.

The API reference can come after the opening paragraph or inline where first relevant.

### Concept, explanation, code

Every concept should be followed by a working example:

> You can access the editor in two ways:
>
> 1. From the Tldraw component's `onMount` callback:
>
> ```tsx
> function App() {
> 	return (
> 		<Tldraw
> 			onMount={(editor) => {
> 				// your editor code here
> 			}}
> 		/>
> 	)
> }
> ```

### Progressive disclosure

Move from simple to complex:

1. Start with the most common use case
2. Add complexity incrementally
3. Leave edge cases and advanced patterns for later sections

**Example from persistence docs:**

1. First: `persistenceKey` prop (simplest)
2. Then: State snapshots (more control)
3. Then: The `store` prop (full control)
4. Finally: Migrations (advanced)

### Short paragraphs

Keep paragraphs to 1-3 sentences. Dense blocks of text are hard to scan:

**Do:**

> Meta information is information that is not used by tldraw but is instead used by your application. For example, you might want to store the name of the user who created a shape, or the date that the shape was created.

**Don't:**

> Meta information is additional data that can be attached to shapes and is not used internally by tldraw but can be leveraged by your application for custom functionality. This could include things like the user who created the shape, timestamps, custom identifiers, or any other application-specific data that you want to associate with shapes but don't want to store in the props object.

### Tables for related information

Use tables to organize related methods, options, or concepts:

| Method             | Description                                    |
| ------------------ | ---------------------------------------------- |
| `Editor#setCamera` | Moves the camera to the provided coordinates.  |
| `Editor#zoomIn`    | Zooms the camera in to the nearest zoom step.  |
| `Editor#zoomOut`   | Zooms the camera out to the nearest zoom step. |

### Notes and callouts

Use blockquotes for important asides:

> If all you're interested in is the state below `root`, there is a convenience method, `Editor#getCurrentToolId`, that can help.

Use stronger callout syntax for warnings:

```
<Callout type="warning">
  You must make sure that the tldraw version in your client matches the version on the server.
</Callout>
```

## Cross-referencing

### Link liberally

Reference related concepts inline rather than explaining everything:

> For more information about how to synchronize the store with other processes, see the [Persistence](/docs/persistence) page.

### API references use consistent format

Link to API docs using the `[MethodName](?)` pattern:

> Use the [Editor#createShapes](?) method.

> See [TLInstancePresence](?) for the full record type.

### Point to working examples

Always link to runnable examples when available:

> For an example of how to create custom shapes, see our [custom shapes example](/examples/shapes/tools/custom-shape).

## Nuggets (tech blog posts)

Nuggets are short technical articles about how we solved interesting problems. They're different from reference documentation—more like posts you'd find on a company engineering blog.

### Different opening pattern

Reference docs start with definitions. Nuggets start by **framing the problem**—a sentence or two that tells the reader what this is about and why it's interesting before diving in.

**Reference doc opening:**

> The Editor class is the main way of controlling tldraw's editor.

**Nugget opening:**

> The tldraw SDK is all about making the little details work. If you've ever used dashed lines in tldraw, you might have noticed that the dashes always line up with the corners of your shape, the handles of a spline, or the start and end of an arrow. While this might seem like the obvious way that dashes _should_ work, you might be surprised to learn that SVG offers no such feature. We implement these perfect dashes entirely ourselves.
>
> Here's how it works.

The nugget opening establishes context (what we're talking about), tension (there's a problem or unmet expectation), and stakes (why you should care) before getting into the solution.

The goal is to root the technical article in some anecdotal context. These problems don't just emerge from nowhere, but rather they come from details, behaviors, conventions, or general "what feels right" expectations within the canvas domain. The real problem is how to write the code and convince the computer to do the thing that makes the experience feel right. Often times, that work is unintuitive and interesting in that it reveals something about the interaction or about the technologies involved.

### Structure

Nuggets typically follow this arc:

1. **Frame the problem** — What's this about? What problem did we encounter and solve? Why was it hard, unintuitive, or interesting?
2. **Show the insight** — What's the key idea that makes the solution work?
3. **Walk through the implementation** — Code and explanation, building up complexity
4. **Wrap up** — Where this lives in the codebase, tradeoffs, links to files. Also unexplored areas, more we could do, or related problems.

### Tone differences

Nuggets are warmer than reference docs. They can:

- Use "the trick is..." or "the insight is..." to signal key ideas
- Include brief asides about why something is hard or interesting
- Show the journey, not just the destination ("we tried X, but Y worked better")
- End with opinions ("that's worth the tradeoff")

They still shouldn't:

- Ramble or over-explain
- Use hollow importance claims ("this is crucial for...")
- Get too casual or jokey

### Describe what we did, not what to do

Nuggets explain how tldraw solved a problem—they're not tutorials. Frame solutions as "here's what we do" rather than prescriptive instructions.

**Don't:**

> The solution: don't decide immediately. Watch what the fingers do, then commit once the pattern is clear.

> Instead of guessing, implement a state machine that starts undecided.

**Do:**

> Since we don't have enough information to know either way, we defer the decision. The gesture handler watches what the pointers do, then commits once we know enough to recognize the interaction pattern.

> Instead of guessing, we use a state machine that starts undecided and resolves as more information comes in.

The reader learns from seeing our approach, not from being told what to do.

### Example openings

**Too abrupt (reads like docs):**

> Tldraw calculates dash patterns that fit paths exactly. Complete dashes at both ends, even spacing throughout.

**Better (starts with our experience):**

> When we added dashed lines to tldraw, we wanted them to look right—complete dashes at both ends, even spacing, corners that line up on rectangles. SVG's `stroke-dasharray` doesn't do this.

**Also good (frames the problem we faced):**

> Arrow routing sounds simple until you try it. Given two shapes, draw a line between them that doesn't pass through anything else. We spent a while getting this right.

## Priorities

1. **Accuracy** — Code must work. API refs must be correct.
2. **Clarity** — Understand on first read.
3. **Brevity** — Say it once, move on. Cut sections that repeat what's already shown elsewhere.
4. **Scannability** — Short paragraphs, clear headers, lots of code.

### Avoid redundant sections

If detailed examples already demonstrate a pattern, don't repeat the same information in a "Common use cases" section with shorter snippets. Either:

- Keep only the detailed examples (preferred)
- Keep only the quick-reference snippets
- Ensure each section adds genuinely new information

**Don't:** Show a complete eraser implementation, then have a "Common use cases > Eraser" section with the same code trimmed down.

**Do:** Show complete implementations once. If you need a quick-reference section, make it a table pointing to the detailed examples.

## Evaluation checklist

When reviewing documentation, check:

- [ ] **Opening sentence** — Does it immediately define what this thing is?
- [ ] **Code examples** — Is every concept followed by working code?
- [ ] **Progressive disclosure** — Does complexity build gradually?
- [ ] **Links** — Are related concepts cross-referenced?
- [ ] **Scannability** — Short paragraphs, clear headers?

For voice and style, refer to the [writing guide](./writing-guide.md) checklist.
