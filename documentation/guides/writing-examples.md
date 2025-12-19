---
title: Writing examples
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - examples
  - development
  - guide
  - showcase
  - demos
---

## Overview

The examples app is the primary SDK showcase and development sandbox. This guide shows how to add a new example and make it appear in the app.

## Prerequisites

- A local tldraw repo
- The examples app running (`yarn dev`)

## Steps

### 1. Create an example folder

Create a new directory under `apps/examples/src/examples/` with a kebab-case name.

### 2. Add README frontmatter

```md
---
title: Custom shape
component: ./CustomShapeExample.tsx
category: shapes/tools
priority: 0
keywords: [shape, util, custom]
---

One-line summary.

---

Longer description for the example page.
```

### 3. Add the example component

```tsx
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function CustomShapeExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw />
		</div>
	)
}
```

### 4. Verify locally

```bash
yarn dev
```

## Tips

- Keep examples focused and minimal when possible.
- Use CSS files named after the example for styling.

## Key files

- apps/examples/src/examples/ - Example folders
- apps/examples/src/examples.tsx - Example registry
- apps/examples/src/ExampleWrapper.tsx - Shared layout and lifecycle
- apps/examples/writing-examples.md - Detailed authoring guide

## Related

- [Examples app](../apps/examples.md)
- [Custom shapes](./custom-shapes.md)
