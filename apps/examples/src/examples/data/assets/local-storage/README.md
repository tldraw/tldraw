---
title: Persist to storage
component: ./LocalStorageExample.tsx
priority: 0
keywords:
  [
    persistence,
    localstorage,
    save,
    load,
    snapshot,
    getsnapshot,
    loadsnapshot,
    createtlstore,
    store.listen,
    throttle,
  ]
---

Load and save the document yourself using `getSnapshot`, `loadSnapshot`, and `store.listen`.

---

The `persistenceKey` prop gives you local persistence for free, but if you want to save to your own backend you need to do the load/save loop yourself. This example does that against `localStorage`: it creates a store with `createTLStore`, loads a saved snapshot into it with `loadSnapshot` before the editor mounts, then uses a throttled `store.listen` callback to serialize the store with `getSnapshot` on every change.

Draw something, reload the page, and it will still be there. To reset, clear the `example-3` key from local storage in your browser's dev tools.
