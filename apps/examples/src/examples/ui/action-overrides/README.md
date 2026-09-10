---
title: Custom actions
component: ./ActionOverridesExample.tsx
priority: 3
keywords:
  [
    actions,
    overrides,
    keyboard shortcuts,
    kbd,
    custom actions,
    useactions,
    helpers,
    addtoast,
    tluiactionitem,
  ]
---

Add a custom action and change an existing action's keyboard shortcut using the `overrides` prop.

---

The `actions` override receives tldraw's default actions and returns the set to use. Here we add a `my-action` action that shows a toast when you press `S`, and change the delete action's shortcut to `Shift + X`.

Try pressing `S` on the canvas to see the toast, then select a shape and press `Shift + X` to delete it. For more information on keyboard shortcuts see the [keyboard shortcuts example](https://tldraw.dev/examples/keyboard-shortcuts).
