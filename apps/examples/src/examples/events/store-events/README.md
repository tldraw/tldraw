---
title: Store events
component: ./StoreEventsExample.tsx
priority: 1
keywords:
  [
    store,
    events,
    listen,
    changes,
    transactions,
    added,
    updated,
    removed,
    tleventmaphandler,
    subscribe,
  ]
---

Listen to store changes and log shape creates, updates, deletes, and page switches.

---

`editor.store.listen` calls your handler once per transaction with a `HistoryEntry` describing the
records that were added, updated, and removed. This example subscribes from `onMount`, filters to
changes made by the local user, and turns the entries it cares about into readable lines in the
panel on the right.

Try creating and deleting shapes, changing their styles, or switching pages. Store events cover
document changes, not input: for pointer and keyboard events see the canvas events example, and for
high-level UI actions see the UI events example. To react to changes with side effects rather than
just observe them, see the side effects examples.
