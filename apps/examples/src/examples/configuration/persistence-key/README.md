---
title: Persistence key
component: ./PersistenceKeyExample.tsx
priority: 1
keywords:
  [persistence, local storage, save state, persistencekey, indexeddb, session storage, auto save]
related: [local-storage, snapshots, multiple, meta-migrations, unsaved-changes]
---

Persist the editor's content between sessions by using a persistence key.

---

If the `persistenceKey` prop is provided to the `<Tldraw/>` component, the editor will persist its data locally under that key.
