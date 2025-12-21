---
title: Cross-tab synchronization - raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - cross
  - tab
  - sync
---

# Cross-tab synchronization: raw notes

Internal research notes for the cross-tab-sync.md article.

## Core problem

Multiple browser tabs with same document open + IndexedDB = data loss. Last write wins, other changes disappear silently.

**Common scenario:**
1. Tab A: user draws shape, stores to IndexedDB
2. Tab B: user opens same document (or refreshes while A still open)
3. Tab B: makes changes, stores to IndexedDB
4. Tab A's changes are overwritten

Both tabs believe they're authoritative. No concurrent writer protection in IndexedDB.

## BroadcastChannel API

Browser-native mechanism for same-origin tab communication. Works offline (no network).

**Basic usage:**
Located in `packages/editor/src/lib/utils/sync/TLLocalSyncClient.ts:64`

```typescript
const BC = typeof BroadcastChannel === 'undefined' ? BroadcastChannelMock : BroadcastChannel
```

Fallback to mock for environments without support (older browsers, some iframes). Mock does nothing.

**Channel naming:**
From `TLLocalSyncClient.ts:102`:
```typescript
public readonly channel = new BC(`tldraw-tab-sync-${persistenceKey}`)
```

Each document gets unique channel based on persistence key.

## Message types

From `TLLocalSyncClient.ts:29-44`:

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

