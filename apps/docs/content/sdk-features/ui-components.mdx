---
title: UI components
created_at: 12/17/2024
updated_at: 12/20/2024
keywords:
  - ui
  - components
  - toolbar
  - menu
  - customization
status: published
date: 12/20/2024
order: 9
---

The `@tldraw/tldraw` package includes a complete React-based UI. It provides the menus, toolbars, panels, and dialogs that users interact with when creating and editing content. The UI is composed of named component slots that you can selectively override or hide, so you can customize the interface while still benefiting from the editor's reactive state management.

The UI connects to the editor through React hooks and context providers. Components automatically update when editor state changes. You can replace individual parts of the interface without reimplementing the logic that connects UI actions to editor operations.

## How it works

### Component slot architecture

The UI divides the screen into distinct layout zones:

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

The top zone contains the main menu, helper buttons (like "Back to content"), the top panel for collaboration features, and the share and style panels. The bottom zone houses navigation controls, the main toolbar with drawing tools, and the help menu. On desktop, the style panel appears in the top-right zone; on mobile it moves to a modal overlay.

Each zone can host multiple components. The toolbar includes the tool selector, tool-specific options, and the tool lock button. These components share context and coordinate through the editor's state.

### Context providers and state management

The UI establishes a hierarchy of React context providers that manage different aspects of the interface. At the root, `TldrawUiContextProvider` coordinates all other providers and merges your overrides. Specialized providers handle translations, tooltips, dialogs, toasts, breakpoints for responsive behavior, and the component registry.

The actions and tools providers transform raw editor methods into UI-friendly actions with labels, icons, and keyboard shortcuts. When you click a toolbar button, the component calls an action from context, which invokes the appropriate editor method. This indirection means the same action can be triggered from multiple places (toolbar, menu, keyboard shortcut) with consistent behavior.

### Reactive UI updates

UI components read editor state through hooks like `useEditor`, `useValue`, and `useReactor`. These hooks use the editor's reactive signal system to automatically re-render when relevant state changes. The style panel uses `useRelevantStyles` to determine which style controls to show based on the current selection—when you select a different shape, the hook detects the change and the panel updates.

This reactive approach means you don't need to manually manage subscriptions or worry about stale state. Components declare their dependencies, and the reactivity system handles the rest.

## Key components

### Component slots

The UI defines several component slots you can override or hide.

The **Toolbar** contains the primary tool selector with buttons for each available tool (select, draw, shapes, etc.). On mobile, it hides automatically when editing text to make room for the virtual keyboard.

The **TopPanel** displays the page name and collaboration indicators when multiplayer features are enabled. It's hidden in single-player mode.

The **StylePanel** shows style controls for selected shapes: color, fill, stroke, size, opacity. It appears in the top-right on desktop and as a modal on mobile.

The **MenuPanel** houses the main application menu with actions like export, print, and preferences. It's typically in the top-left corner.

The **NavigationPanel** provides page navigation, zoom controls, and the minimap toggle. It sits in the bottom-left area.

**HelperButtons** are context-sensitive buttons that appear based on editor state—"Back to content" when the camera is far from shapes, "Exit pen mode" on touch devices.

**ActionsMenu**, **ContextMenu**, and **HelpMenu** provide access to actions and information through different interaction patterns.

Each slot is optional. Pass `null` as an override to hide a component entirely, or provide your own React component to replace the default implementation.

### UI hooks

Components access editor functionality through specialized hooks.

`useEditor` returns the editor instance, providing direct access to all editor methods and state.

`useActions` returns a collection of UI actions (copy, paste, delete) with their labels, icons, and keyboard shortcuts. Each action is a function you can call from your custom UI.

`useTools` returns the available tools with their metadata. The toolbar uses this to render tool buttons.

`useRelevantStyles` determines which styles are relevant to the current selection and returns their values. It powers the style panel.

`useBreakpoint` returns the current responsive breakpoint (mobile, tablet, desktop), allowing components to adapt their layout.

These hooks encapsulate common UI patterns and keep your custom components in sync with editor state.

## Data flow

The UI follows a unidirectional data flow pattern:

1. **Editor state changes**: User interactions or programmatic updates modify the editor's state (selection, active tool, shape properties, camera position).

2. **Reactive updates**: Components subscribe to relevant state through hooks. When state changes, the reactivity system notifies affected components.

3. **UI renders**: Components re-render with updated state.

4. **User actions**: The user interacts with the UI (clicks a button, selects a menu item, presses a keyboard shortcut).

5. **Action execution**: The UI component calls an action from context, which invokes the corresponding editor method.

6. **State updates**: The editor method updates state, and the cycle continues.

This pattern keeps the UI synchronized with the editor and makes the data flow easy to trace and debug.

## Extension points

### Overriding components

Override individual components by passing them to the `components` prop. Your component receives the same props as the default implementation:

```typescript
function CustomToolbar() {
	const editor = useEditor()
	const tools = useTools()

	return (
		<div className="my-toolbar">
			{tools.map(tool => (
				<button
					key={tool.id}
					onClick={() => editor.setCurrentTool(tool.id)}
				>
					{tool.label}
				</button>
			))}
		</div>
	)
}

function App() {
	return (
		<Tldraw
			components={{
				Toolbar: CustomToolbar,
			}}
		/>
	)
}
```

### Hiding components

Pass `null` to hide a component entirely. This is useful for focused experiences that don't need all the default UI:

```typescript
function App() {
	return (
		<Tldraw
			components={{
				HelpMenu: null,
				DebugMenu: null,
				SharePanel: null,
			}}
		/>
	)
}
```

### Customizing actions and tools

Actions and tools can be customized through the `overrides` prop. You can modify labels, icons, keyboard shortcuts, or the behavior of existing actions, or add entirely new ones that integrate with the default UI.
