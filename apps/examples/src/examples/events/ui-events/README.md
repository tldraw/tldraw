---
title: UI events
component: ./UiEventsExample.tsx
priority: 1
keywords:
  [
    ui events,
    onUiEvent,
    TLUiEventHandler,
    event logging,
    keyboard shortcuts,
    actions,
    tools,
    debugging,
    analytics,
  ]
---

Listen to the actions the default UI performs and see which editor API each one calls.

---

The `onUiEvent` prop of `<Tldraw>` is called for every action the default UI performs, whether it
came from a menu, the toolbar, or a keyboard shortcut. Each event has a name (see `TLUiEventMap`) and
data that includes a `source`. This example logs them on the right-hand side, alongside the editor
API call the UI made for that event, which makes it a useful way to learn the SDK.

Try selecting tools, changing styles, aligning shapes, or using undo/redo. UI events fire only for
UI interactions; calling `editor.alignShapes()` yourself won't trigger one. For pointer and keyboard
input see the canvas events example, and for document changes see the store events example.
