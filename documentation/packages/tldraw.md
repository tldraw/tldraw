---
title: '@tldraw/tldraw'
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - tldraw
  - sdk
  - complete
  - ui
---

## Overview

`@tldraw/tldraw` is the full editor with default shapes, tools, and UI. Most applications should start here.

## Installation

```bash
npm install tldraw
```

```typescript
import 'tldraw/tldraw.css'
```

## Basic usage

```tsx
import { Tldraw } from 'tldraw'

function App() {
	return <Tldraw />
}
```

## Key components

- Default shapes and tools
- UI components (toolbar, menus, panels)
- External content handling

## Key files

- packages/tldraw/src/index.ts - Package entry
- packages/tldraw/src/lib/Tldraw.tsx - Main component
- packages/tldraw/src/lib/ui/ - UI components and hooks

## Related

- [@tldraw/editor](./editor.md)
- [UI components](../architecture/ui-components.md)
