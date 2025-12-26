Write or update SDK documentation based on: $ARGUMENTS

## Overview

This command creates new documentation or updates existing docs. Determine intent from the prompt:

- **New doc**: Create in `apps/docs/content/sdk-features/` (e.g., "focused parent in groups" → new article or section)
- **Update existing**: Find and modify the relevant file(s) (e.g., "add focused parent to groups docs" → update `groups.mdx`)

## Process

### 1. Research the topic

Before writing, understand what you're documenting:

- Search the codebase for relevant code (`packages/editor/`, `packages/tldraw/`)
- Read CONTEXT.md files in relevant packages
- Find examples in `apps/examples/src/examples/`
- Check existing docs in `apps/docs/content/` for related content

### 2. Decide: new file or update?

**Create a new file when:**

- The topic is substantial enough to warrant its own article
- It doesn't fit naturally into an existing article
- The prompt explicitly asks for a new doc

**Update an existing file when:**

- The topic is a subsection of an existing feature
- The prompt references an existing doc
- Adding to an existing doc improves coherence

### 3. Write or update

Follow the voice and structure guidelines below.

## Voice and style

Read `VOICE.md` at the repo root for comprehensive guidance. Key points:

### Tone

Write as a knowledgeable colleague explaining a system they helped build. Be confident, practical, and focused on getting developers to working code.

**Do:**

> The Editor class is the main way of controlling tldraw's editor.

> Need to create some shapes? Use `Editor#createShapes`. Need to delete them? Use `Editor#deleteShapes`.

**Don't:**

> The Editor class can be used to control tldraw's editor.

> The following section describes the various methods available for creating and deleting shapes.

### Avoid AI writing tells

- No hollow importance claims ("plays a crucial role", "serves as a testament to")
- No trailing gerunds ("...ensuring optimal performance", "...highlighting the importance of")
- No formulaic transitions ("Moreover,", "Furthermore,", "It's important to note that")
- No promotional language ("robust", "seamless", "empowers developers")
- Avoid exactly three-item lists (real writing has 2, 4, or 7 items)

### Mechanics

- **Sentence case** for all headings ("Custom shapes" not "Custom Shapes")
- **Active voice**: "The store validates records" not "Records are validated by the store"
- **Present tense**: "The migration system transforms" not "will transform"
- **Use contractions** naturally: it's, we've, you'll, don't

## Document structure

### Frontmatter

```yaml
---
title: Feature name
created_at: MM/DD/YYYY
updated_at: MM/DD/YYYY
keywords:
  - keyword1
  - keyword2
  - keyword3
status: published
date: MM/DD/YYYY
order: [number]
---
```

### Article structure

```markdown
[1-2 paragraphs: Overview. What is this? What does it enable?
Don't explain how it works yet—establish why it exists.]

## Main concept sections

[Organized logically. Start with common use cases, add complexity incrementally.]

## Related examples

- **[Example name](link)** - Brief description of what it demonstrates.
```

### Section guidelines

- Start with `##` for main sections (never `###` as first heading)
- Rarely go deeper than `####`
- One working code example per major concept
- Keep paragraphs to 1-3 sentences

## Code examples

### Show complete code first

Your first snippet should be runnable:

```tsx
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function () {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw />
		</div>
	)
}
```

Subsequent examples can be fragments.

### Keep examples minimal

- Omit imports unless they're the point
- Use `// ...` to skip irrelevant sections
- Show only what's necessary to demonstrate the concept

### Use realistic data

```typescript
// Good
editor.createShape({
	type: 'geo',
	x: 100,
	y: 100,
	props: { w: 200, h: 100, geo: 'rectangle' },
})

// Avoid
editor.createShape({
	type: 'example-type',
	props: { prop1: 'value1' },
})
```

## Linking

### Internal links

```markdown
See [Persistence](/docs/persistence) for more on saving state.
```

### API references

```markdown
Use the [Editor#createShapes](?) method.
```

### Example links

```markdown
- **[Custom shape](https://github.com/tldraw/tldraw/tree/main/apps/examples/src/examples/custom-shape)** - Creating a custom shape with a ShapeUtil.
```

## Checklist

Before finishing:

- [ ] Researched the topic in the codebase
- [ ] Overview establishes purpose before mechanism
- [ ] All headings use sentence case
- [ ] Code examples are minimal and runnable
- [ ] No AI writing tells (check against VOICE.md)
- [ ] Related examples linked (if applicable)
