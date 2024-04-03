---
title: Inline behavior
component: ./InlineBehavior.tsx
category: ui
priority: 3
---

tldraw can be used as an inline block within a larger document editor.

---

This example demonstrates some common best practices for using tldraw as an inline block within a larger editor. It includes:

- Making sure that only one editor has focus at a time.
- Always defaulting to the hand tool when you click into an editor.
- Deselecting everything when an editor loses focus.
- Hiding the UI when an editor is not focused.
- Disabling edge scrolling by default.
- Using a stripped down UI to make the most of the available space.
- Removing actions from the context menu to match the stripped down UI.
