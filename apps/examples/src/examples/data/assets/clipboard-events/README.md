---
title: Clipboard events
component: ./ClipboardEventsExample.tsx
category: data/assets
priority: 4
keywords: [clipboard, copy, paste, cut, events, disable]
---

Intercept clipboard copy, cut, and paste using `onBeforeCopyToClipboard` and `onBeforePasteFromClipboard`.

---

This example shows how to filter or cancel clipboard operations. The hooks run for both keyboard shortcuts and menu actions.

- **`onBeforeCopyToClipboard`** — Receives serialized `TLContent` plus `operation` (`'copy'` | `'cut'`) and `source` (`'native'` | `'menu'`). Return a modified `TLContent` to change what is written, or `false` to cancel the write (for cut, the selection is not removed).

- **`onBeforePasteFromClipboard`** — Runs when pasted content is about to be applied. Receives `source` (`'native'` | `'menu'`). Return `false` to cancel, or a modified `TLExternalContent` to transform. This hook applies to clipboard paste only, not file drops or other `putExternalContent` calls.
