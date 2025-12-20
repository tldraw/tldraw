---
title: IndexedDB migrations
created_at: 12/20/2025
updated_at: 12/20/2025
keywords:
  - IndexedDB
  - migrations
  - schema
  - persistence
  - versioning
---

# IndexedDB migrations

Server-side database migrations are straightforward: you control the environment, can test the migration in staging, and roll back if something goes wrong. Client-side migrations are different. When tldraw's data schema changes, the migration runs in the user's browser against data you've never seen. Users might have documents from any previous version. Some haven't opened tldraw in months. There's no staging environment for their data, and no rollback if the migration corrupts something.

This creates real constraints. You can't just add a required field and assume it exists—documents from 2023 won't have it. You can't change a data type without handling the old format. And you definitely can't afford migration bugs, because users lose work.

## Two layers of versioning

tldraw uses two distinct versioning systems that serve different purposes.

**IndexedDB versioning** handles the database structure: which object stores exist, their names, and how they're indexed. This is the browser's built-in mechanism. When you open a database with a higher version number than what's stored, the browser fires an `onupgradeneeded` event where you can create or modify stores.

**Store schema versioning** handles the data itself: the shape of records, their fields, and relationships. This is tldraw's custom migration system that transforms actual document data.

The distinction matters because they solve different problems. IndexedDB versioning answers "where do we put data?" Store schema versioning answers "what does the data look like?"

## Database structure

The IndexedDB layer is relatively simple. tldraw opens a database with four object stores:

```typescript
async function openLocalDb(persistenceKey: string) {
	return await openDB(storeId, 4, {
		upgrade(database) {
			if (!database.objectStoreNames.contains('records')) {
				database.createObjectStore('records')
			}
			if (!database.objectStoreNames.contains('schema')) {
				database.createObjectStore('schema')
			}
			if (!database.objectStoreNames.contains('session_state')) {
				database.createObjectStore('session_state')
			}
			if (!database.objectStoreNames.contains('assets')) {
				database.createObjectStore('assets')
			}
		},
	})
}
```

The upgrade handler is idempotent—it checks if each store exists before creating it. This handles all version jumps gracefully. A user jumping from version 1 to version 4 gets the same result as someone who upgraded incrementally through each version.

The current database version (4) has never needed destructive changes. Adding new stores is safe; removing or renaming them would break data. The comment at the top of the file makes this explicit:

```typescript
// DO NOT CHANGE THESE WITHOUT ADDING MIGRATION LOGIC.
// DOING SO WOULD WIPE ALL EXISTING DATA.
```

## Legacy asset migration

One exception to the simple upgrade path: tldraw used to store assets in a separate database. When consolidating to a single database, existing assets needed to move.

This runs before opening the main database:

```typescript
async function migrateLegacyAssetDbIfNeeded(persistenceKey: string) {
	// Check if old asset database exists
	const databases = await window.indexedDB.databases()
	const oldStoreId = 'TLDRAW_ASSET_STORE_v1' + persistenceKey
	const existing = databases.find((dbName) => dbName === oldStoreId)
	if (!existing) return

	// Read all assets from old database
	const oldAssetDb = await openDB(oldStoreId, 1)
	const oldAssets = await oldAssetDb.transaction('assets').store.getAll()

	// Write to new database
	const newDb = await openLocalDb(persistenceKey)
	const tx = newDb.transaction('assets', 'readwrite')
	for (const [key, value] of oldAssets) {
		tx.store.put(value, key)
	}
	await tx.done

	// Clean up
	oldAssetDb.close()
	await deleteDB(oldStoreId)
}
```

The old database is deleted only after the new one has the data. If the migration fails partway through, the old database remains intact and migration retries on the next load.

## Store schema migrations

The store schema layer handles more complex data transformations. Each migration has a scope that determines what it can access:

**Storage scope** operates on the entire store as a Map. Use this to delete record types or move data between records:

```typescript
{
	id: 'com.tldraw.store/1',
	scope: 'storage',
	up: (storage) => {
		for (const [id, record] of storage.entries()) {
			if (record.typeName === 'shape' && record.type === 'icon') {
				storage.delete(id)
			}
		}
	},
}
```

**Record scope** transforms individual records. The migration function receives each record and can modify it in place:

```typescript
{
	id: 'com.tldraw.store/5',
	scope: 'record',
	up: (record) => {
		if (record.typeName === 'shape' && 'index' in record) {
			// Fix fractional indices that end with 0
			if (record.index.endsWith('0') && record.index !== 'a0') {
				record.index = record.index.slice(0, -1) + getRandomSuffix()
			}
		}
	},
}
```

Record-scope migrations are more efficient for large documents—the system can skip records that don't match the type being migrated.

## Schema format evolution

