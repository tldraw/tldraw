---
name: write-docs
description: Writing SDK documentation for tldraw. Use when creating new documentation articles, updating existing docs, or when documentation writing guidance is needed. Applies to docs in apps/docs/content/.
---

# Writing tldraw SDK documentation

## The tldraw voice

Write like a colleague walking someone through code they know well. Confident, casual, code-first.

**Characteristic patterns:**

> Have five minutes? Run this command...

> That's pretty much it!

> Let's add local persistence by passing a `persistenceKey` prop...

> Need to create some shapes? Use [Editor#createShapes](?). Need to delete them? Use [Editor#deleteShapes](?).

**What makes it work:**

- Direct address with "you" and "let's"
- Questions as transitions ("Need to create some shapes?")
- Exclamations that feel natural, not forced ("That's pretty much it!")
- Jump straight to code, explain around it
- Short sentences between code blocks

### Confidence without hedging

State facts. Don't soften them.

```
// Good
The Editor class is the main way of controlling tldraw's editor.

// Bad
The Editor class can be used to control tldraw's editor.
```

### Density over exposition

Real tldraw docs are code-heavy. A section might be 20 lines of code with 2 sentences of explanation. Don't pad with prose.

## Avoid AI tells

These break trust instantly:

- **Hollow claims**: "plays a crucial role", "serves as a testament to"
- **Trailing gerunds**: "...ensuring optimal performance"
- **Formulaic transitions**: "Moreover,", "Furthermore,", "It's important to note"
- **Promotional language**: "robust", "seamless", "empowers developers"
- **Three-item lists**: Real writing has 2, 4, 7 items
- **Passive voice**: "can be achieved by" — just show how
- **Conversational asides**: "(or whatever)", "(if you want)", "(just saying)"

## Mechanics

- **Sentence case headings**: "Custom shapes" not "Custom Shapes"
- **Active voice**: "The store validates records"
- **Present tense**: "The migration system transforms"
- **Contractions**: it's, we've, you'll, don't

## Frontmatter

```yaml
---
title: Feature name
status: published
author: steveruizok
date: 3/22/2023
order: 1
keywords:
  - keyword1
  - keyword2
---
```

## MDX components

### API links

Use `[ClassName](?)` or `[ClassName#methodName](?)` for API references:

```markdown
The [Editor](?) class has many methods. Use [Editor#createShapes](?) to create shapes.
```

### Code highlighting

Use `<FocusLines>` to highlight specific lines:

```markdown
<FocusLines lines={[2,6,10]}>

\`\`\`tsx
import { Tldraw } from 'tldraw'
import { useSyncDemo } from '@tldraw/sync'
\`\`\`

</FocusLines>
```

### Images

```markdown
<Image
	src="/images/api/events.png"
	alt="A diagram showing an event being sent to the editor."
	title="Caption text here."
/>
```

### Tables for API documentation

Use tables for listing methods, options, or properties:

```markdown
| Method                   | Description                                    |
| ------------------------ | ---------------------------------------------- |
| [Editor#screenToPage](?) | Convert a point in screen space to page space. |
| [Editor#pageToScreen](?) | Convert a point in page space to screen space. |
```

```markdown
| Value     | Description                                          |
| --------- | ---------------------------------------------------- |
| `default` | Sets the initial zoom to 100%.                       |
| `fit-x`   | The x axis will completely fill the viewport bounds. |
```

## Code examples

Show code early, explain around it. Don't build up to code with paragraphs of context.

### Realistic, minimal

```tsx
// Good: Real shape, real values
editor.createShapes([
	{
		type: 'geo',
		x: 0,
		y: 0,
		props: { geo: 'rectangle', w: 100, h: 100 },
	},
])

// Bad: Placeholder nonsense
editor.createShape({ type: 'example-type', props: { prop1: 'value1' } })
```

### Context when needed

Full components are fine when showing integration patterns:

```tsx
export default function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw persistenceKey="example" />
		</div>
	)
}
```

Minimal snippets when showing a single API:

```tsx
editor.setFocusedGroup(groupId)
```

## Structure

### Overview first

1-2 paragraphs establishing what and why before diving into how.

### Progressive complexity

Start with the common case. Add complexity incrementally. Put edge cases later.

### Link to examples

End sections with links to relevant examples:

```markdown
> For an example of how to create custom shapes, see our [custom shapes example](/examples/shapes/tools/custom-shape).
```

Or in a section:

```markdown
---

See the [tldraw repository](https://github.com/tldraw/tldraw/tree/main/apps/examples) for examples of how to use tldraw's Editor API.
```

## Priorities

1. **Accuracy** — Code must work. API refs must be correct.
2. **Clarity** — Understand on first read.
3. **Brevity** — Say it once, move on.
4. **Scannability** — Short paragraphs, clear headers, lots of code.
