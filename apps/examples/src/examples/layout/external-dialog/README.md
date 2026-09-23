---
title: External dialog
component: ./ExternalDialog.tsx
priority: 20
keywords: [dialog, modal, css, styling, custom styles, embed, insert]
---

Open dialogs over the whole page instead of inside the `Tldraw` container.

---

The tldraw UI renders its dialogs (insert embed, edit link, keyboard shortcuts) inside the `Tldraw` component, positioned absolutely within it. When the editor is a small inset in a larger page, that can leave dialogs cramped or clipped.

This example overrides the `.tlui-dialog__overlay` and `.tlui-dialog__positioner` styles to use `position: fixed`, so dialogs are positioned relative to the browser window instead. Try it: open the "Insert embed" dialog from the menu, or press `Cmd + I` / `Ctrl + I`, and the dialog will center over the whole page rather than the 600 × 400 editor.