Even the schema format itself has versioned. The original V1 format separated store version from record versions and handled subtypes explicitly:

```typescript
// V1 schema format
{
	schemaVersion: 1,
	storeVersion: 2,
	recordVersions: {
		shape: {
			version: 3,
			subTypeKey: 'type',
			subTypeVersions: { rectangle: 1, arrow: 2 }
		}
	}
}
```

The current V2 format uses a flat sequence-based approach:

```typescript
// V2 schema format
{
	schemaVersion: 2,
	sequences: {
		'com.tldraw.store': 5,
		'com.tldraw.shape': 3,
		'com.tldraw.shape.arrow': 2
	}
}
```

When loading data, the system upgrades V1 schemas to V2 before processing migrations. The conversion maps the old structure to the new format, preserving all version information.

## Migration ordering

Migrations can have dependencies. A migration that moves data from shape A to shape B must run after shape A is in the expected format. The migration system uses topological sorting to determine execution order:

1. Implicit ordering: `com.tldraw.store/1` runs before `com.tldraw.store/2`
2. Explicit dependencies: Migrations can declare `dependsOn` relationships
3. Circular dependency detection: The system fails fast if migrations can't be ordered

The sort uses Kahn's algorithm with distance minimization—when multiple orderings are valid, it prefers keeping related migrations together.

## Error handling

Migration failure returns a typed result rather than throwing:

```typescript
const migrationResult = store.schema.migrateStoreSnapshot({
	store: documentSnapshot,
	schema: data.schema,
})

if (migrationResult.type === 'error') {
	console.error('Failed to migrate:', migrationResult.reason)
	onLoadError(new Error(`Migration failed: ${migrationResult.reason}`))
	return
}
```

Failure reasons include:
- `IncompatibleSubtype`: Record has a subtype the current schema doesn't understand
- `UnknownType`: Record type doesn't exist in current schema
- `TargetVersionTooNew`: Data is from a newer version than current code supports
- `MigrationError`: Migration function threw an exception

When migration fails, the original data remains untouched in IndexedDB. The document doesn't load, but nothing is corrupted. Users can try again after updating to newer code, or as a last resort, use `hardReset()` to clear everything.

## Cross-tab schema conflicts

When multiple tabs are open, they might run different code versions. A tab opened before a deployment has an older schema than one opened after.

The system handles this through schema announcement. When tabs communicate via BroadcastChannel, each message includes the sender's schema. Recipients compare versions:

```typescript
const res = this.store.schema.getMigrationsSince(msg.schema)

if (!res.ok) {
	// We're older - reload to get new code
	window.location.reload()
} else if (res.value.length > 0) {
	// They're older - tell them to reload
	this.channel.postMessage({ type: 'announce', schema: this.serializedSchema })
}
```

The newer tab wins. Older tabs reload to get current code before they can corrupt data by writing in an outdated format. See [Cross-tab synchronization](./cross-tab-sync.md) for more on how tabs coordinate.

## The nuclear option

When all else fails, there's `hardReset()`:

```typescript
export async function hardReset({ shouldReload = true } = {}) {
	clearSessionStorage()
	for (const instance of LocalIndexedDb.connectedInstances) {
		await instance.close()
	}
	await Promise.all(getAllIndexDbNames().map((db) => deleteDB(db)))
	clearLocalStorage()
	if (shouldReload) window.location.reload()
}
```

This deletes all tldraw data and starts fresh. It's exposed in development builds and accessible programmatically. Users don't want to use it, but when migration fails catastrophically, starting over is better than a permanently broken document.

## Testing migrations

Migration code is hard to test because you need real data in old formats. tldraw's approach:
- Keep snapshots of documents from previous versions in test fixtures
- Run migrations against these fixtures and validate the output
- Test both success cases and graceful handling of corrupted data

The migration system also validates records after transformation. Even if a migration runs without throwing, invalid output fails validation and returns an error rather than persisting bad data.

## Key files

- `packages/editor/src/lib/utils/sync/LocalIndexedDb.ts` — IndexedDB persistence and database structure
- `packages/store/src/lib/StoreSchema.ts` — Store schema and migration application
- `packages/store/src/lib/migrate.ts` — Migration types, sorting, and execution
- `packages/tlschema/src/store-migrations.ts` — Store-level migrations for tldraw's data model
- `packages/editor/src/lib/utils/sync/TLLocalSyncClient.ts` — Loads data and applies migrations
- `packages/editor/src/lib/utils/sync/hardReset.ts` — Nuclear reset option

## Related

- [Cross-tab synchronization](./cross-tab-sync.md) — Schema version handling between tabs
- [Runtime validation](./runtime-validation.md) — Post-migration data validation
- [Sync](./sync.md) — How server-side sync handles schema differences
