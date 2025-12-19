---
title: Migrations
created_at: 12/17/2024
updated_at: 12/19/2024
keywords:
  - migrations
  - schema
  - versioning
  - upgrades
  - compatibility
---

The migration system transforms tldraw documents between schema versions. It exists because applications evolve—shapes gain new properties, data structures change, deprecated features get removed—but user data persists. Without migrations, a document saved in January would become unreadable by February's release.

## The problem

Consider a simple scenario: you ship an arrow shape with `start` and `end` properties. Later, you want to add a `labelColor` property. What happens to existing arrows that don't have this property?

Without a migration system, you have limited options:

1. **Make everything optional**: Every property becomes optional, scattering null checks throughout your code
2. **Break old documents**: Users lose their work
3. **Never change anything**: Your application can't evolve

Migrations solve this by transforming old data into the new format automatically. When a user opens an old document, the migration system detects the version mismatch, applies the necessary transformations, and presents the data as if it were always in the new format.

## Core concepts

### Migration sequences

A migration sequence is an ordered list of transformations for a particular part of your schema. Each migration has a unique ID and a version number:

```typescript
const arrowVersions = createMigrationIds('com.tldraw.shape.arrow', {
	AddLabelColor: 1,
	AddIsPrecise: 2,
	ExtractBindings: 3,
})
```

The ID `'com.tldraw.shape.arrow/1'` identifies the first migration in the arrow sequence. When data is saved, the store records which version of each sequence it was saved with. When data is loaded, the system compares those versions against the current schema and applies any migrations in between.

### The retroactive flag

When you create a migration sequence, you must decide: should this sequence apply to data that was created before this sequence existed?

```typescript
const myMigrations = createMigrationSequence({
	sequenceId: 'com.myapp/features',
	retroactive: true, // Apply to ALL old data
	sequence: [...]
})
```

Set `retroactive: true` when your migrations should apply universally—this is typical for library code where you can't know what version the user's data was created with. Set `retroactive: false` when you're adding new features that only make sense for data explicitly created with your app.

### Bidirectional migrations

Each migration defines an `up` function (old → new) and optionally a `down` function (new → old):

```typescript
{
  id: versions.AddLabelColor,
  up: (props) => {
    props.labelColor = 'black'
  },
  down: (props) => {
    delete props.labelColor
  }
}
```

Down migrations exist primarily for multiplayer scenarios. When a newer client sends data to an older client, the system applies down migrations so the older client can understand the data. Without down migrations, older clients would receive properties they don't recognize.

You can mark a down migration as `'retired'` once enough time has passed that no clients need it anymore, or `'none'` if downgrading isn't meaningful for that migration.

## Migration scopes

Migrations operate at three different levels, each suited to different kinds of changes.

### Record scope

Record-scoped migrations transform individual records independently. They're the most common type:

```typescript
{
  id: versions.AddScale,
  scope: 'record',
  filter: (record) => record.typeName === 'shape' && record.type === 'draw',
  up: (record) => {
    record.props.scale = 1
  },
  down: (record) => {
    delete record.props.scale
  }
}
```

The `filter` function determines which records this migration applies to. The migration runs once per matching record, allowing the system to migrate records individually—which matters for sync, where records arrive one at a time.

### Store scope

Store-scoped migrations transform the entire serialized store at once. Use them when you need to see multiple records together:

```typescript
{
  id: versions.ConsolidateSettings,
  scope: 'store',
  up: (store) => {
    const settings = Object.values(store).filter(r => r.typeName === 'setting')
    if (settings.length > 1) {
      const consolidated = mergeSettings(settings)
      settings.forEach(s => delete store[s.id])
      store[consolidated.id] = consolidated
    }
  }
}
```

Store migrations are more powerful but have limitations: they can't be applied to individual records arriving via sync, and they make down migrations more complex.

### Storage scope

Storage-scoped migrations have direct mutable access to the underlying storage. They're used for complex transformations that need to create new records while modifying existing ones:

```typescript
{
  id: versions.ExtractBindings,
  scope: 'storage',
  up: (storage) => {
    for (const [id, record] of storage.entries()) {
      if (record.typeName === 'shape' && record.type === 'arrow') {
        // Extract binding info from arrow
        const bindings = extractBindings(record)
        // Create new binding records
        for (const binding of bindings) {
          storage.set(binding.id, binding)
        }
        // Update arrow to reference bindings
        record.props.start = { type: 'point', ... }
      }
    }
  }
}
```

Storage migrations are one-way only—they cannot have down migrations because the transformations may not be reversible.

## How migrations run

When you load a snapshot, the schema compares the persisted version numbers against the current schema:

```typescript
// Saved data includes its schema versions
const snapshot = {
	schema: {
		sequences: {
			'com.tldraw.shape.arrow': 1,
			'com.tldraw.store': 3,
		},
	},
	store: {
		/* records */
	},
}

// Current schema is at arrow/3, store/5
// System will apply: arrow/2, arrow/3, store/4, store/5
```

