---
title: IndexedDB migrations - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - indexeddb
  - migrations
status: published
date: 12/21/2025
order: 3
---

# IndexedDB migrations: raw notes

Internal research notes for the indexeddb-migrations.md article.

## Database structure constants

From `/packages/editor/src/lib/utils/sync/LocalIndexedDb.ts:7-18`:

```typescript
// DO NOT CHANGE THESE WITHOUT ADDING MIGRATION LOGIC. DOING SO WOULD WIPE ALL EXISTING DATA.
const STORE_PREFIX = 'TLDRAW_DOCUMENT_v2'
const LEGACY_ASSET_STORE_PREFIX = 'TLDRAW_ASSET_STORE_v1'
const dbNameIndexKey = 'TLDRAW_DB_NAME_INDEX_v2'

export const Table = {
	Records: 'records',
	Schema: 'schema',
	SessionState: 'session_state',
	Assets: 'assets',
} as const
```

**Four object stores:**

1. `records` - Document records (shapes, pages, etc.)
2. `schema` - Serialized schema version information
3. `session_state` - Per-session state snapshots
4. `assets` - Asset files (images, videos, etc.)

## Database versioning

From `/packages/editor/src/lib/utils/sync/LocalIndexedDb.ts:23-44`:

```typescript
async function openLocalDb(persistenceKey: string) {
	const storeId = STORE_PREFIX + persistenceKey
	addDbName(storeId)

	return await openDB<StoreName>(storeId, 4, {
		upgrade(database) {
			if (!database.objectStoreNames.contains(Table.Records)) {
				database.createObjectStore(Table.Records)
			}
			if (!database.objectStoreNames.contains(Table.Schema)) {
				database.createObjectStore(Table.Schema)
			}
			if (!database.objectStoreNames.contains(Table.SessionState)) {
				database.createObjectStore(Table.SessionState)
			}
			if (!database.objectStoreNames.contains(Table.Assets)) {
				database.createObjectStore(Table.Assets)
			}
		},
	})
}
```

**Version number**: 4 (hardcoded in `openDB` call)
**Upgrade strategy**: Idempotent checks - only creates stores if they don't exist
**Result**: User jumping from v1 to v4 gets same outcome as incremental upgrades

## Legacy asset database migration

From `/packages/editor/src/lib/utils/sync/LocalIndexedDb.ts:46-83`:

```typescript
async function migrateLegacyAssetDbIfNeeded(persistenceKey: string) {
	const databases = window.indexedDB.databases
		? (await window.indexedDB.databases()).map((db) => db.name)
		: getAllIndexDbNames()
	const oldStoreId = LEGACY_ASSET_STORE_PREFIX + persistenceKey
	const existing = databases.find((dbName) => dbName === oldStoreId)
	if (!existing) return

	const oldAssetDb = await openDB<StoreName>(oldStoreId, 1, {
		upgrade(database) {
			if (!database.objectStoreNames.contains('assets')) {
				database.createObjectStore('assets')
			}
		},
	})
	if (!oldAssetDb.objectStoreNames.contains('assets')) return

	const oldTx = oldAssetDb.transaction(['assets'], 'readonly')
	const oldAssetStore = oldTx.objectStore('assets')
	const oldAssetsKeys = await oldAssetStore.getAllKeys()
	const oldAssets = await Promise.all(
		oldAssetsKeys.map(async (key) => [key, await oldAssetStore.get(key)] as const)
	)
	await oldTx.done

	const newDb = await openLocalDb(persistenceKey)
	const newTx = newDb.transaction([Table.Assets], 'readwrite')
	const newAssetTable = newTx.objectStore(Table.Assets)
	for (const [key, value] of oldAssets) {
		newAssetTable.put(value, key)
	}
	await newTx.done

	oldAssetDb.close()
	newDb.close()

	await deleteDB(oldStoreId)
}
```

**Migration flow:**

1. Check if old database (`TLDRAW_ASSET_STORE_v1` + persistenceKey) exists
2. If exists, open old database and read all assets
3. Open new database and write all assets to new location
4. Close both databases
5. Delete old database only after successful write
6. If migration fails partway, old database remains intact for retry

**Safety**: Old database is deleted only after successful migration. Partial failures preserve data.

## Schema version formats

### V1 Format (Legacy)

From `/packages/store/src/lib/StoreSchema.ts:26-72`:

```typescript
export interface SerializedSchemaV1 {
	schemaVersion: 1
	storeVersion: number
	recordVersions: Record<
		string,
		| {
				version: number
		  }
		| {
				version: number
				subTypeVersions: Record<string, number>
				subTypeKey: string
		  }
	>
}
```

**Example V1 schema:**

```typescript
{
  schemaVersion: 1,
  storeVersion: 2,
  recordVersions: {
    book: { version: 3 },
    shape: {
      version: 2,
      subTypeVersions: { rectangle: 1, circle: 2 },
      subTypeKey: 'type'
    }
  }
}
```

