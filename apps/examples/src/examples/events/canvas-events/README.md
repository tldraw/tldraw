---
title: Canvas events
component: ./CanvasEventsExample.tsx
priority: 1
keywords:
  [
    events,
    pointer events,
    mouse events,
    click,
    keyboard events,
    canvas events,
    event listeners,
    tleventinfo,
    editor.on,
  ]
---

Log the pointer, keyboard, and other input events the editor dispatches to its tools.

---

The editor is an event emitter. Subscribing to `editor.on('event', handler)` gives you every
`TLEventInfo` the editor processes: pointer, keyboard, wheel, pinch, click, and tick events. This
example keeps the most recent event of each type and shows them on the right-hand side.

Try moving your cursor, dragging, and holding modifier keys, and watch the panel update. These are
input events, not document changes: to see shapes being created or deleted, look at the store events
example, and for high-level UI actions like tool selection, see the UI events example.