The migration runner collects all migrations between the persisted versions and current versions, sorts them respecting any dependency declarations, then applies them in order. Store and storage scope migrations run first (in sequence order), then record migrations run on the transformed data.

### Dependency ordering

Sometimes migrations must run in a specific order. You can declare dependencies explicitly:

```typescript
{
  id: 'com.myapp/feature/2',
  dependsOn: ['com.myapp/store/3'],  // Must run after store/3
  up: (record) => { ... }
}
```

The system topologically sorts migrations to respect these dependencies while maintaining sequence order within each migration sequence.

## Common migration patterns

### Adding a new property

The most common migration—add a property with a sensible default:

```typescript
{
  id: versions.AddCreatedAt,
  up: (record) => {
    record.createdAt = Date.now()
  },
  down: (record) => {
    delete record.createdAt
  }
}
```

### Renaming a property

Transform the property name while preserving the value:

```typescript
{
  id: versions.RenameColorToFill,
  up: (record) => {
    record.props.fill = record.props.color
    delete record.props.color
  },
  down: (record) => {
    record.props.color = record.props.fill
    delete record.props.fill
  }
}
```

### Computing a new property from existing data

Derive the new value from what's already there:

```typescript
{
  id: versions.AddIsPrecise,
  up: (record) => {
    // Calculate isPrecise from the anchor position
    const isCenter = record.props.anchor.x === 0.5 &&
                     record.props.anchor.y === 0.5
    record.props.isPrecise = !isCenter
  },
  down: (record) => {
    delete record.props.isPrecise
  }
}
```

### Removing a deprecated type

Use a storage migration to delete records that are no longer supported:

```typescript
{
  id: versions.RemoveIconShape,
  scope: 'storage',
  up: (storage) => {
    for (const [id, record] of storage.entries()) {
      if (record.typeName === 'shape' && record.type === 'icon') {
        storage.delete(id)
      }
    }
  }
}
```

### Defensive migration

Handle potentially malformed data that may exist in the wild:

```typescript
{
  id: versions.NormalizeItems,
  up: (record) => {
    // Old versions might have null, undefined, or non-array values
    record.items = Array.isArray(record.items) ? record.items : []
    record.settings = record.settings ?? {}
  }
}
```

## Multiplayer considerations

In a multiplayer environment, different clients may be running different versions of your application. The migration system handles this by transforming records as they flow between clients.

When a newer client sends a record to an older client:

1. The system identifies the version gap
2. It applies down migrations to transform the record to the older format
3. The older client receives data it can understand

When an older client sends a record to a newer client:

1. The system identifies the version gap
2. It applies up migrations to transform the record to the newer format
3. The newer client receives properly migrated data

This works seamlessly for record-scoped migrations. Store and storage migrations are more complex because they require seeing the entire store—they typically run once when the client first connects and receives the full state.

## When migrations fail

The migration system reports failures with specific reasons:

- **`TargetVersionTooNew`**: You're trying to downgrade past the oldest supported version (no down migration available)
- **`TargetVersionTooOld`**: A store migration is in the path and you're trying to migrate a single record
- **`MigrationError`**: An exception was thrown during migration execution
- **`UnknownType`**: The record type doesn't exist in the schema

You can handle validation failures during migration by providing an `onValidationFailure` callback to your schema:

```typescript
const schema = StoreSchema.create(myRecordTypes, {
	onValidationFailure: ({ phase, record, error }) => {
		if (phase === 'migrate') {
			// Return a corrected record or throw
			return sanitizeRecord(record)
		}
		throw error
	},
})
```

## Writing good migrations

**Keep migrations focused**: Each migration should do one thing. If you're tempted to add multiple properties in one migration, consider whether they're truly coupled or should be separate migrations.

**Always provide defaults**: When adding required properties, provide sensible defaults. Users shouldn't see validation errors from old documents.

**Test with real data**: Unit tests are necessary but not sufficient. Test your migrations against actual user documents to catch edge cases.

**Consider the down path**: Even if you don't implement a down migration, think through what downgrading would mean. If information would be lost, document that.

**Don't depend on external state**: Migrations should be pure transformations. Don't fetch data, don't check timestamps, don't rely on global state. The same input should always produce the same output.

## Key files

| File                                           | Purpose                                   |
| ---------------------------------------------- | ----------------------------------------- |
| `packages/store/src/lib/migrate.ts`            | Migration types and sorting algorithm     |
| `packages/store/src/lib/StoreSchema.ts`        | Schema definition and migration execution |
| `packages/tlschema/src/store-migrations.ts`    | Store-level migrations for tldraw         |
| `packages/tlschema/src/shapes/TLArrowShape.ts` | Example of complex shape migrations       |

## Related

- [@tldraw/store](../packages/store.md) - Store package with migration infrastructure
- [@tldraw/tlschema](../packages/tlschema.md) - Schema definitions and built-in migrations
- [Store and records](./store-records.md) - How the store uses schemas and migrations