type Message = SyncMessage | AnnounceMessage
```

**SyncMessage:** Broadcasts record changes (adds, updates, removes)
**AnnounceMessage:** Sent by new tabs on connect, triggers schema version check

## Store listener setup

From `TLLocalSyncClient.ts:115-134`:

```typescript
store.listen(
	({ changes }) => {
		this.diffQueue.push(changes)
		this.channel.postMessage(
			msg({
				type: 'diff',
				storeId: this.store.id,
				changes,
				schema: this.serializedSchema,
			})
		)
		this.schedulePersist()
	},
	{ source: 'user', scope: 'document' }
)
```

**Filters:**
- `source: 'user'` - Only broadcasts user-initiated changes (not remote/system changes)
- `scope: 'document'` - Only broadcasts document-scoped records (not session state like camera position)

**Session state listener:**
From `TLLocalSyncClient.ts:136-144`:
```typescript
store.listen(
	() => {
		this.diffQueue.push(UPDATE_INSTANCE_STATE)
		this.schedulePersist()
	},
	{ scope: 'session' }
)
```

Session changes (camera, selection) don't broadcast to other tabs, only persist locally.

## Message receiving

From `TLLocalSyncClient.ts:205-247`:

```typescript
this.channel.onmessage = ({ data }) => {
	const msg = data as Message
	const res = this.store.schema.getMigrationsSince(msg.schema)

	if (!res.ok) {
		// Sender has newer schema - we're outdated
		const timeSinceInit = Date.now() - this.initTime
		if (timeSinceInit < 5000) {
			// Safety check: don't reload if tab just created
			onLoadError(new Error('Schema mismatch, please close other tabs and reload the page'))
			return
		}
		this.isReloading = true
		window?.location?.reload?.()
		return
	} else if (res.value.length > 0) {
		// Sender has older schema - tell them to reload
		this.channel.postMessage({ type: 'announce', schema: this.serializedSchema })
		// Schedule full DB write in case they wrote stale data
		this.shouldDoFullDBWrite = true
		this.persistIfNeeded()
		return
	}

	// Same version - apply diff
	if (msg.type === 'diff') {
		transact(() => {
			this.store.mergeRemoteChanges(() => {
				this.store.applyDiff(msg.changes as any)
			})
		})
	}
}
```

**Schema version check timing constant:**
From `TLLocalSyncClient.ts:216`:
```typescript
if (timeSinceInit < 5000) // 5 second window
```

Prevents reload loop if newly created tab is already outdated.

## mergeRemoteChanges wrapper

Located in `packages/store/src/lib/Store.ts:1044-1072`

```typescript
mergeRemoteChanges(fn: () => void) {
	if (this.isMergingRemoteChanges) {
		return fn()
	}

	if (this._isInAtomicOp) {
		throw new Error('Cannot merge remote changes while in atomic operation')
	}

	try {
		this.atomic(fn, true, true)
	} finally {
		if (this._isInAtomicOp) {
			throw new Error('mergeRemoteChanges must finish atomically')
		}
		this.isInMergingRemoteChanges = false
	}
}
```

**Purpose:** Marks changes as remote-originated. Store doesn't re-broadcast them to avoid infinite loops.

**Flags:**
- `this.isMergingRemoteChanges = true` during execution
- Prevents re-triggering store listeners with `source: 'user'` filter

## applyDiff method

From `packages/store/src/lib/Store.ts:1074-1096`:

```typescript
applyDiff(
	diff: RecordsDiff<R>,
	{
		runCallbacks = true,
		ignoreEphemeralKeys = false,
	}: { runCallbacks?: boolean; ignoreEphemeralKeys?: boolean } = {}
) {
	this.atomic(() => {
		const toPut = objectMapValues(diff.added)

		for (const [_from, to] of objectMapValues(diff.updated)) {
			toPut.push(to)
		}

		const toRemove = objectMapKeys(diff.removed)

		for (const id of toRemove) {
			this.remove([id] as any)
		}

		this.put(toPut, ignoreEphemeralKeys ? 'initialize' : undefined)
	}, runCallbacks)
}
```

Converts diff structure into put/remove operations.

## RecordsDiff structure

From `packages/store/src/lib/RecordsDiff.ts:29-36`:

```typescript
export interface RecordsDiff<R extends UnknownRecord> {
	added: Record<IdOf<R>, R>
	updated: Record<IdOf<R>, [from: R, to: R]>
	removed: Record<IdOf<R>, R>
}
```

**Updated records:** Tuple of `[from, to]` for undo/redo support

## Persistence throttling

From `TLLocalSyncClient.ts:15-18`:

```typescript
const PERSIST_THROTTLE_MS = 350
const PERSIST_RETRY_THROTTLE_MS = 10_000
```

**Normal persist:** 350ms debounce after changes
**Error retry:** 10 second delay after failed write

**schedulePersist implementation:**
From `TLLocalSyncClient.ts:277-288`:

```typescript
private schedulePersist() {
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

Single pending timeout. Subsequent changes don't schedule new timeouts, just wait for existing one.

## Diff queue and squashing

**Queue structure:**
From `TLLocalSyncClient.ts:69`:
```typescript
private diffQueue: Array<RecordsDiff<UnknownRecord> | typeof UPDATE_INSTANCE_STATE> = []
```

Accumulates changes between persist operations.

**Squashing logic:**
From `TLLocalSyncClient.ts:358-366`:
```typescript
const diffs = squashRecordDiffs(
	diffQueue.filter((d): d is RecordsDiff<UnknownRecord> => d !== UPDATE_INSTANCE_STATE)
)
await this.db.storeChanges({
	changes: diffs,
	schema: this.store.schema,
	sessionId: this.sessionId,
	sessionStateSnapshot: this.$sessionStateSnapshot.get(),
})
```

**squashRecordDiffs algorithm:**
Located in `packages/store/src/lib/RecordsDiff.ts:152-164`

Combines multiple diffs intelligently:
- Added then updated → single add with final state
- Added then removed → cancel both operations
- Updated then updated → chain updates, preserve original 'from' state
- Removed then added → convert to update

**Example from RecordsDiff.ts:206-247:**
```typescript
// Target has removed: { 'book:1': oldBook }
// New diff has added: { 'book:1': newBook }
// Result: updated: { 'book:1': [oldBook, newBook] }

if (target.removed[id]) {
	const original = target.removed[id]
	delete target.removed[id]
	if (original !== value) {
		target.updated[id] = [original, value]
	}
}
```

## persistIfNeeded guards

From `TLLocalSyncClient.ts:299-329`:

```typescript
private persistIfNeeded() {
	if (this.scheduledPersistTimeout) {
		clearTimeout(this.scheduledPersistTimeout)
		this.scheduledPersistTimeout = null
	}

	if (this.isPersisting) return
	if (this.isReloading) return
	if (this.store.isPossiblyCorrupted()) return

	if (this.shouldDoFullDBWrite || this.diffQueue.length > 0) {
		this.doPersist()
	}
}
```

**Guards:**
1. Already persisting: skip (will reschedule after current persist completes)
2. Reloading: don't write (newer tab exists, would overwrite their data)
3. Store corrupted: don't write (prevents corrupting IndexedDB)
4. No changes: skip

**Corruption check:**
From `packages/store/src/lib/Store.ts:1176-1184`:

```typescript
private _isPossiblyCorrupted = false

markAsPossiblyCorrupted() {
	this._isPossiblyCorrupted = true
}

isPossiblyCorrupted() {
	return this._isPossiblyCorrupted
}
```

Set by store integrity checker when validation fails. Prevents corrupted state from persisting.

## Full DB write vs incremental

**Full write:**
From `TLLocalSyncClient.ts:349-356`:

```typescript
if (this.shouldDoFullDBWrite) {
	this.shouldDoFullDBWrite = false
	await this.db.storeSnapshot({
		schema: this.store.schema,
		snapshot: this.store.serialize(),
		sessionId: this.sessionId,
		sessionStateSnapshot: this.$sessionStateSnapshot.get(),
	})
}
```

**Incremental write:**
Applies squashed diffs (shown above)

**When full write triggered:**
- Initial persist on first change: `TLLocalSyncClient.ts:71` - `private shouldDoFullDBWrite = true`
- Schema version mismatch detected: `TLLocalSyncClient.ts:234`
- Write error occurred: `TLLocalSyncClient.ts:372`

## IndexedDB structure

From `packages/editor/src/lib/utils/sync/LocalIndexedDb.ts:7-18`:

```typescript
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

**Database naming:**
From `LocalIndexedDb.ts:23-24`:
```typescript
const storeId = STORE_PREFIX + persistenceKey
// Example: "TLDRAW_DOCUMENT_v2my-document-key"
```

**Database version:** 4 (from `LocalIndexedDb.ts:28`)

**Object stores:** 4 tables (Records, Schema, SessionState, Assets)

## storeChanges implementation

From `LocalIndexedDb.ts:195-237`:

```typescript
async storeChanges({
	schema,
	changes,
	sessionId,
	sessionStateSnapshot,
}: {
	schema: TLStoreSchema
	changes: RecordsDiff<any>
	sessionId?: string | null
	sessionStateSnapshot?: TLSessionStateSnapshot | null
}) {
	await this.tx('readwrite', [Table.Records, Table.Schema, Table.SessionState], async (tx) => {
		const recordsStore = tx.objectStore(Table.Records)
		const schemaStore = tx.objectStore(Table.Schema)
		const sessionStateStore = tx.objectStore(Table.SessionState)

		for (const [id, record] of Object.entries(changes.added)) {
			await recordsStore.put(record, id)
		}

		for (const [_prev, updated] of Object.values(changes.updated)) {
			await recordsStore.put(updated, updated.id)
		}

		for (const id of Object.keys(changes.removed)) {
			await recordsStore.delete(id)
		}

		schemaStore.put(schema.serialize(), Table.Schema)
		if (sessionStateSnapshot && sessionId) {
			sessionStateStore.put(
				{
					snapshot: sessionStateSnapshot,
					updatedAt: Date.now(),
					id: sessionId,
				} satisfies SessionStateSnapshotRow,
				sessionId
			)
		}
	})
}
```

**Transaction scope:** All operations in single read-write transaction for atomicity.

**Schema persistence:** Always writes current schema version with every change.

**Session state row:**
From `LocalIndexedDb.ts:91-95`:
```typescript
interface SessionStateSnapshotRow {
	id: string
	snapshot: TLSessionStateSnapshot
	updatedAt: number
}
```

## storeSnapshot implementation

From `LocalIndexedDb.ts:239-276`:

```typescript
async storeSnapshot({
	schema,
	snapshot,
	sessionId,
	sessionStateSnapshot,
}: {
	schema: TLStoreSchema
	snapshot: SerializedStore<any>
	sessionId?: string | null
	sessionStateSnapshot?: TLSessionStateSnapshot | null
}) {
	await this.tx('readwrite', [Table.Records, Table.Schema, Table.SessionState], async (tx) => {
		const recordsStore = tx.objectStore(Table.Records)
		const schemaStore = tx.objectStore(Table.Schema)
		const sessionStateStore = tx.objectStore(Table.SessionState)

		await recordsStore.clear()

		for (const [id, record] of Object.entries(snapshot)) {
			await recordsStore.put(record, id)
		}

		schemaStore.put(schema.serialize(), Table.Schema)

		if (sessionStateSnapshot && sessionId) {
			sessionStateStore.put(
				{
					snapshot: sessionStateSnapshot,
					updatedAt: Date.now(),
					id: sessionId,
				} satisfies SessionStateSnapshotRow,
				sessionId
			)
		}
	})
}
```

**Key difference:** `recordsStore.clear()` before writing. Complete replacement vs incremental.

## Error handling

**Write failure:**
From `TLLocalSyncClient.ts:369-381`:

```typescript
} catch (e) {
	this.shouldDoFullDBWrite = true
	this.didLastWriteError = true
	console.error('failed to store changes in indexed db', e)

	showCantWriteToIndexDbAlert()
	if (typeof window !== 'undefined') {
		window.location.reload()
	}
}
```

**Alert message:**
From `packages/editor/src/lib/utils/sync/alerts.ts:2-10`:
```typescript
export function showCantWriteToIndexDbAlert() {
	window.alert(
		`Oops! We could not save changes to your browser's storage. We now need to reload the page and try again.

Keep seeing this message?
• If you're using tldraw in a private or "incognito" window, try loading tldraw in a regular window or in a different browser.
• If your hard disk is full, try clearing up some space and then reload the page.`
	)
}
```

**Read failure:**
From `TLLocalSyncClient.ts:159-165`:

```typescript
try {
	data = await this.db.load({ sessionId: this.sessionId })
} catch (error: any) {
	onLoadError(error)
	showCantReadFromIndexDbAlert()
	return
}
```

Both read and write failures are unrecoverable. Page reload required.

## Session state persistence

**Session state structure:**
From `packages/editor/src/lib/config/TLSessionStateSnapshot.ts:98-112`:

```typescript
export interface TLSessionStateSnapshot {
	version: number
	currentPageId?: TLPageId
	isFocusMode?: boolean
	exportBackground?: boolean
	isDebugMode?: boolean
	isToolLocked?: boolean
	isGridMode?: boolean
	pageStates?: Array<{
		pageId: TLPageId
		camera?: { x: number; y: number; z: number }
		selectedShapeIds?: TLShapeId[]
		focusedGroupId?: TLShapeId | null
	}>
}
```

**Signal creation:**
From `TLSessionStateSnapshot.ts:164-202`:

```typescript
export function createSessionStateSnapshotSignal(
	store: TLStore
): Signal<TLSessionStateSnapshot | null> {
	const $allPageIds = store.query.ids('page')

	return computed<TLSessionStateSnapshot | null>(
		'sessionStateSnapshot',
		() => {
			const instanceState = store.get(TLINSTANCE_ID)
			if (!instanceState) return null

			const allPageIds = [...$allPageIds.get()]
			return {
				version: CURRENT_SESSION_STATE_SNAPSHOT_VERSION,
				currentPageId: instanceState.currentPageId,
				exportBackground: instanceState.exportBackground,
				isFocusMode: instanceState.isFocusMode,
				isDebugMode: instanceState.isDebugMode,
				isToolLocked: instanceState.isToolLocked,
				isGridMode: instanceState.isGridMode,
				pageStates: allPageIds.map((id) => {
					const ps = store.get(InstancePageStateRecordType.createId(id))
					const camera = store.get(CameraRecordType.createId(id))
					return {
						pageId: id,
						camera: {
							x: camera?.x ?? 0,
							y: camera?.y ?? 0,
							z: camera?.z ?? 1,
						},
						selectedShapeIds: ps?.selectedShapeIds ?? [],
						focusedGroupId: ps?.focusedGroupId ?? null,
					}
				}),
			}
		},
		{ isEqual }
	)
}
```

**Computed signal:** Automatically updates when instance state or page states change.

**isEqual option:** Prevents unnecessary persist triggers when snapshot hasn't actually changed.

## Tab ID generation

From `TLSessionStateSnapshot.ts:25-74`:

```typescript
const tabIdKey = 'TLDRAW_TAB_ID_v2' as const

