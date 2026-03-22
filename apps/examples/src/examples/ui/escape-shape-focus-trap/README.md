---
title: Escape shape focus trap
component: ./EscapeShapeFocusTrap.tsx
category: ui
priority: 3
keywords:
  [
    tab,
    keyboard navigation,
    accessibility,
    a11y,
    shape toolbar,
    focus,
    contextual toolbar,
    keyboard,
  ]
---

Tab from a selected shape to a custom contextual toolbar using keyboard navigation.

---

This example demonstrates how to intercept tldraw's built-in Tab-based shape navigation so that pressing Tab while a shape is selected moves focus to a custom toolbar instead of cycling to the next shape.

By default, tldraw traps the Tab key when shapes are selected and uses it to navigate between shapes. This example shows how to break out of that cycle using a capture-phase event listener registered in `onMount`.

## How it works

1. A capture-phase `keydown` listener intercepts Tab before tldraw's own handler sees it
2. When a shape is selected and focus is on the canvas, Tab moves focus to the first toolbar button
3. While focus is inside the toolbar, Tab and Shift+Tab are handled manually to cycle between toolbar buttons
4. Tab on the last button (or Shift+Tab on the first) returns focus to the canvas and restores shape navigation
5. Pressing Escape while focused in the toolbar also returns focus to the canvas

Try it: click a shape, then press Tab to focus the toolbar. Use Tab/Shift+Tab to move between buttons. Press Escape to return to the canvas.