**Structure:**

- `storeVersion` - Version for store-level structure changes
- `recordVersions` - Version for each record type
- `subTypeVersions` - Version for shape/asset subtypes (rectangle, arrow, etc.)
- `subTypeKey` - Field name used to determine subtype ('type' for shapes)

### V2 Format (Current)

From `/packages/store/src/lib/StoreSchema.ts:74-101`:

```typescript
export interface SerializedSchemaV2 {
	schemaVersion: 2
	sequences: {
		[sequenceId: string]: number
	}
}
```

**Example V2 schema:**

```typescript
{
  schemaVersion: 2,
  sequences: {
    'com.tldraw.store': 3,
    'com.tldraw.book': 2,
    'com.tldraw.shape': 4,
    'com.tldraw.shape.rectangle': 1
  }
}
```

**Structure:**

- Flat key-value mapping of sequence IDs to version numbers
- Each sequence ID is namespaced (e.g., 'com.tldraw.store', 'com.tldraw.shape.arrow')
- Version number is the last migration applied for that sequence

### V1 to V2 Upgrade

From `/packages/store/src/lib/StoreSchema.ts:155-174`:

```typescript
export function upgradeSchema(schema: SerializedSchema): Result<SerializedSchemaV2, string> {
	if (schema.schemaVersion > 2 || schema.schemaVersion < 1) return Result.err('Bad schema version')
	if (schema.schemaVersion === 2) return Result.ok(schema as SerializedSchemaV2)
	const result: SerializedSchemaV2 = {
		schemaVersion: 2,
		sequences: {
			'com.tldraw.store': schema.storeVersion,
		},
	}

	for (const [typeName, recordVersion] of Object.entries(schema.recordVersions)) {
		result.sequences[`com.tldraw.${typeName}`] = recordVersion.version
		if ('subTypeKey' in recordVersion) {
			for (const [subType, version] of Object.entries(recordVersion.subTypeVersions)) {
				result.sequences[`com.tldraw.${typeName}.${subType}`] = version
			}
		}
	}
	return Result.ok(result)
}
```

**Conversion rules:**

- `storeVersion` → `com.tldraw.store`
- `recordVersions.book.version` → `com.tldraw.book`
- `recordVersions.shape.subTypeVersions.rectangle` → `com.tldraw.shape.rectangle`

## Migration scopes

From `/packages/store/src/lib/migrate.ts:199-229`:

```typescript
export type Migration = {
	readonly id: MigrationId
	readonly dependsOn?: readonly MigrationId[] | undefined
} & (
	| {
			readonly scope: 'record'
			readonly filter?: (record: UnknownRecord) => boolean
			readonly up: (oldState: UnknownRecord) => void | UnknownRecord
			readonly down?: (newState: UnknownRecord) => void | UnknownRecord
	  }
	| {
			readonly scope: 'store'
			readonly up: (
				oldState: SerializedStore<UnknownRecord>
			) => void | SerializedStore<UnknownRecord>
			readonly down?: (
				newState: SerializedStore<UnknownRecord>
			) => void | SerializedStore<UnknownRecord>
	  }
	| {
			readonly scope: 'storage'
			readonly up: (storage: SynchronousRecordStorage<UnknownRecord>) => void
			readonly down?: never
	  }
)
```

### Record scope

**Purpose**: Transform individual records
**Access**: Single record at a time
**Optional filter**: Can target specific record types or conditions
**Performance**: Most efficient for large documents (can skip irrelevant records)

**Example from `/packages/tlschema/src/store-migrations.ts:116-138`:**

```typescript
{
	id: Versions.FixIndexKeys,
	scope: 'record',
	up: (record) => {
		if (['shape', 'page'].includes(record.typeName) && 'index' in record) {
			const recordWithIndex = record as TLShape | TLPage
			if (recordWithIndex.index.endsWith('0') && recordWithIndex.index !== 'a0') {
				recordWithIndex.index = (recordWithIndex.index.slice(0, -1) +
					getNRandomBase62Digits(3)) as IndexKey
			}
			if (record.typeName === 'shape' && (recordWithIndex as TLShape).type === 'line') {
				const lineShape = recordWithIndex as TLLineShape
				for (const [_, point] of objectMapEntries(lineShape.props.points)) {
					if (point.index.endsWith('0') && point.index !== 'a0') {
						point.index = (point.index.slice(0, -1) + getNRandomBase62Digits(3)) as IndexKey
					}
				}
			}
		}
	},
}
```

### Store scope (legacy)

**Purpose**: Transform entire serialized store as plain object
**Access**: Full store as `Record<string, UnknownRecord>`
**Performance**: Requires full store in memory
**Status**: Considered legacy, prefer record or storage scope

**Example structure:**

