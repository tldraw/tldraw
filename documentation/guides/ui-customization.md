---
title: UI customization
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - ui
  - customization
  - components
  - toolbar
  - menu
---

## Overview

You can replace or hide any tldraw UI component using the `components` prop. This guide shows the basic override pattern and where to hook custom UI.

## Prerequisites

- A tldraw app using `tldraw`
- React familiarity

## Steps

### 1. Override components

```tsx
import { Tldraw, type TLComponents } from 'tldraw'

const components: TLComponents = {
	Toolbar: CustomToolbar,
	PageMenu: null,
}

function App() {
	return <Tldraw components={components} />
}
```

### 2. Add custom UI

Use UI hooks like `useEditor`, `useTools`, and `useActions` to wire custom menus and buttons to editor state.

## Tips

- Use `DefaultToolbar`, `DefaultContextMenu`, and other defaults to extend instead of replace.
- Keep component overrides stable (define them outside render or memoize).

## Key files

- packages/tldraw/src/lib/ui/components/ - Default UI components
- packages/tldraw/src/lib/ui/hooks/ - UI hooks for editor state
- packages/tldraw/src/lib/ui/menus/ - Menu components

## Related

- [UI components](../architecture/ui-components.md)
- [Style system](../architecture/style-system.md)
- [Custom tools](./custom-tools.md)
