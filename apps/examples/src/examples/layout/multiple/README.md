---
title: Multiple editors
component: ./MultipleExample.tsx
priority: 2
keywords: [multiple editors, focus, autofocus, blur, context, shared document, persistencekey, sync]
---

Put several `Tldraw` components on one page and make sure only one is focused at a time.

---

Each `Tldraw` component is its own editor with its own keyboard handling, so with several on a page you need to decide which one currently owns focus. This example turns off `autoFocus` on every editor and tracks the focused one in a React context. Wrapping each editor in a focusable `div` (`tabIndex={-1}`) with an `onFocus` handler lets us call `editor.focus()` on the newly focused editor and `editor.blur()` on the previous one. Clicking anywhere else on the page blurs whichever editor was focused.

Editors B and C share a `persistenceKey`, so they show the same locally synchronized document. Try drawing in one and watching the other update. The long block of text below is there so you can check that scrolling the page and typing in the textarea don't get captured by an unfocused editor.