```typescript
{
	id: 'com.tldraw.store/1',
	scope: 'store',
	up: (store) => {
		// store is Record<string, UnknownRecord>
		for (const [id, record] of Object.entries(store)) {
			if (shouldModify(record)) {
				store[id] = modifiedRecord
			}
		}
		return store
	},
}
```

### Storage scope

**Purpose**: Direct access to storage layer for complex operations
**Access**: Full Map-like interface with get/set/delete/entries
**Use cases**: Deleting record types, creating new records, moving data between records
**No down migration**: Storage migrations can't be reversed

**Example from `/packages/tlschema/src/store-migrations.ts:68-81`:**

```typescript
{
	id: Versions.RemoveCodeAndIconShapeTypes,
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
	},
}
```

## Migration ID format

From `/packages/store/src/lib/migrate.ts:173`:

```typescript
export type MigrationId = `${string}/${number}`
```

**Format**: `sequenceId/version`
**Examples:**

- `com.tldraw.store/1`
- `com.tldraw.shape/5`
- `com.tldraw.shape.arrow/2`

### Parsing migration IDs

From `/packages/store/src/lib/migrate.ts:456-459`:

```typescript
export function parseMigrationId(id: MigrationId): { sequenceId: string; version: number } {
	const [sequenceId, version] = id.split('/')
	return { sequenceId, version: parseInt(version) }
}
```

## Migration ordering and dependencies

From `/packages/store/src/lib/migrate.ts:337-439`:

```typescript
export function sortMigrations(migrations: Migration[]): Migration[] {
	if (migrations.length === 0) return []

	// Build dependency graph and calculate in-degrees
	const byId = new Map(migrations.map((m) => [m.id, m]))
	const dependents = new Map<MigrationId, Set<MigrationId>>()
	const inDegree = new Map<MigrationId, number>()
	const explicitDeps = new Map<MigrationId, Set<MigrationId>>()

	// Initialize
	for (const m of migrations) {
		inDegree.set(m.id, 0)
		dependents.set(m.id, new Set())
		explicitDeps.set(m.id, new Set())
	}

	// Add implicit sequence dependencies and explicit dependencies
	for (const m of migrations) {
		const { version, sequenceId } = parseMigrationId(m.id)

		// Implicit dependency on previous in sequence
		const prevId = `${sequenceId}/${version - 1}` as MigrationId
		if (byId.has(prevId)) {
			dependents.get(prevId)!.add(m.id)
			inDegree.set(m.id, inDegree.get(m.id)! + 1)
		}

		// Explicit dependencies
		if (m.dependsOn) {
			for (const depId of m.dependsOn) {
				if (byId.has(depId)) {
					dependents.get(depId)!.add(m.id)
					explicitDeps.get(m.id)!.add(depId)
					inDegree.set(m.id, inDegree.get(m.id)! + 1)
				}
			}
		}
	}

	// Priority queue: migrations ready to process (in-degree 0)
	const ready = migrations.filter((m) => inDegree.get(m.id) === 0)
	const result: Migration[] = []
	const processed = new Set<MigrationId>()

	while (ready.length > 0) {
		// Calculate urgency scores for ready migrations
		let bestCandidate: Migration | undefined
		let bestCandidateScore = -Infinity

		for (const m of ready) {
			let urgencyScore = 0

			for (const depId of dependents.get(m.id) || []) {
				if (!processed.has(depId)) {
					// Priority 1: Count all unprocessed dependents
					urgencyScore += 1

					// Priority 2: If explicitly depended on, boost priority
					if (explicitDeps.get(depId)!.has(m.id)) {
						urgencyScore += 100
					}
				}
			}

			if (
				urgencyScore > bestCandidateScore ||
				(urgencyScore === bestCandidateScore && m.id.localeCompare(bestCandidate?.id ?? '') < 0)
			) {
				bestCandidate = m
				bestCandidateScore = urgencyScore
			}
		}

		const nextMigration = bestCandidate!
		ready.splice(ready.indexOf(nextMigration), 1)

		result.push(nextMigration)
		processed.add(nextMigration.id)

		// Update in-degrees and add newly ready migrations
		for (const depId of dependents.get(nextMigration.id) || []) {
			if (!processed.has(depId)) {
				inDegree.set(depId, inDegree.get(depId)! - 1)
				if (inDegree.get(depId) === 0) {
					ready.push(byId.get(depId)!)
				}
			}
		}
	}

	// Check for cycles
	if (result.length !== migrations.length) {
		const unprocessed = migrations.filter((m) => !processed.has(m.id))
		assert(false, `Circular dependency in migrations: ${unprocessed[0].id}`)
	}

	return result
}
```

**Algorithm**: Kahn's topological sort with distance minimization
**Dependencies:**

1. **Implicit**: `com.tldraw.store/1` must run before `com.tldraw.store/2`
2. **Explicit**: Via `dependsOn` property