export const TAB_ID: string = window
	? (window[tabIdKey] ??
		getFromSessionStorage(tabIdKey) ??
		`TLDRAW_INSTANCE_STATE_V1_` + uniqueId())
	: '<error>'

if (window) {
	window[tabIdKey] = TAB_ID
	if (iOS()) {
		// iOS does not trigger beforeunload
		// so we need to keep the sessionStorage value around
		setInSessionStorage(tabIdKey, TAB_ID)
	} else {
		deleteFromSessionStorage(tabIdKey)
	}
}

window?.addEventListener('beforeunload', () => {
	setInSessionStorage(tabIdKey, TAB_ID)
})
```

**Strategy:**
1. Check window global
2. Check sessionStorage
3. Generate new unique ID

**iOS special handling:** sessionStorage persists permanently because iOS Safari doesn't reliably fire `beforeunload`

**Desktop browsers:** Clear sessionStorage on load, write on `beforeunload`. Prevents duplicate IDs if tab duplicated.

## Loading session state

From `LocalIndexedDb.ts:167-193`:

```typescript
async load({ sessionId }: { sessionId?: string } = {}) {
	return await this.tx(
		'readonly',
		[Table.Records, Table.Schema, Table.SessionState],
		async (tx) => {
			const recordsStore = tx.objectStore(Table.Records)
			const schemaStore = tx.objectStore(Table.Schema)
			const sessionStateStore = tx.objectStore(Table.SessionState)

			let sessionStateSnapshot = sessionId
				? ((await sessionStateStore.get(sessionId)) as SessionStateSnapshotRow | undefined)
						?.snapshot
				: null

			if (!sessionStateSnapshot) {
				// get the most recent session state
				const all = (await sessionStateStore.getAll()) as SessionStateSnapshotRow[]
				sessionStateSnapshot = all.sort((a, b) => a.updatedAt - b.updatedAt).pop()?.snapshot
			}

			const result = {
				records: await recordsStore.getAll(),
				schema: await schemaStore.get(Table.Schema),
				sessionStateSnapshot,
			} satisfies LoadResult

			return result
		}
	)
}
```

**Fallback strategy:**
1. Try to load by sessionId (matches current tab)
2. If not found, get most recent session state by `updatedAt` timestamp
3. Ensures new tabs inherit sensible camera position from previous tab

## Session state pruning

From `LocalIndexedDb.ts:278-291`:

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

**Limit:** Keep 10 most recent session states. Prevents unbounded growth from many tab opens.

## localStorage atoms for preferences

From `packages/state/src/lib/localStorageAtom.ts:32-87`:

```typescript
export function localStorageAtom<Value, Diff = unknown>(
	name: string,
	initialValue: Value,
	options?: AtomOptions<Value, Diff>
): [Atom<Value, Diff>, () => void] {
	// Try to restore from localStorage
	let _initialValue = initialValue
	try {
		const value = getFromLocalStorage(name)
		if (value) {
			_initialValue = JSON.parse(value) as Value
		}
	} catch {
		deleteFromLocalStorage(name)
	}

	const outAtom = atom(name, _initialValue, options)

	// Save to localStorage on change
	const reactCleanup = react(`save ${name} to localStorage`, () => {
		setInLocalStorage(name, JSON.stringify(outAtom.get()))
	})

	// Cross-tab sync via storage event
	const handleStorageEvent = (event: StorageEvent) => {
		if (event.key !== name) return

		if (event.newValue === null) {
			outAtom.set(initialValue)
			return
		}

		try {
			const newValue = JSON.parse(event.newValue) as Value
			outAtom.set(newValue)
		} catch {
			// Parsing failed, preserve existing value
		}
	}

	window.addEventListener('storage', handleStorageEvent)

	const cleanup = () => {
		reactCleanup()
		window.removeEventListener('storage', handleStorageEvent)
	}

	return [outAtom, cleanup]
}
```

**Storage event behavior:**
- Fires when localStorage changes in *different* tab
- Does NOT fire for same-tab changes
- Automatic loop prevention without extra logic
- Only works for small JSON-serializable values

**Comparison with BroadcastChannel:**
- localStorage atoms: Simpler, automatic persistence, built-in cross-tab sync
- BroadcastChannel: More control, supports complex data structures, explicit messaging

## Document type filtering

From `TLLocalSyncClient.ts:148-153`:

```typescript
this.documentTypes = new Set(
	Object.values(this.store.schema.types)
		.filter((t) => t.scope === 'document')
		.map((t) => t.typeName)
)
```

**Usage during load:**
From `TLLocalSyncClient.ts:187-189`:

```typescript
const records = Object.values(migrationResult.value).filter((r) =>
	this.documentTypes.has(r.typeName)
)
```

**Purpose:** Only load document-scoped records from IndexedDB. Session-scoped records (camera, selection, etc.) are not persisted cross-session, only within session to SessionState table.

## Schema migration on load

From `TLLocalSyncClient.ts:172-196`:

```typescript
const documentSnapshot = Object.fromEntries(data.records.map((r) => [r.id, r]))
const sessionStateSnapshot =
	data.sessionStateSnapshot ?? extractSessionStateFromLegacySnapshot(documentSnapshot)

