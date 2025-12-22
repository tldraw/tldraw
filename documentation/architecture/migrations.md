---
title: Migrations
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - migrations
  - schema
  - versioning
  - upgrades
  - compatibility
---

The migration system transforms store records between schema versions. A schema version is recorded alongside persisted data; when a snapshot is loaded or synced, migrations bridge the gap between the saved versions and the current schema. This keeps older documents readable and enables cross-version multiplayer.

## Key components

### Migration sequences

A migration sequence is an ordered list of transformations for a schema area. Each migration has a unique ID and a version number:

```typescript
const arrowVersions = createMigrationIds('com.tldraw.shape.arrow', {
	AddLabelColor: 1,
	AddIsPrecise: 2,
	ExtractBindings: 3,
})
```

Sequences are created with a `retroactive` flag that controls whether migrations apply to data created before the sequence existed.

### Migration scopes

Migrations run at three scopes:

- **Record**: transforms one record at a time (sync-friendly).
- **Store**: transforms the whole serialized store at once.
- **Storage**: transforms the underlying storage map, creating or deleting records as needed.

A record-scoped migration with an up/down pair looks like:

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
	},
}
```

Storage migrations are one-way only, and store migrations are not applied during per-record sync.

### Ordering and dependencies

The migration runner collects all migrations between saved and current versions, then sorts them by sequence and declared dependencies. This ensures store and storage migrations run before record migrations, and that dependent migrations run in the correct order.

## How migrations run

Snapshots store their schema versions alongside record data:

```typescript
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
```

On load, the schema compares the persisted versions to the current versions and applies any missing migrations in order.

## Multiplayer considerations

Down migrations allow newer clients to send data to older clients. If a down migration is no longer needed, it can be marked as retired. If a downgrade is not meaningful, set the down migration to `none` and the system will prevent that downgrade.

## Failure modes

The migration system reports specific failure reasons:

- `TargetVersionTooNew` - Downgrading past the oldest supported version
- `TargetVersionTooOld` - A store migration blocks per-record migration
- `MigrationError` - An exception occurred during migration execution
- `UnknownType` - The record type is not in the schema

## Writing good migrations

- Keep each migration focused on a single change.
- Provide defaults for new required fields.
- Avoid external state or time-dependent behavior.
- Test against real documents in addition to unit tests.

## Key files

- packages/store/src/lib/migrate.ts - Migration types and sorting algorithm
- packages/store/src/lib/StoreSchema.ts - Schema definition and migration execution
- packages/tlschema/src/store-migrations.ts - Store-level migrations for tldraw
- packages/tlschema/src/shapes/TLArrowShape.ts - Example of complex shape migrations

## Related

- [@tldraw/store](../packages/store.md) - Store package with migration infrastructure
- [@tldraw/tlschema](../packages/tlschema.md) - Schema definitions and built-in migrations
- [Store and records](./store-records.md) - How the store uses schemas and migrations
