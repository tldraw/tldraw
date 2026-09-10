---
title: Save and load snapshots
component: ./SnapshotExample.tsx
priority: 0
keywords:
  [
    snapshot,
    save,
    load,
    getsnapshot,
    loadsnapshot,
    persistence,
    export,
    import,
    document,
    session,
    localstorage,
  ]
---

Save the editor's contents with `getSnapshot()` and restore them with `loadSnapshot()`.

---

`getSnapshot(editor.store)` returns a `{ document, session }` object: `document` holds the pages, shapes, and assets, and `session` holds per-user state like the current page, camera, and selection. `loadSnapshot(editor.store, snapshot)` restores either or both. The editor here starts from a bundled snapshot passed to the `snapshot` prop.

Draw something, click "Save snapshot", change the canvas, then click "Load snapshot" to restore it from localStorage.
