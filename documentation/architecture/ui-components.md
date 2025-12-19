---
title: UI components
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - ui
  - components
  - toolbar
  - menu
  - customization
---

## Overview

tldraw ships with a full React UI that you can customize or replace. The UI is composed of named slots (toolbar, panels, menus) that can be overridden via the `components` prop while still wiring into the Editor's state and actions.

```
┌─────────────────────────────────────────────────────────┐
│                    Top Panel                             │
├────────────┬──────────────────────────┬─────────────────┤
│   Left     │         Canvas           │     Right       │
│   Panel    │                          │     Panel       │
├────────────┴──────────────────────────┴─────────────────┤
│                   Bottom Panel                           │
└─────────────────────────────────────────────────────────┘
```

## Key components

### Component slots

Common slots include `Toolbar`, `TopPanel`, `StylePanel`, `NavigationPanel`, `ActionsMenu`, `ContextMenu`, and `HelpMenu`. You can override any of them to change layout or behavior.

### UI state and actions

UI components access editor state through hooks like `useEditor`, `useTools`, and `useActions`. This keeps the UI reactive to selection, tool state, and user preferences.

## Data flow

1. Editor state updates (selection, tool, styles).
2. UI components read shared state via hooks.
3. UI actions call editor commands (create shapes, change styles).

## Extension points

Override components or return `null` to hide them:

```typescript
function App() {
	return (
		<Tldraw
			components={{
				Toolbar: CustomToolbar,
				HelpMenu: null,
			}}
		/>
	)
}
```

## Key files

- packages/tldraw/src/lib/ui/components/ - Default UI components
- packages/tldraw/src/lib/ui/hooks/ - UI hooks (useTools, useActions, useEditor)
- packages/tldraw/src/lib/ui/context/ - UI context providers
- packages/tldraw/src/lib/ui/menus/ - Menu components

## Related

- [Tool system](./tool-system.md) - Tools exposed in the toolbar
- [Style system](./style-system.md) - Styles used in the style panel
