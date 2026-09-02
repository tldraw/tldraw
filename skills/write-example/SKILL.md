---
name: write-example
description: Writing examples for the tldraw SDK examples app. Use when creating new examples, adding SDK demonstrations, or writing example code in apps/examples.
---

# Writing tldraw examples

The examples project (`apps/examples`) contains minimal demonstrations of how to use the tldraw SDK. Examples are embedded on the [docs site](https://tldraw.dev/examples) and deployed to [examples.tldraw.com](https://examples.tldraw.com).

Standards for examples in `apps/examples/src/examples`.

## Example structure

Each example lives in its own folder:

```
apps/examples/src/examples/
└── my-example/
    ├── README.md          # Required metadata
    ├── MyExampleExample.tsx  # Main example file
    └── my-example.css     # Optional styles
```

## Folder name

- Lowercase kebab-case: `custom-canvas`, `button-demo`, `magical-wand`
- Used as the URL path for the example

## README.md

Required frontmatter format:

```md
---
title: Example title
component: ./ExampleFile.tsx
category: category-id
priority: 1
keywords: [keyword1, keyword2]
---

One-line summary of what this example demonstrates.

---

Detailed explanation of the example. Include code snippets here if they help explain concepts not obvious from the example code itself.
```

### Frontmatter fields

| Field     | Description                                      |
| --------- | ------------------------------------------------ |
| title     | Sentence case, corresponds to folder name        |
| component | Relative path to example file                    |
| category  | One of the valid category IDs (see below)        |
| priority  | Display order within category (lower = higher)   |
| keywords  | Search terms (avoid obvious terms like "tldraw") |

### Valid categories

`getting-started`, `configuration`, `editor-api`, `ui`, `layout`, `events`, `shapes/tools`, `collaboration`, `data/assets`, `use-cases`

## Example file

### Naming

- PascalCase ending with "Example": `CustomCanvasExample.tsx`, `ButtonExample.tsx`
- Name should correspond to the folder name and title

### Structure

```tsx
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function MyExampleExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw />
		</div>
	)
}
```

**Requirements:**

- Must have a default export React component
- Use `tldraw__editor` class for full-page examples
- Import `tldraw/tldraw.css` for styles

### Layout

- Full page: wrap in `<div className="tldraw__editor">`
- Inset: see existing examples for page layout patterns

## Styles

- Put CSS in a separate file named after the example: `my-example.css`
- Import alongside tldraw CSS: `import './my-example.css'`
- Avoid extensive inline styles via the `style` prop

## Control panels

For examples that need buttons or controls, use the `TopPanel` component slot with `TldrawUiButton`:

```tsx
import { Tldraw, TldrawUiButton, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './my-example.css'

function MyControls() {
	const editor = useEditor()
	return (
		<div className="tlui-menu my-controls">
			<TldrawUiButton type="normal" onClick={() => editor.zoomIn()}>
				Zoom in
			</TldrawUiButton>
			<TldrawUiButton type="normal" onClick={() => editor.zoomOut()}>
				Zoom out
			</TldrawUiButton>
		</div>
	)
}

export default function MyExampleExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={{ TopPanel: MyControls }} />
		</div>
	)
}
```

CSS for control panels:

```css
.my-controls {
	display: flex;
	flex-wrap: wrap;
	margin: 8px;
}
```

## Comments

Use footnote format with numbered references:

```tsx
import { Tldraw, type TLComponents } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const components: TLComponents = {
	PageMenu: null,
}

export default function CustomComponentsExample() {
	return (
		<div className="tldraw__editor">
			{/* [2] */}
			<Tldraw components={components} />
		</div>
	)
}

/*
[1]
Define component overrides outside the React component so they're static.
If defined inside, use useMemo to prevent recreation on every render.

[2]
Pass component overrides via the components prop.
*/
```

## Example types

### Tight examples

- Narrow focus on a specific SDK feature
- Minimal styling
- Meant to be read, not used
- Remove any extraneous code

### Use-case examples

- Show a recognizable user experience
- Prioritize clarity and completeness
- Category: `use-cases`

## Additional files

- Split complex code into separate files if it distracts from the example's purpose
- Example: complex input component in `Input.tsx`
- Keep the main example file focused on demonstrating the concept

## Important

- Follow React and TypeScript best practices
- Never use title case for titles - use sentence case
- Keep examples minimal and focused
