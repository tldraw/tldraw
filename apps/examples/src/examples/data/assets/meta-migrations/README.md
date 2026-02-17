---
title: Meta migrations
component: ./MetaMigrations.tsx
priority: 6
keywords:
  [
    migrations,
    meta,
    schema,
    createmigrationids,
    createmigrationsequence,
    versioning,
    upgrade,
    snapshot,
  ]
related: [meta-on-create, meta-on-change, shape-with-migrations, snapshots, local-storage]
---

Create custom migrations for `meta` properties.

---

You can add arbitrary data migrations for tldraw snapshot data. This is mainly useful for updating the `meta` property of a record as your data types evolve.