**Priority scoring:**

- Base score: Number of unprocessed dependents (+1 per dependent)
- Boost: +100 if explicitly depended upon by another migration
- Tiebreaker: Lexicographic order of migration IDs

**Circular dependency detection**: If not all migrations are processed, throws error with first unprocessed migration ID

## Migration validation

From `/packages/store/src/lib/migrate.ts:492-519`:

```typescript
export function validateMigrations(migrations: MigrationSequence) {
	assert(
		!migrations.sequenceId.includes('/'),
		`sequenceId cannot contain a '/', got ${migrations.sequenceId}`
	)
	assert(migrations.sequenceId.length, 'sequenceId must be a non-empty string')

	if (migrations.sequence.length === 0) {
		return
	}

	validateMigrationId(migrations.sequence[0].id, migrations.sequenceId)
	let n = parseMigrationId(migrations.sequence[0].id).version
	assert(
		n === 1,
		`Expected the first migrationId to be '${migrations.sequenceId}/1' but got '${migrations.sequence[0].id}'`
	)
	for (let i = 1; i < migrations.sequence.length; i++) {
		const id = migrations.sequence[i].id
		validateMigrationId(id, migrations.sequenceId)
		const m = parseMigrationId(id).version
		assert(
			m === n + 1,
			`Migration id numbers must increase in increments of 1, expected ${migrations.sequenceId}/${n + 1} but got '${migrations.sequence[i].id}'`
		)
		n = m
	}
}
```

**Validation rules:**

1. Sequence ID must not contain '/'
2. Sequence ID must be non-empty
3. First migration must be version 1
4. Versions must increment by exactly 1
5. All migration IDs must start with sequence ID

## Migration failure reasons

From `/packages/store/src/lib/migrate.ts:542-549`:

```typescript
export enum MigrationFailureReason {
	IncompatibleSubtype = 'incompatible-subtype',
	UnknownType = 'unknown-type',
	TargetVersionTooNew = 'target-version-too-new',
	TargetVersionTooOld = 'target-version-too-old',
	MigrationError = 'migration-error',
	UnrecognizedSubtype = 'unrecognized-subtype',
}
```

**Failure scenarios:**

### IncompatibleSubtype

Record has a subtype that exists in schema but is incompatible

### UnknownType

Record type doesn't exist in current schema at all

### TargetVersionTooNew

Data is from a newer version than current code supports. Happens when:

- User has newer tldraw version in another tab
- User opened document created by newer version

From `/packages/store/src/lib/StoreSchema.ts:537-545`:

```typescript
if (!migrationsToApply.every((m) => m.scope === 'record')) {
	return {
		type: 'error',
		reason:
			direction === 'down'
				? MigrationFailureReason.TargetVersionTooOld
				: MigrationFailureReason.TargetVersionTooNew,
	}
}
```

### TargetVersionTooOld

Trying to migrate down but missing down migrations

### MigrationError

Migration function threw an exception during execution

From `/packages/store/src/lib/StoreSchema.ts:569-572`:

```typescript
} catch (e) {
	console.error('Error migrating record', e)
	return { type: 'error', reason: MigrationFailureReason.MigrationError }
}
```

## Loading and applying migrations

From `/packages/editor/src/lib/utils/sync/TLLocalSyncClient.ts:155-203`:

```typescript
private async connect(onLoad: (client: this) => void, onLoadError: (error: Error) => void) {
	this.debug('connecting')
	let data: UnpackPromise<ReturnType<LocalIndexedDb['load']>> | undefined

	try {
		data = await this.db.load({ sessionId: this.sessionId })
	} catch (error: any) {
		onLoadError(error)
		showCantReadFromIndexDbAlert()
		return
	}

	this.debug('loaded data from store', data, 'didDispose', this.didDispose)
	if (this.didDispose) return

	try {
		if (data) {
			const documentSnapshot = Object.fromEntries(data.records.map((r) => [r.id, r]))
			const sessionStateSnapshot =
				data.sessionStateSnapshot ?? extractSessionStateFromLegacySnapshot(documentSnapshot)
			const migrationResult = this.store.schema.migrateStoreSnapshot({
				store: documentSnapshot,
				schema: data.schema ?? this.store.schema.serializeEarliestVersion(),
			})

			if (migrationResult.type === 'error') {
				console.error('failed to migrate store', migrationResult)
				onLoadError(new Error(`Failed to migrate: ${migrationResult.reason}`))
				return
			}

			const records = Object.values(migrationResult.value).filter((r) =>
				this.documentTypes.has(r.typeName)
			)
			if (records.length > 0) {
				this.store.mergeRemoteChanges(() => {
					this.store.put(records, 'initialize')
				})
			}

			if (sessionStateSnapshot) {
				loadSessionStateSnapshotIntoStore(this.store, sessionStateSnapshot, {
					forceOverwrite: true,
				})
			}
		}
		// ... more code
	} catch (e: any) {
		this.debug('error loading data from store', e)
		if (this.didDispose) return
		onLoadError(e)
		return
	}
}
```

