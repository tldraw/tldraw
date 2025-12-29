---
title: IndexedDB migrations
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - IndexedDB
  - migrations
  - schema
status: published
date: 12/21/2025
order: 1
---

# IndexedDB migrations

When we need to change tldraw's data structure—adding properties, renaming fields, or restructuring records—we use migrations to transform existing documents. The system supports three types of migrations, each designed for different levels of access and complexity.

## Migration scopes

Migrations declare their scope to control how they access and transform data. The three scopes offer different tradeoffs between power and performance.

### Record scope

Record-scoped migrations transform individual records one at a time. This is the most efficient option for large documents because the migration system can filter and skip irrelevant records.

```typescript
{
  id: 'com.tldraw.shape.arrow/5',
  scope: 'record',
  filter: (record) => record.typeName === 'shape' && record.type === 'arrow',
  up: (arrow) => {
    arrow.props.scale = 1
  }
}
```

The `filter` function is optional. If provided, it runs first to determine whether a record needs migration. In this example, we only process arrow shapes, letting the system skip thousands of other records without cloning or modifying them.

The `up` function receives a cloned record and can either mutate it in place or return a new record. If it returns nothing, the mutation is used.

Record migrations can also include a `down` function for reverting changes, though we rarely use this since migrating backwards is uncommon in production.

### Storage scope

Storage-scoped migrations get direct access to the full storage layer as a Map-like interface. They can get, set, delete, and iterate over any record. We use this scope for complex operations that create new records, delete entire record types, or move data between records.

```typescript
{
  id: 'com.tldraw.store/1',
  scope: 'storage',
  up: (storage) => {
    for (const [id, record] of storage.entries()) {
      if (
        record.typeName === 'shape' &&
        'type' in record &&
        (record.type === 'icon' || record.type === 'code')
      ) {
        storage.delete(id)
      }
    }
  }
}
```

This migration removes two deprecated shape types by deleting their records. A record-scoped migration can't delete records—only modify them—so storage scope is necessary.

Storage migrations can't be reversed. There's no `down` function.

### Store scope (legacy)

Store-scoped migrations receive the entire document as a plain object (`Record<string, UnknownRecord>`). They're less efficient than record scope because the whole store must fit in memory as a JavaScript object.

```typescript
{
  id: 'com.tldraw.store/2',
  scope: 'store',
  up: (store) => {
    for (const [id, record] of Object.entries(store)) {
      if (shouldModify(record)) {
        store[id] = modifiedRecord
      }
    }
    return store
  }
}
```

We don't use store-scoped migrations anymore. They exist for backwards compatibility with older migration code. New migrations should use record or storage scope instead.

## Creating new records

The most interesting use of storage scope is creating records from data that used to live elsewhere. When we introduced bindings (relationships between shapes), we migrated arrow shapes from storing binding data in their props to creating separate binding records.

Before the migration, arrow shapes looked like this:

```typescript
{
  type: 'arrow',
  props: {
    start: {
      type: 'binding',
      boundShapeId: 'shape:abc123',
      normalizedAnchor: { x: 0.5, y: 0.5 },
      isExact: false,
      isPrecise: true
    },
    end: { x: 100, y: 100 }
  }
}
```

After the migration, binding data lives in separate records:

```typescript
// Arrow shape
{
  type: 'arrow',
  props: {
    start: { x: 0, y: 0 },
    end: { x: 100, y: 100 }
  }
}

// Binding record
{
  typeName: 'binding',
  id: 'binding:xyz789',
  type: 'arrow',
  fromId: 'shape:arrow123',
  toId: 'shape:abc123',
  props: {
    terminal: 'start',
    normalizedAnchor: { x: 0.5, y: 0.5 },
    isExact: false,
    isPrecise: true
  }
}
```

The migration extracts binding data from arrow props and creates new binding records:

```typescript
{
  id: arrowShapeVersions.ExtractBindings,
  scope: 'storage',
  up: (storage) => {
    for (const record of storage.values()) {
      if (record.typeName !== 'shape' || record.type !== 'arrow') continue

      const arrow = record
      const newArrow = structuredClone(arrow)
      const { start, end } = arrow.props

      if (start.type === 'binding') {
        const id = createBindingId()
        const binding = {
          typeName: 'binding',
          id,
          type: 'arrow',
          fromId: arrow.id,
          toId: start.boundShapeId,
          meta: {},
          props: {
            terminal: 'start',
            normalizedAnchor: start.normalizedAnchor,
            isExact: start.isExact,
            isPrecise: start.isPrecise,
          },
        }

        storage.set(id, binding)
        newArrow.props.start = { x: 0, y: 0 }
      } else {
        delete newArrow.props.start.type
      }

      if (end.type === 'binding') {
        // Same logic for end terminal
      }

      storage.set(arrow.id, newArrow)
    }
  }
}
```

This migration does three things a record-scoped migration can't:

1. Creates new records (bindings)
2. Generates new IDs
3. Establishes relationships between records by ID

Record scope can only see and modify one record at a time. Storage scope sees the full document as a mutable Map.

## When to use each scope

Use **record scope** for most migrations. It's the fastest option and handles almost everything: adding properties, renaming fields, transforming values, and updating nested data. If you only need to modify existing records, use record scope.

Use **storage scope** when you need to:

- Create new records
- Delete records or entire record types
- Move data between records
- Establish new relationships by ID

Use **store scope** never. It's legacy code kept for backwards compatibility.

## Migration failure

Migrations can fail if the stored schema is newer than the code's schema. This happens when a user opens a document in an older version of tldraw after creating it in a newer version.

When this occurs, the system checks whether all required migrations are record-scoped. If they are, it attempts to migrate backwards using the `down` functions. If any migration lacks a `down` function or uses store/storage scope, the migration fails and the document can't load.

The error includes the failure reason—`TargetVersionTooNew`, `TargetVersionTooOld`, `MigrationError`, etc.—which the application can use to show an appropriate message.

Cross-tab sync has similar logic. When a tab receives a message from another tab, it checks the schema version. If the other tab is older, the current tab sends an "announce" message telling the other tab to reload. If the other tab is newer, the current tab reloads itself.

We don't try to migrate on every message. That would be wasteful. Instead, we detect version mismatches and force the out-of-date tab to reload with fresh code.

## Source files

The migration system lives in several files:

- `/packages/store/src/lib/migrate.ts` - Migration types, sorting, and validation
- `/packages/store/src/lib/StoreSchema.ts` - Schema class and migration application
- `/packages/editor/src/lib/utils/sync/TLLocalSyncClient.ts` - Loading and cross-tab sync
- `/packages/editor/src/lib/utils/sync/LocalIndexedDb.ts` - IndexedDB interface
- `/packages/tlschema/src/store-migrations.ts` - Store-level migrations
- `/packages/tlschema/src/shapes/TLArrowShape.ts` - Example shape migrations including ExtractBindings
