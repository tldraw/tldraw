---
title: Clipboard events
component: ./ClipboardEventsExample.tsx
priority: 4
keywords: [clipboard, copy, paste, cut, events, disable]
---

Filter, transform, or block copy, cut, and paste with the clipboard hooks in `TldrawOptions`.

---

Three options let you intercept clipboard operations. They run for both keyboard shortcuts and menu actions.

- `onClipboardPasteRaw` runs first, before tldraw parses the clipboard. It receives the raw `DataTransfer` (source `native-event`) or `ClipboardItem[]` (source `clipboard-read`). Return `false` to cancel tldraw's default paste handling and deal with the data yourself.
- `onBeforeCopyToClipboard` receives the serialized `TLContent` plus `operation` (`copy` or `cut`) and `source` (`native` or `menu`). Return a modified `TLContent` to change what's written, or `false` to cancel (for cut, the selection is kept).
- `onBeforePasteFromClipboard` receives the parsed `TLExternalContent` about to be applied. Return a modified content object or `false` to cancel. It only fires for clipboard paste, not for file drops or programmatic `putExternalContent` calls.

Use the checkboxes in the top panel to block copy or paste, strip red shapes on copy or paste, take over raw paste, or add a 500ms delay to the hooks. The log below the controls shows each hook as it fires. Try drawing a red and a blue shape, then copying and pasting with different toggles on.
