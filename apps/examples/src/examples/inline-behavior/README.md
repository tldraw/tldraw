---
title: Inset editor (common practices)
component: ./InlineBehavior.tsx
category: layout
priority: 0.5
keywords: [focus, blur, multiple]
---

Common practices for using the `Tldraw` component as a block within a larger page.

---

This example demonstrates some common best practices for using tldraw as a block within a larger page. It includes:

- Making sure that only one editor has focus at a time.
- Always defaulting to the hand tool when you click into an editor.
- Deselecting everything when an editor loses focus.
- Hiding the UI when an editor is not focused.
- Disabling edge scrolling by default.
- Using a stripped down UI to make the most of the available space.
- Removing actions from the context menu to match the stripped down UI.
