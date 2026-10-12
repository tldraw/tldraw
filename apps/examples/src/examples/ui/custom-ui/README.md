---
title: Replace the entire UI
component: ./CustomUiExample.tsx
priority: 1.5
keywords:
  [hideui, custom ui, keyboard shortcuts, setcurrenttool, track, useeditor, toolbar, buttons]
---

Hide tldraw's UI with `hideUi` and build your own toolbar and shortcuts on top of the editor.

---

Pass `hideUi` to the `Tldraw` component to hide the default UI, then render your own components as children so they can reach the editor through `useEditor`. This example adds a minimal toolbar with select, pencil, and eraser buttons, plus keyboard shortcuts for switching tools and deleting shapes.

The toolbar is wrapped in `track()` so the active button follows `editor.getCurrentToolId()`. `hideUi` doesn't remove the context menu; see the exploded example for how to omit it.
