---
title: Examples app
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - examples
  - development
  - showcase
  - demo
  - testing
status: published
date: 12/19/2025
order: 2
---

The examples app is the SDK showcase and development sandbox. It runs at `http://localhost:5420` when you start the repo, and it is deployed to [examples.tldraw.com](https://examples.tldraw.com). Each example is a standalone React component with metadata that powers navigation and embedding.

## Key components

### Example registry

Examples are discovered by scanning README files and turning them into a registry:

```typescript
const examples = Object.values(import.meta.glob('./examples/*/README.md', { eager: true }))
```

### Example metadata

Each example folder includes a README with frontmatter that declares its title, category, and component entrypoint:

```md
---
title: Custom shape
component: ./CustomShapeExample.tsx
category: shapes/tools
priority: 0
keywords: [shape, util, custom]
---
```

### Example wrapper

`ExampleWrapper` provides shared layout, error boundaries, and multiplayer room handling so examples behave consistently.

## Data flow

1. The build step parses README frontmatter into example metadata.
2. Routes are generated from example folder names.
3. When a route is visited, the example component is lazy-loaded.
4. `ExampleWrapper` sets up layout and cleanup around the example.

## Adding examples

Create a new folder in `apps/examples/src/examples/`, add a README, and export a default React component:

```tsx
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function MyExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw />
		</div>
	)
}
```

## Development workflow

```bash
yarn dev

yarn e2e
```

## Key files

- apps/examples/src/index.tsx - Application entry point and routing
- apps/examples/src/examples.tsx - Example registry and categories
- apps/examples/src/ExampleWrapper.tsx - Shared layout and lifecycle
- apps/examples/src/ExamplePage.tsx - Example page container
- apps/examples/vite.config.ts - Vite configuration and README processing
- apps/examples/writing-examples.md - Example authoring guide
- apps/examples/e2e/playwright.config.ts - Playwright configuration
- apps/examples/CONTEXT.md - Architecture and development context

## Related

- [Repository overview](../overview/repository-overview.md)
- [Writing examples guide](../../apps/examples/writing-examples.md)
- [`@tldraw/tldraw` package](../packages/tldraw.md)
- [`@tldraw/editor` package](../packages/editor.md)
