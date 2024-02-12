---
title: Custom keyboard shortcuts dialog content
component: ./CustomKeyboardShortcutsDialogContentExample.tsx
category: ui
---

You can customize tldraw's keyboard shortcut dialog content. Open the help menu by clicking the "?" button at the bottom right of the editor and selecting keyboard shortcuts. There should be a new menu item there.

---

The keyboard shortcuts dialog content can be customized by providing a `KeyboardShortcutsDialogContent` component to the `Tldraw` component's `uiComponents` prop. If you provide `null`, then that component will be hidden.