**Load flow:**

1. Read from IndexedDB (records, schema, session state)
2. Build document snapshot from records array
3. Call `store.schema.migrateStoreSnapshot()` with snapshot and persisted schema
4. If migration fails, call `onLoadError` callback
5. If migration succeeds, filter to document-scoped records
6. Merge migrated records into store using `mergeRemoteChanges`
7. Load session state snapshot
8. Continue with normal initialization

**Error handling**: Migration failure prevents loading. Original IndexedDB data remains untouched.

## Getting migrations to apply

From `/packages/store/src/lib/StoreSchema.ts:425-491`:

```typescript
public getMigrationsSince(persistedSchema: SerializedSchema): Result<Migration[], string> {
	// Check cache first
	const cached = this.migrationCache.get(persistedSchema)
	if (cached) {
		return cached
	}

	const upgradeResult = upgradeSchema(persistedSchema)
	if (!upgradeResult.ok) {
		this.migrationCache.set(persistedSchema, upgradeResult)
		return upgradeResult
	}
	const schema = upgradeResult.value
	const sequenceIdsToInclude = new Set(
		// start with any shared sequences
		Object.keys(schema.sequences).filter((sequenceId) => this.migrations[sequenceId])
	)

	// also include any sequences that are not in the persisted schema but are marked as postHoc
	for (const sequenceId in this.migrations) {
		if (schema.sequences[sequenceId] === undefined && this.migrations[sequenceId].retroactive) {
			sequenceIdsToInclude.add(sequenceId)
		}
	}

	if (sequenceIdsToInclude.size === 0) {
		const result = Result.ok([])
		this.migrationCache.set(persistedSchema, result)
		return result
	}

	const allMigrationsToInclude = new Set<MigrationId>()
	for (const sequenceId of sequenceIdsToInclude) {
		const theirVersion = schema.sequences[sequenceId]
		if (
			(typeof theirVersion !== 'number' && this.migrations[sequenceId].retroactive) ||
			theirVersion === 0
		) {
			for (const migration of this.migrations[sequenceId].sequence) {
				allMigrationsToInclude.add(migration.id)
			}
			continue
		}
		const theirVersionId = `${sequenceId}/${theirVersion}`
		const idx = this.migrations[sequenceId].sequence.findIndex((m) => m.id === theirVersionId)
		if (idx === -1) {
			const result = Result.err('Incompatible schema?')
			this.migrationCache.set(persistedSchema, result)
			return result
		}
		for (const migration of this.migrations[sequenceId].sequence.slice(idx + 1)) {
			allMigrationsToInclude.add(migration.id)
		}
	}

	const result = Result.ok(
		this.sortedMigrations.filter(({ id }) => allMigrationsToInclude.has(id))
	)
	this.migrationCache.set(persistedSchema, result)
	return result
}
```

**Algorithm:**

1. Upgrade persisted schema from V1 to V2 if needed
2. Find shared sequences (present in both persisted and current schema)
3. Add retroactive sequences (not in persisted schema but marked `retroactive: true`)
4. For each sequence, find migrations to apply:
   - If persisted version is 0 or undefined+retroactive: apply all migrations
   - Otherwise: Find persisted version in sequence, apply all migrations after it
5. Filter sorted migrations to only included migration IDs
6. Cache result for performance

**Caching**: Uses WeakMap keyed by persisted schema object for fast lookups

## Retroactive migrations

From `/packages/store/src/lib/migrate.ts:290-303`:

```typescript
export interface MigrationSequence {
	sequenceId: string
	/**
	 * retroactive should be true if the migrations should be applied to snapshots that were created before
	 * this migration sequence was added to the schema.
	 *
	 * In general:
	 *
	 * - retroactive should be true when app developers create their own new migration sequences.
	 * - retroactive should be false when library developers ship a migration sequence. When you install a library for the first time, any migrations that were added in the library before that point should generally _not_ be applied to your existing data.
	 */
	retroactive: boolean
	sequence: Migration[]
}
```

**Purpose**: Control whether migrations apply to old data
**Use cases:**

- `retroactive: true` - App developers adding new features (apply to all data)
- `retroactive: false` - Library developers shipping features (only apply to data created after library installation)

**Example**: tldraw's store migrations use `retroactive: false` because they shipped with the library

## Cross-tab schema conflicts

From `/packages/editor/src/lib/utils/sync/TLLocalSyncClient.ts:205-248`:

