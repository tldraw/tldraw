---
title: Custom shape migrations
component: ./ShapeWithMigrationsExample.tsx
priority: 3
keywords:
  [
    migrations,
    schema versioning,
    createshapepropsmigrationids,
    createshapepropsmigrationsequence,
    up,
    down,
    backwards compatibility,
    data migration,
  ]
---

Migrate a custom shape's props between versions with a migration sequence.

---

When you change a custom shape's props, documents saved with the old version still contain the old shape data. Migrations let the editor upgrade (or downgrade) that data as it loads, so old documents keep working. This example loads a snapshot containing a shape saved before it had a `color` prop; the shape util's `migrations` (built with `createShapePropsMigrationIds` and `createShapePropsMigrationSequence`) add the missing prop when the snapshot loads.

Read the guide at the bottom of the example file for how the editor decides which migrations to run.
