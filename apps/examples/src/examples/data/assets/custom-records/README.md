---
title: Custom records
component: ./CustomRecordsExample.tsx
priority: 1
keywords: [record, store, custom, data, migrations, validator, tlglobalrecordpropsmap]
---

Store your own record types in the tldraw store so they persist, sync, and migrate alongside shapes.

---

Not all app data is a shape, binding, or asset. This example registers a "marker" record type, a pin at a page position with a label and icon, using the `records` option of `createTLStore`. A `CustomRecordInfo` supplies the scope, a validator, migrations (built with `createCustomRecordMigrationIds` and `createCustomRecordMigrationSequence`), and default properties. Augmenting `TLGlobalRecordPropsMap` makes the new type part of `TLRecord`, so store reads and writes are fully typed.

The markers are rendered in the `InFrontOfTheCanvas` slot from a reactive `store.query.records('marker')` query. Press "Add marker" to drop one at the center of the viewport, pan around to see it stay put on the page, and right-click or ctrl-click a marker to remove it.
