---
title: Focus the editor
component: ./EditorFocusExample.tsx
priority: 2
keywords: [focus, blur, autofocus, keyboard shortcuts, multiple editors, scrolling, instance state]
---

Control the editor's focus with `focus()`, `blur()`, and `autoFocus` to gate keyboard shortcuts and scroll capture.

---

The editor's focus decides whether its keyboard shortcuts respond and whether wheel events pan the canvas. It is related to, but not the same as, the browser's notion of focus (the document's [active element](https://developer.mozilla.org/en-US/docs/Web/API/Document/activeElement)). The browser's focus can't be relied on for this: iframes aren't descendants of their parents, and many menus are portalled elsewhere in the document, so checking whether the active element is inside the `Tldraw` element isn't reliable.

That leaves focus management to you, especially with more than one editor on a page. This example mounts the editor with `autoFocus={false}` and drives focus with `editor.focus()` and `editor.blur()` from a checkbox that stays in sync via `editor.getIsFocused()`. Try typing in the text input while the editor is focused (shortcuts shouldn't fire), and toggle the checkbox to see scrolling switch between the page and the canvas.
