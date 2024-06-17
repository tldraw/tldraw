import { RecordsDiff, SerializedSchema, SerializedStore } from '@tldraw/store'
import { TLRecord, TLStoreSchema } from '@tldraw/tlschema'
import { getFromLocalStorage, setInLocalStorage } from '@tldraw/utils'
import { IDBPDatabase, openDB } from 'idb'
import { TLSessionStateSnapshot } from '../../config/TLSessionStateSnapshot'

// DO NOT CHANGE THESE WITHOUT ADDING MIGRATION LOGIC. DOING SO WOULD WIPE ALL EXISTING DATA.
const STORE_PREFIX = 'TLDRAW_DOCUMENT_v2'
const dbNameIndexKey = 'TLDRAW_DB_NAME_INDEX_v2'

const Table = {
	Records: 'records',
	Schema: 'schema',
	SessionState: 'session_state',
} as const

type StoreName = (typeof Table)[keyof typeof Table]

async function withDb<T>(storeId: string, cb: (db: IDBPDatabase<StoreName>) => Promise<T>) {
	addDbName(storeId)
	const db = await openDB<StoreName>(storeId, 3, {
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
		},
	})
	try {
		return await cb(db)
	} finally {
		db.close()
	}
}

interface LoadResult {
	records: TLRecord[]
	schema?: SerializedSchema
	sessionStateSnapshot?: TLSessionStateSnapshot | null
}

interface SessionStateSnapshotRow {
	id: string
	snapshot: TLSessionStateSnapshot
	updatedAt: number
}

/** @internal */
export async function loadDataFromStore({
	persistenceKey,
	sessionId,
	didCancel,
}: {
	persistenceKey: string
	sessionId?: string
	didCancel?: () => boolean
}): Promise<undefined | LoadResult> {
	const storeId = STORE_PREFIX + persistenceKey
	if (!getAllIndexDbNames().includes(storeId)) return undefined
	await pruneSessionState({ persistenceKey, didCancel })
	return await withDb(storeId, async (db) => {
		if (didCancel?.()) return undefined
		const tx = db.transaction([Table.Records, Table.Schema, Table.SessionState], 'readonly')
		const recordsStore = tx.objectStore(Table.Records)
		const schemaStore = tx.objectStore(Table.Schema)
		const sessionStateStore = tx.objectStore(Table.SessionState)
		let sessionStateSnapshot = sessionId
			? ((await sessionStateStore.get(sessionId)) as SessionStateSnapshotRow | undefined)?.snapshot
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
		if (didCancel?.()) {
			tx.abort()
			return undefined
		}
		await tx.done
		return result
	})
}

/** @internal */
export async function storeChangesInIndexedDb({
	persistenceKey,
	schema,
	changes,
	sessionId,
	sessionStateSnapshot,
	didCancel,
}: {
	persistenceKey: string
	schema: TLStoreSchema
	changes: RecordsDiff<any>
	sessionId?: string | null
	sessionStateSnapshot?: TLSessionStateSnapshot | null
	didCancel?: () => boolean
}) {
	const storeId = STORE_PREFIX + persistenceKey
	await withDb(storeId, async (db) => {
		const tx = db.transaction([Table.Records, Table.Schema, Table.SessionState], 'readwrite')
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
		} else if (sessionStateSnapshot || sessionId) {
			console.error('sessionStateSnapshot and instanceId must be provided together')
		}

		if (didCancel?.()) return tx.abort()

		await tx.done
	})
}

/** @internal */
export async function storeSnapshotInIndexedDb({
	persistenceKey,
	schema,
	snapshot,
	sessionId,
	sessionStateSnapshot,
	didCancel,
}: {
	persistenceKey: string
	schema: TLStoreSchema
	snapshot: SerializedStore<any>
	sessionId?: string | null
	sessionStateSnapshot?: TLSessionStateSnapshot | null
	didCancel?: () => boolean
}) {
	const storeId = STORE_PREFIX + persistenceKey
	await withDb(storeId, async (db) => {
		const tx = db.transaction([Table.Records, Table.Schema, Table.SessionState], 'readwrite')
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
		} else if (sessionStateSnapshot || sessionId) {
			console.error('sessionStateSnapshot and instanceId must be provided together')
		}

		if (didCancel?.()) return tx.abort()

		await tx.done
	})
}

async function pruneSessionState({
	persistenceKey,
	didCancel,
}: {
	persistenceKey: string
	didCancel?: () => boolean
}) {
	await withDb(STORE_PREFIX + persistenceKey, async (db) => {
		const tx = db.transaction([Table.SessionState], 'readwrite')
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
		if (didCancel?.()) return tx.abort()
		await tx.done
	})
}

/** @internal */
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
