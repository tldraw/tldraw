---
title: Focus management
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - focus
  - blur
  - keyboard
  - FocusManager
  - container
  - input
---

The focus management system determines when the editor captures user input versus allowing it to pass through to the enclosing page. When the editor is focused, it receives keyboard shortcuts, scroll wheel gestures, and certain pointer events. When unfocused, these inputs are ignored by the editor and remain available to other parts of the application. This enables use cases where the editor coexists with other interactive elements on the page, such as forms, toolbars, or sidebars.

The `FocusManager` class tracks the editor's focus state independently from standard DOM focus. While the editor's container element can receive DOM focus through normal browser mechanisms, the focus management system maintains its own focus state in the editor's instance record. This separation allows the editor to distinguish between "editor focus" (whether the editor should respond to keyboard shortcuts and other inputs) and "element focus" (whether a specific HTML element like a text input is the active element).

## How it works

### Editor focus state

The editor's focus state is stored in the instance record's `isFocused` property. When this property is true, the editor processes keyboard events for shortcuts, responds to scroll wheel events for zooming, and captures pointer move events. When false, these events are ignored, allowing the user to interact with the rest of the page without the editor intercepting input.

You can programmatically control focus using the `focus()` and `blur()` methods:

```typescript
// Focus the editor
editor.focus()

// Unfocus the editor
editor.blur()

// Check if the editor is focused
const isFocused = editor.getIsFocused()
```

Both methods accept options to control whether the container element should also receive or lose DOM focus:

```typescript
// Focus the editor without changing container focus
editor.focus({ focusContainer: false })

// Blur the editor without changing container focus
editor.blur({ blurContainer: false })
```

### Container focus synchronization

The `FocusManager` synchronizes the editor's focus state with a CSS class on the container element. When `isFocused` changes, the manager adds or removes the `tl-container__focused` class. This is necessary because the editor's focus state and DOM focus are not always identical, making `:focus` or `:focus-within` pseudo-selectors unreliable.

The manager also controls the `tl-container__no-focus-ring` class. Focus rings are hidden during mouse interactions but shown during keyboard navigation for accessibility. Pressing Tab, ArrowUp, or ArrowDown removes the class to show focus rings. Mouse clicks restore it.

### Auto-focus on mount

When the editor mounts, the `FocusManager` checks the `autoFocus` option passed to the editor. If `autoFocus` is true and the current focus state doesn't match, the manager updates the instance state accordingly. This ensures the editor starts in the expected focus state without requiring explicit `focus()` calls after initialization.

### Focus during pointer interactions

The `TldrawEditor` component sets up event listeners that manage focus based on pointer interactions. When `autoFocus` is enabled and no auto-focusing element would be focused, clicking inside the editor container automatically focuses the editor. Clicking outside the container blurs it. This behavior supports workflows where users alternate between interacting with the canvas and other page elements.

### Focus during shape editing

When the user edits a shape (such as text), the focus management system allows the text input to remain focused rather than the container. The `FocusManager` checks if the editor is in the `select.editing_shape` state and preserves the input's focus. This directs keyboard events to the text input during editing and to the editor for shortcuts otherwise.

The system handles contextual toolbar elements normally during editing mode, allowing keyboard navigation within the toolbar.

### Focus restoration and loss prevention

The `FocusManager` listens for changes to the instance state and responds when the `isFocused` property changes. This reactive approach means focus state updates automatically propagate to the container's CSS classes without manual coordination. When a dialog or modal closes and the editor should regain focus, calling `editor.focus()` updates both the instance state and the container's DOM focus, ensuring a consistent focus state across the system.

The `blur()` method calls `editor.complete()` before blurring the container. This completes any ongoing interaction, such as a drag or draw operation, preventing the editor from being left in an incomplete state when focus is lost.

## Key files

- packages/editor/src/lib/editor/managers/FocusManager/FocusManager.ts - Focus tracking and restoration
- packages/editor/src/lib/editor/Editor.ts - focus, blur methods
- packages/editor/src/lib/TldrawEditor.tsx - Pointer-based auto-focus setup

## Related

- [Input handling](./input-handling.md)
