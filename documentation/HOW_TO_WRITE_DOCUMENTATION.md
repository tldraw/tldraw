---
title: How to write documentation
---

This guide helps authors write consistent, high-quality documentation for the tldraw monorepo. Following these guidelines reduces editing time and creates a better experience for readers.

## Audience

Our documentation serves multiple audiences:

- **Team members** working in the codebase daily
- **External developers** integrating tldraw into their applications
- **AI agents** exploring the codebase programmatically
- **Contributors** looking to understand how things work before making changes

Write for developers who are technically proficient but unfamiliar with tldraw's internals. Assume they know TypeScript and React, but don't assume they know our architecture or conventions.

## Document structure

### Frontmatter

Every document starts with YAML frontmatter:

```yaml
---
title: Document title in sentence case
created_at: MM/DD/YYYY
updated_at: MM/DD/YYYY
keywords:
  - keyword
  - keyword
  - keyword
---
```

### Standard sections

Most documents should follow this structure:

```markdown
## Overview

[1-2 paragraphs: What problem does this solve? What does it enable?
Don't explain how it works yet—just establish why it exists.]

## [Main content sections]

[Organized logically for the topic]

## Key files

[List of important file paths for readers who want to explore further]

## Related

[Links to related documentation]
```

Adjust sections based on document type:

| Document type     | Typical sections                                                             |
| ----------------- | ---------------------------------------------------------------------------- |
| Package docs      | Overview, Architecture, Key concepts, API patterns, Key files, Related       |
| Architecture docs | Overview, How it works, Key components, Data flow, Extension points, Related |
| Guides            | Overview, Prerequisites, Steps, Examples, Troubleshooting, Related           |
| Reference docs    | Overview, organized reference content, Related                               |

Additional expectations for architecture docs:

- Start with `## Overview` (never begin with a `###` heading)
- Define tldraw-specific terms on first use or link to the canonical doc
- Include a small number of high-signal snippets (aim for 1–2 per major section)
- Avoid example overload (rarely more than 2 snippets per section)

### Section depth

- Use `##` for main sections
- Use `###` for subsections
- Rarely go deeper than `####`
- If you need more depth, consider splitting into multiple documents

## Writing style

An ideal article feels like a concise internal engineering note: it orients the reader quickly, stays concrete, uses small code snippets to ground key ideas, and avoids fluff. The reader should finish with a clear mental model and know where to look next.

### Tone

Write in a **direct, technical tone**. Be helpful without being chatty.

**Good:**

```markdown
The `Editor` class manages all editor state and provides methods for
manipulating shapes, handling input, and coordinating rendering.
```

**Avoid:**

```markdown
So, the Editor class is basically the main thing that handles everything!
It's really powerful and does a lot of cool stuff.
```

### Sentence case for headings

Always use sentence case for headings, not Title Case.

**Good:**

```markdown
## Creating custom shapes

### Shape geometry and bounds
```

**Bad:**

```markdown
## Creating Custom Shapes

### Shape Geometry and Bounds
```

Exceptions: Proper nouns, acronyms, and class/component names remain capitalized:

- "PostgreSQL configuration"
- "WebSocket connections"
- "The ShapeUtil class"

### Active voice

Prefer active voice over passive voice.

**Good:**

```markdown
The store validates records before saving them.
```

**Avoid:**

```markdown
Records are validated by the store before being saved.
```

### Present tense

Write in present tense unless describing historical changes.

**Good:**

```markdown
The migration system transforms old data formats to new ones.
```

**Avoid:**

```markdown
The migration system will transform old data formats to new ones.
```

### Second person for guides

In guides and how-to documents, address the reader directly:

**Good:**

```markdown
First, create a new file for your shape utility. You'll extend the
base `ShapeUtil` class and implement the required methods.
```

### Conciseness

Get to the point. Remove filler words and redundant phrases.

**Good:**

```markdown
Atoms store mutable state. When an atom's value changes, all
dependent computed values automatically update.
```

**Avoid:**

```markdown
Basically, atoms are used for the purpose of storing state that
can be mutated. It's important to note that when you change the
value of an atom, any computed values that depend on it will
automatically be updated as a result.
```

## Code examples

### When to include code

Include code when:

- Showing how to use an API
- Demonstrating a pattern that's hard to describe in prose
- The exact syntax matters and could be gotten wrong

Skip code when:

- The prose already makes it clear
- You're just showing "what it looks like" without teaching anything
- The pattern was already shown earlier in the document
- Type signatures or API docs already cover it

### Code block format

Always specify the language for syntax highlighting:

````markdown
```typescript
const shape = editor.getShape(shapeId)
```
````

Use `typescript` for most tldraw code, `tsx` when showing React components, `bash` for terminal commands.

### Balancing prose and code

Prose explains _why_ and _when_. Code shows _how_. Don't duplicate information across both.

- If the code is self-explanatory, keep surrounding prose minimal
- If prose fully explains something, you may not need code at all
- One good example beats three similar ones
- Include at least one snippet when introducing a new core API or data structure

**Good:** A sentence explaining the concept, then code showing it once.

**Avoid:** Explaining in prose, showing code, then re-explaining what the code did.

### Example size

Show only what's necessary. Trim aggressively.

- Omit imports unless they're the point
- Use `// ...` to skip irrelevant sections
- Remove boilerplate that distracts from the concept

**Good:**

```typescript
editor.createShape({
	type: 'geo',
	x: 100,
	y: 100,
	props: { w: 200, h: 100, geo: 'rectangle' },
})
```

**Avoid:** 50 lines of setup for a 5-line concept.

### Annotating examples

For longer examples, use numbered comments to explain key parts:

```typescript
class MyShapeUtil extends ShapeUtil<MyShape> {
  static override type = 'my-shape' as const // [1]

  getGeometry(shape: MyShape) {
    return new Rectangle2d({ // [2]
      width: shape.props.w,
      height: shape.props.h,
    })
  }

  component(shape: MyShape) { // [3]
    return <div>My Shape</div>
  }

  indicator(shape: MyShape) { // [4]
    return <rect width={shape.props.w} height={shape.props.h} />
  }
}
```

1. The `type` must match the shape's type name in the schema
2. `getGeometry` returns the shape's geometric representation for hit testing
3. `component` renders the shape's visual appearance
4. `indicator` renders the selection outline

### Real vs. simplified examples

Use real code patterns from the codebase when possible. If you simplify, note that you've done so and point to the real file:

```typescript
// Simplified for clarity - see ArrowShapeUtil.tsx for full implementation
```

## Links and references

### Internal links

Link to other documentation using relative paths:

```markdown
See [Creating custom shapes](../guides/custom-shapes.md) for a complete walkthrough.
```

### File path references

When referencing source files, use the path from the repository root:

```markdown
The main editor implementation is in `packages/editor/src/lib/editor/Editor.ts`.
```

For key files sections, use a bullet list and list paths without backticks:

```markdown
## Key files

- packages/editor/src/lib/editor/Editor.ts - Main editor class
- packages/editor/src/lib/editor/shapes/ShapeUtil.ts - Base shape utility
```

### External links

For external resources, use descriptive link text:

**Good:**

```markdown
See the [React documentation on hooks](https://react.dev/reference/react)
for more on this pattern.
```

**Avoid:**

```markdown
Click [here](https://react.dev/reference/react) for more info.
```

### Linking to source

When referencing specific code, include file path and line number when stable:

```markdown
The shape validation happens in `packages/tlschema/src/shapes/TLBaseShape.ts:42`.
```

For code that might move, link to the file without line numbers.

## Tables

Use tables for structured comparisons or reference information:

```markdown
| Record scope | Synced | Persisted | Example             |
| ------------ | ------ | --------- | ------------------- |
| `document`   | Yes    | Yes       | Shapes, pages       |
| `session`    | No     | Maybe     | User preferences    |
| `presence`   | Yes    | No        | Cursors, selections |
```

Keep tables simple. If you need complex formatting, consider using a list or multiple sections instead.

## Lists

### When to use lists

Use bullet lists for:

- Items without inherent order
- Feature lists
- Key points

Use numbered lists for:

- Sequential steps
- Ordered processes
- Ranked items

### List formatting

Start each item with a capital letter. Use periods only if items are complete sentences.

**Items as fragments:**

```markdown
The editor provides:

- Shape creation and manipulation
- Undo/redo history
- Viewport and camera control
```

**Items as sentences:**

```markdown
Key considerations:

- The store validates all records before saving them.
- Computed values update automatically when dependencies change.
- Side effects run after the main transaction completes.
```

## Terminology

### Consistent naming

Use consistent terms throughout:

| Use     | Don't use                      |
| ------- | ------------------------------ |
| shape   | object, element, item          |
| tool    | mode, state                    |
| store   | database, storage              |
| record  | entry, row, document           |
| binding | connection, link, relationship |

### Technical terms

Define technical terms on first use if they're specific to tldraw:

```markdown
The **store** is tldraw's reactive database that holds all document records
including shapes, pages, and assets.
```

### Package names

Write package names with the `@tldraw/` prefix and in backticks:

```markdown
The `@tldraw/editor` package provides the core canvas functionality.
```

## Content guidelines

### What to include

- **Concepts**: Explain what something is and why it exists
- **Architecture**: How components relate and data flows
- **Patterns**: Common ways to use or extend the system
- **Examples**: Working code that demonstrates usage
- **Gotchas**: Common mistakes and how to avoid them

### What to avoid

- **Obvious statements**: Don't document what's clear from the code
- **Implementation details**: Focus on what users need, not internal minutiae
- **Speculation**: Don't guess about future changes or uncertain behavior
- **Marketing language**: This is technical documentation, not a sales pitch

### Keeping content current

- Reference CONTEXT.md files as primary sources (they're kept up to date)
- Avoid hardcoding version numbers unless necessary
- Don't include dates except in frontmatter
- When describing behavior, check the current implementation

## Working with AI

These documents may be read by AI agents exploring the codebase. To help them:

- Be explicit about file locations
- Use consistent terminology (AI can't infer synonyms as well as humans)
- Include the "Key files" section so AI knows where to look next
- Structure information hierarchically (AI parses structure well)

## Checklist before submitting

Before considering a document complete:

- [ ] Frontmatter includes title in sentence case
- [ ] Frontmatter includes created_at date for new articles
- [ ] Frontmatter includes updated_at date for new or updated articles
- [ ] Overview section states the problem before explaining mechanism
- [ ] All headings use sentence case
- [ ] Code examples are minimal and don't duplicate prose
- [ ] Internal links use relative paths
- [ ] File references use repository-root paths
- [ ] Technical terms are defined on first use
- [ ] Key files section lists important paths
- [ ] Related section links to relevant documents
- [ ] Content is reviewed for accuracy against source code

## Examples of good documentation

For reference, these CONTEXT.md files demonstrate good technical writing:

- `packages/editor/CONTEXT.md` - Comprehensive package documentation
- `packages/store/CONTEXT.md` - Clear explanation of complex systems
- `apps/examples/CONTEXT.md` - Good balance of overview and detail
- `apps/dotcom/sync-worker/CONTEXT.md` - Thorough infrastructure documentation

Study these before writing to internalize the style and depth expected.
