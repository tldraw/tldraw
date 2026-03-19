---
title: Clipboard events
component: ./ClipboardEventsExample.tsx
category: data/assets
priority: 4
keywords: [clipboard, copy, paste, cut, events, disable]
---

Intercept native clipboard events using the `onClipboardCopy`, `onClipboardCut`, and `onClipboardPaste` options.

---

This example shows how to use the clipboard event callbacks to intercept and control copy, cut, and paste behavior. The callbacks fire for both keyboard shortcuts and menu actions. Return `true` from a callback to prevent the default behavior.

The `onBeforePutExternalContent` callback lets you filter or transform content before shapes are created, regardless of how the content entered the editor (clipboard paste, file drop, etc.).