```typescript
this.channel.onmessage = ({ data }) => {
	this.debug('got message', data)
	const msg = data as Message
	const res = this.store.schema.getMigrationsSince(msg.schema)

	if (!res.ok) {
		// we are older, refresh
		const timeSinceInit = Date.now() - this.initTime
		if (timeSinceInit < 5000) {
			// This tab was just reloaded, but is out of date
			onLoadError(new Error('Schema mismatch, please close other tabs and reload the page'))
			return
		}
		this.debug('reloading')
		this.isReloading = true
		window?.location?.reload?.()
		return
	} else if (res.value.length > 0) {
		// they are older, tell them to refresh
		this.debug('telling them to reload')
		this.channel.postMessage({ type: 'announce', schema: this.serializedSchema })
		// schedule a full db write in case they wrote data anyway
		this.shouldDoFullDBWrite = true
		this.persistIfNeeded()
		return
	}
	// otherwise, all good, same version
	if (msg.type === 'diff') {
		this.debug('applying diff')
		transact(() => {
			this.store.mergeRemoteChanges(() => {
				this.store.applyDiff(msg.changes as any)
			})
		})
	}
}
```

**Protocol:**

1. Each message includes sender's schema
2. Recipient calls `getMigrationsSince(msg.schema)`
3. If `!res.ok`: Recipient is older → reload window
4. If `res.value.length > 0`: Sender is older → send announce message to force their reload
5. If schemas match: Apply diff normally

**Safety check**: If tab just reloaded (< 5 seconds since init) and is already out of date, show error instead of infinite reload loop

**Message types from `/packages/editor/src/lib/utils/sync/TLLocalSyncClient.ts:29-44`:**

```typescript
interface SyncMessage {
	type: 'diff'
	storeId: string
	changes: RecordsDiff<UnknownRecord>
	schema: SerializedSchema
}

interface AnnounceMessage {
	type: 'announce'
	schema: SerializedSchema
}
```

## Session state management

From `/packages/editor/src/lib/utils/sync/LocalIndexedDb.ts:91-95`:

```typescript
interface SessionStateSnapshotRow {
	id: string
	snapshot: TLSessionStateSnapshot
	updatedAt: number
}
```

**Session state storage:**

- Stored in `session_state` object store
- Multiple sessions can exist (different browser tabs)
- Pruned to keep only 10 most recent (from `LocalIndexedDb.ts:278-291`)

**Pruning logic:**

```typescript
async pruneSessions() {
	await this.tx('readwrite', [Table.SessionState], async (tx) => {
		const sessionStateStore = tx.objectStore(Table.SessionState)
		const all = (await sessionStateStore.getAll()).sort((a, b) => a.updatedAt - b.updatedAt)
		if (all.length < 10) {
			await tx.done
			return
		}
		const toDelete = all.slice(0, all.length - 10)
		for (const { id } of toDelete) {
			await sessionStateStore.delete(id)
		}
	})
}
```

## Persistence throttling

From `/packages/editor/src/lib/utils/sync/TLLocalSyncClient.ts:15-18`:

```typescript
const PERSIST_THROTTLE_MS = 350
const PERSIST_RETRY_THROTTLE_MS = 10_000
```

**Throttling strategy:**

- Normal: Wait 350ms between persists
- Error state: Wait 10 seconds before retry

**Persist scheduling from `/packages/editor/src/lib/utils/sync/TLLocalSyncClient.ts:277-288`:**

```typescript
private schedulePersist() {
	this.debug('schedulePersist', this.scheduledPersistTimeout)
	if (this.scheduledPersistTimeout) return
	this.scheduledPersistTimeout = setTimeout(
		() => {
			this.scheduledPersistTimeout = null
			this.persistIfNeeded()
		},
		this.didLastWriteError ? PERSIST_RETRY_THROTTLE_MS : PERSIST_THROTTLE_MS
	)
}
```

## Hard reset

From `/packages/editor/src/lib/utils/sync/hardReset.ts:9-21`:

```typescript
export async function hardReset({ shouldReload = true } = {}) {
	clearSessionStorage()

	for (const instance of LocalIndexedDb.connectedInstances) {
		await instance.close()
	}
	await Promise.all(getAllIndexDbNames().map((db) => deleteDB(db)))

	clearLocalStorage()
	if (shouldReload) {
		window.location.reload()
	}
}
```

**Steps:**

1. Clear session storage
2. Close all connected IndexedDB instances
3. Delete all tldraw databases
4. Clear local storage
5. Reload page (optional)

**Exposure:**

- Development: `window.hardReset`
- Production: `window.__tldraw__hardReset`

From `/packages/editor/src/lib/utils/sync/hardReset.ts:23-29`:

```typescript
if (typeof window !== 'undefined') {
	if (process.env.NODE_ENV === 'development') {
		;(window as any).hardReset = hardReset
	}
	;(window as any).__tldraw__hardReset = hardReset
}
```

## Shape-specific migrations example

From `/packages/tlschema/src/shapes/TLArrowShape.ts:272-281`:

