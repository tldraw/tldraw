---
title: Editor focus
component: ./EditorFocusExample.tsx
category: basic
priority: 7
---

The editor's keyboard shortcuts only work when the editor is "focused".

---

In this example, we drive the editor's focus in order to turn on and off keyboard shortcuts.

The editor's focus is different from—but usually corresponds to—the browser's concept of "focus", which is related to the document's [active element](https://developer.mozilla.org/en-US/docs/Web/API/Document/activeElement).

Unfortunately, the browser's focus cannot be relied on to determine whether the editor's keyboard shortcuts should work. While its possible to detect whether the document's active element is a descendant of the Tldraw component's own element, it's not 100% reliable. For example, iframes are not considered descendants of their parents, and many menus are portalled into different parts of the document tree.

For these reasons, the responsibility falls to you, dear developer, to manage focus for your Tldraw editor, especially in cases where there are more than one editor on the same page.
