---
title: Custom library source
component: ./LibrariesLocalStorageExample.tsx
priority: 13
keywords: [libraries, library, source, backend, localStorage, persistence, LibrarySource, packs]
---

Implement `LibrarySource` to keep libraries in your own backend.

---

The libraries UI reads and writes through the `LibrarySource` interface, so any backend can sit behind it. This source saves to `localStorage` and waits a moment on every write, as if it went to a server. Reads come from an atom, so the panel updates once a write lands. Reload the page and the libraries are still there.

The panel's ⋯ menu has an item per pack that copies it into a new library with `copyPack`.