```typescript
export const arrowShapeVersions = createShapePropsMigrationIds('arrow', {
	AddLabelColor: 1,
	AddIsPrecise: 2,
	AddLabelPosition: 3,
	ExtractBindings: 4,
	AddScale: 5,
	AddElbow: 6,
	AddRichText: 7,
	AddRichTextAttrs: 8,
})
```

**Props migration helper from `/packages/tlschema/src/shapes/TLArrowShape.ts:283-285`:**

```typescript
function propsMigration(migration: TLPropsMigration) {
	return createPropsMigration<TLArrowShape>('shape', 'arrow', migration)
}
```

**Example migration from `/packages/tlschema/src/shapes/TLArrowShape.ts:300-306`:**

```typescript
propsMigration({
	id: arrowShapeVersions.AddLabelColor,
	up: (props) => {
		props.labelColor = 'black'
	},
	down: 'retired',
}),
```

**Storage-scoped migration example (ExtractBindings) from `/packages/tlschema/src/shapes/TLArrowShape.ts:344-420`:**

This migration moves arrow binding data from props to separate binding records:

```typescript
{
	id: arrowShapeVersions.ExtractBindings,
	scope: 'storage',
	up: (storage) => {
		type OldArrowTerminal =
			| {
					type: 'point'
					x: number
					y: number
			  }
			| {
					type: 'binding'
					boundShapeId: TLShapeId
					normalizedAnchor: VecModel
					isExact: boolean
					isPrecise: boolean
			  }
			| { type?: undefined; x: number; y: number }

		type OldArrow = TLBaseShape<'arrow', { start: OldArrowTerminal; end: OldArrowTerminal }>

		for (const record of storage.values()) {
			if (record.typeName !== 'shape' || (record as TLShape).type !== 'arrow') continue
			const arrow = record as OldArrow
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

				storage.set(id, binding as any)
				newArrow.props.start = { x: 0, y: 0 }
			} else {
				delete newArrow.props.start.type
			}
			// Similar logic for end terminal...
			storage.set(arrow.id, newArrow as any)
		}
	},
}
```

This demonstrates a complex migration that:

- Creates new records (bindings)
- Modifies existing records (arrows)
- Requires storage scope to create new record types

## Store-level migrations

From `/packages/tlschema/src/store-migrations.ts:13-19`:

```typescript
const Versions = createMigrationIds('com.tldraw.store', {
	RemoveCodeAndIconShapeTypes: 1,
	AddInstancePresenceType: 2,
	RemoveTLUserAndPresenceAndAddPointer: 3,
	RemoveUserDocument: 4,
	FixIndexKeys: 5,
} as const)
```

**All tldraw store migrations use `retroactive: false`** from line 66.

## Test patterns

From `/packages/store/src/lib/migrate.test.ts`:

**Testing migration ID creation:**

```typescript
const ids = createMigrationIds('com.myapp.book', {
	addGenre: 1,
	addPublisher: 2,
	removeOldField: 3,
})

expect(ids).toEqual({
	addGenre: 'com.myapp.book/1',
	addPublisher: 'com.myapp.book/2',
	removeOldField: 'com.myapp.book/3',
})
```

**Testing validation errors:**

```typescript
expect(() => validateMigrations(sequence)).toThrow(
	"Migration id numbers must increase in increments of 1, expected test/2 but got 'test/3'"
)
```

**Testing sort with dependencies:**

```typescript
const a1: Migration = {
	id: 'a/1' as MigrationId,
	scope: 'record',
	up: (record: UnknownRecord) => record,
}
const b1: Migration = {
	id: 'b/1' as MigrationId,
	scope: 'record',
	up: (record: UnknownRecord) => record,
	dependsOn: ['a/1' as MigrationId],
}

const sorted = sortMigrations([b1, a1])
expect(sorted).toEqual([a1, b1])
```

## Database name tracking

From `/packages/editor/src/lib/utils/sync/LocalIndexedDb.ts:318-330`:

```typescript
export function getAllIndexDbNames(): string[] {
	const result = JSON.parse(getFromLocalStorage(dbNameIndexKey) || '[]') ?? []
	if (!Array.isArray(result)) {
		return []
	}
	return result
}

function addDbName(name: string) {
	const all = new Set(getAllIndexDbNames())
	all.add(name)
	setInLocalStorage(dbNameIndexKey, JSON.stringify([...all]))
}
```

**Purpose**: Track all tldraw databases in localStorage for hard reset
**Key**: `TLDRAW_DB_NAME_INDEX_v2`
**Format**: JSON array of database names

**Used by hard reset** to find all databases to delete when `window.indexedDB.databases()` is not available (Safari).

## Applying migrations to storage

From `/packages/store/src/lib/StoreSchema.ts:577-633`:

```typescript
migrateStorage(storage: SynchronousStorage<R>) {
	const schema = storage.getSchema()
	assert(schema, 'Schema is missing.')

	const migrations = this.getMigrationsSince(schema)
	if (!migrations.ok) {
		console.error('Error migrating store', migrations.error)
		throw new Error(migrations.error)
	}
	const migrationsToApply = migrations.value
	if (migrationsToApply.length === 0) {
		return
	}

	storage.setSchema(this.serialize())

	for (const migration of migrationsToApply) {
		if (migration.scope === 'record') {
			for (const [id, state] of storage.entries()) {
				const shouldApply = migration.filter ? migration.filter(state) : true
				if (!shouldApply) continue
				const record = structuredClone(state)
				const result = migration.up!(record as any) ?? record
				if (!isEqual(result, state)) {
					storage.set(id, result as R)
				}
			}
		} else if (migration.scope === 'store') {
			// legacy
			const prevStore = Object.fromEntries(storage.entries())
			let nextStore = structuredClone(prevStore)
			nextStore = (migration.up!(nextStore) as any) ?? nextStore
			for (const [id, state] of Object.entries(nextStore)) {
				if (!state) continue
				if (!isEqual(state, prevStore[id])) {
					storage.set(id, state)
				}
			}
			for (const id of Object.keys(prevStore)) {
				if (!nextStore[id]) {
					storage.delete(id)
				}
			}
		} else if (migration.scope === 'storage') {
			migration.up!(storage)
		} else {
			exhaustiveSwitchError(migration)
		}
	}
	// Clean up non-document records
	for (const [id, state] of storage.entries()) {
		if (this.getType(state.typeName).scope !== 'document') {
			storage.delete(id)
		}
	}
}
```

**Process:**

1. Get migrations to apply via `getMigrationsSince`
2. Update stored schema to current
3. Apply each migration based on scope:
   - **record**: Iterate all records, apply to matching ones
   - **store**: Build full store object, transform, write back changes
   - **storage**: Call migration with direct storage access
4. Clean up non-document records (legacy support)

**Optimization**: Only calls `storage.set()` if record actually changed (using `isEqual`)

## Key source files

- `/packages/editor/src/lib/utils/sync/LocalIndexedDb.ts` - Database interface, object stores, legacy migration
- `/packages/editor/src/lib/utils/sync/TLLocalSyncClient.ts` - Load/apply migrations, cross-tab sync
- `/packages/editor/src/lib/utils/sync/hardReset.ts` - Nuclear reset function
- `/packages/store/src/lib/StoreSchema.ts` - Schema class, migration application logic
- `/packages/store/src/lib/migrate.ts` - Migration types, sorting algorithm, validation
- `/packages/tlschema/src/store-migrations.ts` - Store-level migrations for tldraw
- `/packages/tlschema/src/shapes/TLArrowShape.ts` - Example shape migrations
- `/packages/store/src/lib/migrate.test.ts` - Migration system tests

## Migration result structure

From `/packages/store/src/lib/migrate.ts:529-532`:

```typescript
export type MigrationResult<T> =
	| { type: 'success'; value: T }
	| { type: 'error'; reason: MigrationFailureReason }
```

**Success case**: Contains migrated value
**Error case**: Contains failure reason enum

**Usage pattern:**

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

// migrationResult.value contains migrated store
```

## Schema serialization

From `/packages/store/src/lib/StoreSchema.ts:755-765`:

```typescript
serialize(): SerializedSchemaV2 {
	return {
		schemaVersion: 2,
		sequences: Object.fromEntries(
			Object.values(this.migrations).map(({ sequenceId, sequence }) => [
				sequenceId,
				sequence.length ? parseMigrationId(sequence.at(-1)!.id).version : 0,
			])
		),
	}
}
```

**Logic**: For each sequence, find last migration and extract its version number
**Result**: Maps sequence ID to highest version number

## Standalone dependsOn

From `/packages/store/src/lib/migrate.ts:183-185`:

```typescript
export interface StandaloneDependsOn {
	readonly dependsOn: readonly MigrationId[]
}
```

**Purpose**: Declare dependencies without defining a migration
**Use case**: Future migrations in a sequence depend on other sequences

**Squashing logic from `/packages/store/src/lib/migrate.ts:6-24`:**

```typescript
function squashDependsOn(sequence: Array<Migration | StandaloneDependsOn>): Migration[] {
	const result: Migration[] = []
	for (let i = sequence.length - 1; i >= 0; i--) {
		const elem = sequence[i]
		if (!('id' in elem)) {
			const dependsOn = elem.dependsOn
			const prev = result[0]
			if (prev) {
				result[0] = {
					...prev,
					dependsOn: dependsOn.concat(prev.dependsOn ?? []),
				}
			}
		} else {
			result.unshift(elem)
		}
	}
	return result
}
```

**Algorithm**: Merge standalone dependencies into following migration's `dependsOn` array