const migrationResult = this.store.schema.migrateStoreSnapshot({
	store: documentSnapshot,
	schema: data.schema ?? this.store.schema.serializeEarliestVersion(),
})

if (migrationResult.type === 'error') {
	console.error('failed to migrate store', migrationResult)
	onLoadError(new Error(`Failed to migrate store: ${migrationResult.reason}`))
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
```

**Migration strategy:**
1. Load raw records from IndexedDB
2. Check stored schema version
3. Run migrations to current schema
4. Filter to document-scoped records only
5. Merge into store as remote changes

**Legacy fallback:**
`data.schema ?? this.store.schema.serializeEarliestVersion()`

If no schema stored (very old documents), assume earliest version.

## Initialization flow

From `TLLocalSyncClient.ts:89-153`:

```typescript
constructor(
	public readonly store: TLStore,
	{
		persistenceKey,
		sessionId = TAB_ID,
		onLoad,
		onLoadError,
	}: {
		persistenceKey: string
		sessionId?: string
		onLoad(self: TLLocalSyncClient): void
		onLoadError(error: Error): void
	},
	public readonly channel = new BC(`tldraw-tab-sync-${persistenceKey}`)
) {
	if (typeof window !== 'undefined') {
		;(window as any).tlsync = this
	}
	this.persistenceKey = persistenceKey
	this.sessionId = sessionId
	this.db = new LocalIndexedDb(persistenceKey)
	this.disposables.add(() => this.db.close())

	this.serializedSchema = this.store.schema.serialize()
	this.$sessionStateSnapshot = createSessionStateSnapshotSignal(this.store)

	this.disposables.add(
		store.listen(/* document changes */)
	)
	this.disposables.add(
		store.listen(/* session changes */)
	)

	this.connect(onLoad, onLoadError)

	this.documentTypes = new Set(/* ... */)
}
```

**Sequence:**
1. Create IndexedDb instance
2. Set up store listeners (immediate - captures changes during load)
3. Call async `connect()` method
4. Determine document types for filtering

**Why listeners before connect:**
Changes might occur during async load. Must capture them to persist after load completes.

## Announce on connect

From `TLLocalSyncClient.ts:248`:

```typescript
this.channel.postMessage({ type: 'announce', schema: this.serializedSchema })
```

**Purpose:** Trigger version check in all existing tabs. If this new tab has newer schema, old tabs will reload. If old tabs have newer schema, this tab will reload.

**Timing:** After channel.onmessage handler set up, before onLoad callback.

## Cleanup/disposal

From `TLLocalSyncClient.ts:261-265`:

```typescript
close() {
	this.didDispose = true
	this.disposables.forEach((d) => d())
}
```

**Disposables registered:**
- Database close: `TLLocalSyncClient.ts:110`
- Store listener (document): `TLLocalSyncClient.ts:115`
- Store listener (session): `TLLocalSyncClient.ts:136`
- Channel close: `TLLocalSyncClient.ts:249`

**didDispose check:**
From `TLLocalSyncClient.ts:168,255,338`:

Async operations check this flag and early-return if true. Prevents writes after disposal.

## Constants

From `TLLocalSyncClient.ts:15-20`:

```typescript
const PERSIST_THROTTLE_MS = 350
const PERSIST_RETRY_THROTTLE_MS = 10_000
const UPDATE_INSTANCE_STATE = Symbol('UPDATE_INSTANCE_STATE')
```

From `TLLocalSyncClient.ts:216`:
```typescript
const SCHEMA_MISMATCH_GRACE_PERIOD = 5000 // milliseconds
```

From `LocalIndexedDb.ts:7-10`:
```typescript
const STORE_PREFIX = 'TLDRAW_DOCUMENT_v2'
const LEGACY_ASSET_STORE_PREFIX = 'TLDRAW_ASSET_STORE_v1'
const dbNameIndexKey = 'TLDRAW_DB_NAME_INDEX_v2'
```

From `LocalIndexedDb.ts:28`:
```typescript
const DATABASE_VERSION = 4
```

From `LocalIndexedDb.ts:282` (pruning limit):
```typescript
const MAX_SESSION_STATES = 10
```

From `TLSessionStateSnapshot.ts:77-80`:
```typescript
const Versions = {
	Initial: 0,
} as const
```

## Edge cases

**Schema rollback protection:**
From `TLLocalSyncClient.ts:219-223`:

```typescript
// Not expecting this to ever happen. It should only happen if we roll back a release that incremented
// the schema version (which we should never do)
// Or maybe during development if you have multiple local tabs open running the app on prod mode and you
// check out an older commit. Dev server should be fine.
onLoadError(new Error('Schema mismatch, please close other tabs and reload the page'))
```

Tab just created but already outdated. Indicates schema version decreased (impossible in production).

**Stale data overwrite:**
From `TLLocalSyncClient.ts:232-236`:

```typescript
// schedule a full db write in case they wrote data anyway
this.shouldDoFullDBWrite = true
this.persistIfNeeded()
```

When newer tab detects older tab, tells old tab to reload. But network timing means old tab might write before reloading. Newer tab does full DB write to ensure its version wins.

**Empty diff queue:**
From `TLLocalSyncClient.ts:345-347`:

```typescript
const diffQueue = this.diffQueue
this.diffQueue = []
```

Instantly clear queue even if persist fails. Prevents infinite growth. On failure, `shouldDoFullDBWrite = true` ensures full state captured on retry.

**Transaction abort on close:**
From `LocalIndexedDb.ts:156-159`:

```typescript
} else {
	tx.abort()
}
```

If database closed during transaction, abort instead of waiting for completion. Prevents errors on page unload.

**Concurrent persist attempts:**
From `TLLocalSyncClient.ts:317,337`:

```typescript
if (this.isPersisting) return // persistIfNeeded guard

assert(!this.isPersisting, 'persist already in progress') // doPersist assertion
```

Only one persist operation at a time. New changes accumulate in queue, will trigger another persist after current one completes.

## Key source files

- `packages/editor/src/lib/utils/sync/TLLocalSyncClient.ts` - Main cross-tab sync client
- `packages/editor/src/lib/utils/sync/LocalIndexedDb.ts` - IndexedDB persistence wrapper
- `packages/editor/src/lib/utils/sync/alerts.ts` - Error alert messages
- `packages/editor/src/lib/config/TLSessionStateSnapshot.ts` - Session state structure and TAB_ID
- `packages/store/src/lib/Store.ts` - Store mergeRemoteChanges and applyDiff methods
- `packages/store/src/lib/RecordsDiff.ts` - Diff structure and squashing logic
- `packages/state/src/lib/localStorageAtom.ts` - localStorage atoms with storage event sync
