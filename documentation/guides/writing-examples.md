---
title: Writing examples
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - examples
  - documentation
  - guide
---

This guide explains how to write examples for tldraw's examples application.

## Overview

The examples project (`apps/examples`) serves two purposes:

1. Development environment for tldraw features
2. Minimal demonstrations of SDK usage

Examples are deployed to [examples.tldraw.com](https://examples.tldraw.com) and embedded on [tldraw.dev](https://tldraw.dev).

## Example structure

Each example lives in its own folder in `apps/examples/src/examples/`:

```
examples/
├── my-example/
│   ├── README.md           # Required metadata
│   ├── MyExampleExample.tsx  # React component
│   └── my-example.css      # Optional styles
```

### Folder naming

Use lowercase kebab-case for folder names. This becomes the URL path.

### README.md format

```md
---
title: My example
component: ./MyExampleExample.tsx
category: editor-api
priority: 5
keywords: [editor, api, example]
---

One line summary of what this example demonstrates.

---

Detailed explanation of the example, including any important concepts
or code snippets that help users understand the implementation.
```

### Metadata fields

| Field       | Description                                      |
| ----------- | ------------------------------------------------ |
| `title`     | Example title in sentence case                   |
| `component` | Path to the example component                    |
| `category`  | Category ID for grouping                         |
| `priority`  | Display order within category                    |
| `keywords`  | Search terms (avoid obvious words like "tldraw") |

### Categories

Valid category IDs:

- `getting-started`
- `configuration`
- `editor-api`
- `ui`
- `layout`
- `events`
- `shapes/tools`
- `collaboration`
- `data/assets`
- `use-cases`

## Example component

### Basic structure

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

### Naming conventions

- Component name should be descriptive and end with `Example`
- Examples: `CustomCanvasExample`, `DarkModeExample`, `ButtonExample`

### Layout

For full-page examples, use the `tldraw__editor` class:

```tsx
<div className="tldraw__editor">
	<Tldraw />
</div>
```

For inset examples with other UI:

```tsx
<div className="example-wrapper">
	<Tldraw />
	<div className="controls">{/* Additional UI */}</div>
</div>
```

## Code comments

Use numbered footnote-style comments:

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
If you must define them inside, use useMemo to prevent recreation on updates.

[2]
Pass your component overrides to the components prop.
*/
```

## Example types

### Tight examples

Focused demonstrations of specific features:

- Narrow scope
- Minimal styling
- Code meant to be read, not used directly
- Remove any extraneous code

```tsx
// Good tight example - shows one thing
export default function ToggleDarkModeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw user={{ isDarkMode: true }} />
		</div>
	)
}
```

### Use-case examples

Show complete user experiences:

- More realistic implementations
- Include necessary styling
- Complete and functional
- Clear which parts are important

```tsx
// Good use-case example - complete feature
export default function PDFEditorExample() {
	const [pdf, setPdf] = useState<File | null>(null)

	return (
		<div className="pdf-editor">
			<FileUploader onUpload={setPdf} />
			{pdf && <PDFCanvas file={pdf} />}
		</div>
	)
}
```

## Additional files

### Styles

Use a separate CSS file if needed:

```tsx
import 'tldraw/tldraw.css'
import './my-example.css'
```

Name CSS files to match the example folder.

### Helper files

Split complex code into separate files if it's distracting:

```tsx
import { Tldraw } from 'tldraw'
import { ComplexInput } from './Input'
```

Only split if the code isn't the focus of the example.

## Best practices

1. **Keep it minimal** - Show only what's necessary
2. **Use TypeScript** - Proper typing helps users understand the API
3. **Follow React patterns** - Use hooks correctly, avoid anti-patterns
4. **Test your example** - Ensure it works before committing
5. **Document clearly** - Write good README content

## Development

```bash
# Start examples development server
yarn dev

# Opens at http://localhost:5420
```

## Related

- [Getting started](../overview/getting-started.md) - Development setup
- [Commands reference](../reference/commands.md) - Available commands
