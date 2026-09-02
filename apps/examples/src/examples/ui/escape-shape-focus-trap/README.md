---
title: Escape shape focus trap
component: ./EscapeShapeFocusTrap.tsx
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

Tab from a selected shape into a custom contextual toolbar instead of cycling to the next shape.

---

By default tldraw traps the Tab key while shapes are selected and uses it to move between shapes. This example intercepts that with a capture-phase `keydown` listener registered in `onMount`, so it runs before tldraw's own handler and can call `stopImmediatePropagation()`.

- Tab with a shape selected and focus on the canvas moves focus to the first toolbar button.
- Tab and Shift+Tab inside the toolbar cycle between its buttons.
- Tab on the last button (or Shift+Tab on the first) returns focus to the canvas and restores shape navigation.
- Escape inside the toolbar also returns focus to the canvas.

Try it: click a shape, then press Tab to focus the toolbar. Use Tab and Shift+Tab to move between buttons, and Escape to return to the canvas.
