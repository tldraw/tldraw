---
title: Examples app
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - examples
  - development
  - showcase
  - demo
  - testing
---

The examples app is a comprehensive showcase and development environment for the tldraw SDK. It hosts over 130 working examples that demonstrate features, integrations, and use cases across the entire tldraw API surface.

## Overview

The examples app serves multiple purposes in the tldraw ecosystem:

- **Development environment**: When you run `yarn dev` from the repository root, this app starts at localhost:5420
- **SDK showcase**: Provides working demonstrations of every major tldraw feature
- **Documentation integration**: Individual examples are embedded as iframes in the [tldraw.dev examples section](https://tldraw.dev/examples)
- **Quality assurance**: Serves as a testing ground for new features and regressions

The app is deployed to production at [examples.tldraw.com](https://examples.tldraw.com) with each SDK release, and to [examples-canary.tldraw.com](https://examples-canary.tldraw.com) with each push to main. Each pull request also receives its own preview deployment.

## Running the examples app

### Starting the development server

From the repository root:

```bash
yarn dev
```

This starts the examples app at `http://localhost:5420`. The app includes hot module replacement for rapid development.

### Building for production

```bash
cd apps/examples
yarn build
```

The production build outputs to `apps/examples/dist/`.

### Running tests

Run end-to-end tests for all examples:

```bash
cd apps/examples
yarn e2e
```

Run E2E tests with the Playwright UI for debugging:

```bash
yarn e2e-ui
```

Run performance tests:

```bash
yarn e2e-perf
```

## Example categories and organization

Examples are organized into ten categories, each focusing on a specific aspect of the SDK:

| Category | Description |
|----------|-------------|
| **Getting started** | Basic usage patterns and initial setup |
| **Configuration** | Editor setup, options, and initialization |
| **Editor API** | Core editor methods and programmatic control |
| **UI & theming** | User interface customization and styling |
| **Page layout** | Canvas arrangement and viewport control |
| **Events & effects** | Event handling, callbacks, and side effects |
| **Shapes & tools** | Custom shapes and interactive tools |
| **Collaboration** | Multi-user features and real-time sync |
| **Data & assets** | Data management, persistence, and asset handling |
| **Use cases** | Complete application scenarios and integrations |

Each category groups related examples by priority, with the most fundamental examples appearing first.

## Example structure

### Directory layout

Each example lives in its own directory under `apps/examples/src/examples/`:

```
apps/examples/src/examples/
├── basic/
│   ├── README.md
│   └── BasicExample.tsx
├── custom-shape/
│   ├── README.md
│   ├── CustomShapeExample.tsx
│   └── custom-shape.css
└── pdf-editor/
    ├── README.md
    ├── PdfEditorExample.tsx
    ├── pdf-editor.css
    └── PdfHelpers.ts
```

### Required files

Every example must include:

1. **Directory name**: kebab-case (e.g., `custom-shape`, `sync-demo`)
2. **README.md**: Contains metadata and description
3. **Component file**: Ends with `Example.tsx` (e.g., `CustomShapeExample.tsx`)

### README.md frontmatter

The README.md file defines example metadata in YAML frontmatter:

```md
---
title: Custom shape
component: ./CustomShapeExample.tsx
category: shapes/tools
priority: 0
keywords: [shape, util, custom]
---

A simple custom shape.

---

You can create custom shapes in tldraw by creating a shape util
and passing it to the Tldraw component.
```

| Field | Description |
|-------|-------------|
| `title` | Example name in sentence case |
| `component` | Relative path to the main component file |
| `category` | Category ID (must match one of the ten categories) |
| `priority` | Sort order within category (lower numbers appear first) |
| `keywords` | Array of search terms for discoverability |
| `hide` | Optional boolean to hide from the examples list |
| `multiplayer` | Optional boolean indicating collaboration features |

The README content is split by `---` into two sections:

1. **One-line summary**: Appears in the examples list
2. **Detailed description**: Shown on the example page

### Component structure

Example components must export a default React component:

```tsx
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function BasicExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw />
		</div>
	)
}
```

For full-page examples, use `className="tldraw__editor"` to make the editor fill the container. For inset examples, use standard page layout with custom styling.

## Example types

### Tight examples

Tight examples demonstrate a specific SDK feature with minimal code. They prioritize clarity and focus:

- Remove unnecessary styling
- Keep code minimal
- Use numbered comments to explain key parts
- Meant to be read and understood quickly

Example of a tight example:

```tsx
import { Tldraw, type TLComponents } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
const components: TLComponents = {
	PageMenu: null,
}

export default function HideUiExample() {
	return (
		<div className="tldraw__editor">
			{/* [2] */}
			<Tldraw components={components} />
		</div>
	)
}

/*
[1]
Define component overrides outside the React component to keep them static.
Use useMemo if they must be defined inside the component.

[2]
Pass your component overrides to the components prop.
*/
```

### Use-case examples

Use-case examples show complete application scenarios with realistic UI and functionality. They demonstrate how tldraw fits into real-world applications:

- Include appropriate styling and polish
- Implement complete features, not just API calls
- Show integration patterns with other libraries
- Provide copy-pasteable starting points

Examples include:

- **PDF editor**: Complete PDF annotation tool
- **Image annotator**: Image markup interface
- **Slides**: Presentation creation tool

## How examples are rendered

### Discovery and registration

The examples app uses Vite's `import.meta.glob` to automatically discover all example README files:

```typescript
const examples = Object.values(
  import.meta.glob('./examples/*/README.md', { eager: true })
)
```

A custom Vite plugin (`exampleReadmePlugin`) processes each README.md file:

1. Parses the YAML frontmatter
2. Splits the content into description and details
3. Generates a module exporting example metadata
4. Creates a lazy-loadable component import

### Routing

The app uses React Router with dynamic routes for each example:

- Root path (`/`) shows the basic example
- Example paths match directory names (e.g., `/custom-shape`)
- Each route lazy-loads the example component

### Component wrapping

Every example is wrapped in `ExampleWrapper`, which:

- Provides consistent layout
- Handles error boundaries
- Manages multiplayer room IDs for collaboration examples
- Ensures proper cleanup between example switches

## E2E testing

### Test structure

End-to-end tests live in `apps/examples/e2e/tests/`:

```
e2e/
├── playwright.config.ts
├── tests/
│   ├── test-canvas-events.spec.ts
│   ├── test-clipboard.spec.ts
│   └── test-rich-text.spec.ts
└── perf/
    └── performance tests
```

### Running tests

The examples app includes comprehensive E2E tests using Playwright:

```bash
# Run all tests
yarn e2e

# Run with UI for debugging
yarn e2e-ui

# Run performance tests
yarn e2e-perf

# Run performance tests with UI
yarn e2e-perf-ui
```

Tests verify:

- Example rendering without errors
- Interactive features work correctly
- Performance characteristics
- Accessibility compliance

## Contributing new examples

### Planning your example

Before creating an example:

1. **Check existing examples**: Ensure your example isn't duplicating existing content
2. **Choose the type**: Decide between tight (focused) or use-case (complete)
3. **Select a category**: Pick the most appropriate category for discoverability
4. **Plan the scope**: Keep tight examples minimal, use-case examples realistic

### Creating the example

1. Create a directory in `apps/examples/src/examples/` with a kebab-case name:

```bash
mkdir apps/examples/src/examples/my-example
```

2. Create the README.md with proper frontmatter:

```md
---
title: My example
component: ./MyExampleExample.tsx
category: getting-started
priority: 10
keywords: [feature, demo]
---

One-line summary of what this example demonstrates.

---

Detailed explanation of the example, including any important
concepts or patterns that users should understand.
```

3. Create the component file:

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

4. Test your example locally:

```bash
yarn dev
```

Navigate to `http://localhost:5420/my-example` to view it.

### Code style guidelines

**Comments**: Use numbered footnote format:

```tsx
function Example() {
	// [1]
	const editor = useEditor()

	return <div>{/* [2] */}</div>
}

/*
[1]
Explanation of the first comment

[2]
Explanation of the second comment
*/
```

**External files**: Keep examples self-contained when possible. Split code into separate files only when it would distract from the main point:

```tsx
// Good: Extract complex helpers
import { complexDataTransform } from './helpers'

// Avoid: Extracting simple components unnecessarily
```

**Styling**: Use external CSS files matching the example name:

```tsx
import './my-example.css'
```

Avoid inline styles unless demonstrating dynamic styling.

**Dependencies**: Import only what's needed. Prefer using built-in tldraw features over external libraries when possible.

## Common patterns and best practices

### Defining static configurations

Define configurations outside components to prevent recreation on every render:

```tsx
// Good
const customTools = [MyTool, AnotherTool]
const customShapes = [MyShape]

export default function Example() {
	return <Tldraw tools={customTools} shapeUtils={customShapes} />
}

// Avoid
export default function Example() {
	// This recreates arrays on every render
	return <Tldraw tools={[MyTool]} shapeUtils={[MyShape]} />
}
```

If you must define inside the component, use `useMemo`:

```tsx
export default function Example() {
	const tools = useMemo(() => [MyTool], [])
	return <Tldraw tools={tools} />
}
```

### Accessing the editor instance

Use the `useEditor` hook to access the editor programmatically:

```tsx
import { useEditor } from 'tldraw'

function MyComponent() {
	const editor = useEditor()

	const handleClick = () => {
		editor.selectAll()
		editor.zoomToSelection()
	}

	return <button onClick={handleClick}>Zoom to all</button>
}
```

### Handling cleanup

Clean up event listeners and side effects when examples unmount:

```tsx
import { useEffect } from 'react'
import { useEditor } from 'tldraw'

function MyComponent() {
	const editor = useEditor()

	useEffect(() => {
		const handleChange = () => {
			console.log('Selection changed')
		}

		editor.on('change-selection', handleChange)
		return () => editor.off('change-selection', handleChange)
	}, [editor])

	return <Tldraw />
}
```

### Working with custom shapes

When demonstrating custom shapes, follow the established pattern:

```tsx
import { ShapeUtil, TLBaseShape, Tldraw } from 'tldraw'

// [1]
type MyShape = TLBaseShape<'my-shape', { width: number; height: number }>

// [2]
class MyShapeUtil extends ShapeUtil<MyShape> {
	static override type = 'my-shape' as const

	getGeometry(shape: MyShape) {
		return new Rectangle2d({
			width: shape.props.width,
			height: shape.props.height,
		})
	}

	component(shape: MyShape) {
		return <div>My Shape</div>
	}

	indicator(shape: MyShape) {
		return <rect width={shape.props.width} height={shape.props.height} />
	}
}

export default function CustomShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw shapeUtils={[MyShapeUtil]} />
		</div>
	)
}

/*
[1]
Define your shape type extending TLBaseShape with your custom properties

[2]
Create a ShapeUtil class implementing required methods for rendering and geometry
*/
```

### Demonstrating collaboration

For collaboration examples, use the `multiplayer: true` frontmatter field:

```md
---
title: Sync demo
component: ./SyncDemoExample.tsx
category: collaboration
priority: 0
multiplayer: true
---
```

The `ExampleWrapper` automatically manages room IDs for multiplayer examples, creating persistent rooms in localStorage that reset with each deployment.

## Key files

- apps/examples/src/index.tsx - Application entry point and routing setup
- apps/examples/src/examples.tsx - Example registry and category definitions
- apps/examples/src/ExampleWrapper.tsx - Layout wrapper with error boundaries
- apps/examples/src/ExamplePage.tsx - Individual example page component
- apps/examples/vite.config.ts - Vite configuration with README processing plugin
- apps/examples/writing-examples.md - Comprehensive guide for creating examples
- apps/examples/e2e/playwright.config.ts - Playwright test configuration
- apps/examples/CONTEXT.md - Architecture and development context

## Related

- [Repository overview](../overview/repository-overview.md)
- [Writing examples guide](../../apps/examples/writing-examples.md)
- [@tldraw/tldraw package](../packages/tldraw.md)
- [@tldraw/editor package](../packages/editor.md)
