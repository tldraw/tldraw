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

The `@tldraw/tldraw` package includes a complete React-based UI system that wraps the core editor. This UI provides the menus, toolbars, panels, and dialogs that users interact with when creating and editing content. Rather than being monolithic, the UI is composed of named component slots that you can selectively override or hide, making it straightforward to customize the interface while still benefiting from the editor's reactive state management and built-in behaviors.

The UI system connects to the editor through React hooks and context providers, ensuring that components automatically update when editor state changes. This architecture allows you to replace individual parts of the interface without reimplementing the logic that connects UI actions to editor operations.

## How it works

### Component slot architecture

The UI divides the screen into distinct layout zones, each containing one or more component slots. These zones organize the interface spatially and provide consistent placement across different screen sizes:

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

The top zone contains the main menu, helper buttons (like "Back to content"), the top panel for collaboration features, and the share and style panels. The bottom zone houses the navigation controls, the main toolbar with drawing tools, and the help menu. On desktop, the style panel appears in the top-right zone, while on mobile it moves to a modal overlay to save screen space.

Each zone can host multiple components that work together. The toolbar, for example, includes the tool selector, tool-specific options, and the tool lock button. These components share context and coordinate their behavior through the editor's state.

### Context providers and state management

The UI establishes a hierarchy of React context providers that manage different aspects of the interface. At the root, `TldrawUiContextProvider` coordinates all other providers and merges any overrides you've supplied. Below it, specialized providers handle translations, tooltips, dialogs, toasts, breakpoints for responsive behavior, and the component registry itself.

The actions and tools providers sit inside this hierarchy and transform raw editor methods into UI-friendly actions with labels, icons, and keyboard shortcuts. When you click a button in the toolbar, the component calls an action from context, which then invokes the appropriate editor method. This indirection allows the same action to be triggered from multiple places in the UI (toolbar, menu, keyboard shortcut) while maintaining consistent behavior and state.

### Reactive UI updates

UI components read editor state through hooks like `useEditor`, `useValue`, and `useReactor`. These hooks leverage the editor's reactive signal system to automatically re-render when relevant state changes. For example, the style panel uses `useRelevantStyles` to determine which style controls to show based on the current selection. When you select a different shape, the hook detects the change and the panel updates to show the appropriate controls.

This reactive approach means you don't need to manually manage subscriptions or worry about stale state. Components declare their dependencies, and the reactivity system handles the rest.

## Key components

### Component slots

The UI defines several component slots that you can override or hide:

**Toolbar**: Contains the primary tool selector with buttons for each available tool (select, draw, shapes, etc.). On mobile, it hides automatically when editing text to make room for the virtual keyboard.

**TopPanel**: Displays the page name and collaboration indicators when multiplayer features are enabled. Hidden in single-player mode.

**StylePanel**: Shows style controls for the selected shapes (color, fill, stroke, size, opacity). Appears in the top-right on desktop and as a modal on mobile.

**MenuPanel**: Houses the main application menu with actions like export, print, and preferences. Typically located in the top-left corner.

**NavigationPanel**: Provides page navigation, zoom controls, and the minimap toggle. Located in the bottom-left area.

**HelperButtons**: Context-sensitive buttons that appear based on editor state, such as "Back to content" when the camera is far from shapes or "Exit pen mode" on touch devices.

**ActionsMenu**, **ContextMenu**, **HelpMenu**: Various menu components that provide access to actions and information through different interaction patterns.

Each slot is optional. Pass `null` as an override to hide a component entirely, or provide your own React component to replace the default implementation.

### UI hooks

Components access editor functionality through specialized hooks:

**useEditor**: Returns the editor instance, providing direct access to all editor methods and state.

**useActions**: Returns a collection of UI actions (like copy, paste, delete) with their labels, icons, and keyboard shortcuts. Each action is a function you can call from your custom UI.

**useTools**: Returns the available tools with their metadata. The toolbar uses this to render tool buttons.

**useRelevantStyles**: Determines which styles are relevant to the current selection and returns their values. Powers the style panel.

**useBreakpoint**: Returns the current responsive breakpoint (mobile, tablet, desktop), allowing components to adapt their layout and behavior.

These hooks encapsulate common UI patterns and ensure your custom components stay in sync with editor state.

## Data flow

The UI follows a unidirectional data flow pattern:

1. **Editor state changes**: User interactions or programmatic updates modify the editor's state (selection, active tool, shape properties, camera position).

2. **Reactive updates**: Components subscribe to relevant state through hooks. When state changes, the reactivity system notifies affected components.

3. **UI renders**: Components re-render with updated state and display the new information to the user.

4. **User actions**: The user interacts with the UI (clicks a button, selects a menu item, presses a keyboard shortcut).

5. **Action execution**: The UI component calls an action from context, which invokes the corresponding editor method.

6. **State updates**: The editor method updates state, and the cycle continues.

This pattern ensures that the UI is always synchronized with the editor and that state flows in one clear direction, making the system easier to understand and debug.

## Extension points

### Overriding components

Override individual components by passing them to the `components` prop. Your component receives the same props as the default implementation, allowing you to add custom behavior while reusing the standard interface:

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

Pass `null` to hide a component entirely. This is useful when building focused experiences that don't need all the default UI elements:

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

Actions and tools can be customized through the `overrides` prop. This allows you to modify labels, icons, keyboard shortcuts, or the behavior of existing actions, or add entirely new ones that integrate seamlessly with the default UI.

## Key files

- packages/tldraw/src/lib/ui/TldrawUi.tsx - Main UI component and layout
- packages/tldraw/src/lib/ui/context/TldrawUiContextProvider.tsx - Root context provider
- packages/tldraw/src/lib/ui/context/components.tsx - Component registry and defaults
- packages/tldraw/src/lib/ui/context/actions.tsx - Actions context and default actions
- packages/tldraw/src/lib/ui/components/ - Default UI component implementations
- packages/tldraw/src/lib/ui/hooks/ - UI hooks for accessing editor state and actions
- packages/tldraw/src/lib/ui/components/Toolbar/ - Toolbar and tool-specific UI
- packages/tldraw/src/lib/ui/components/StylePanel/ - Style controls and style panel
- packages/tldraw/src/lib/ui/components/primitives/ - Reusable UI primitives (buttons, menus, dialogs)

## Related

- [Tool system](./tool-system.md) - Tools exposed in the toolbar
- [Style system](./style-system.md) - Styles controlled through the style panel
- [Reactive state](./reactive-state.md) - Reactive state management underlying UI updates
