import { RecordsDiff, SerializedSchema, StoreSnapshot } from '@tldraw/store'
import { TLRecord, TLStoreSchema } from '@tldraw/tlschema'
import { IDBPDatabase, openDB } from 'idb'
import { STORE_PREFIX, addDbName, getAllIndexDbNames } from './persistence-constants'

async function withDb<T>(storeId: string, cb: (db: IDBPDatabase<unknown>) => Promise<T>) {
	addDbName(storeId)
	const db = await openDB(storeId, 2, {
		upgrade(database) {
			if (!database.objectStoreNames.contains('records')) {
				database.createObjectStore('records')
			}
			database.createObjectStore('schema')
		},
	})
	try {
		return await cb(db)
	} finally {
		db.close()
	}
}

/** @internal */
export async function loadDataFromStore(
	universalPersistenceKey: string,
	opts?: {
		didCancel?: () => boolean
	}
): Promise<undefined | { records: TLRecord[]; schema?: SerializedSchema }> {
	const storeId = STORE_PREFIX + universalPersistenceKey
	if (!getAllIndexDbNames().includes(storeId)) return undefined
	return await withDb(storeId, async (db) => {
		if (opts?.didCancel?.()) return undefined
		const tx = db.transaction(['records', 'schema'], 'readonly')
		const recordsStore = tx.objectStore('records')
		const schemaStore = tx.objectStore('schema')
		return {
			records: await recordsStore.getAll(),
			schema: await schemaStore.get('schema'),
		}
	})
}

/** @internal */
export async function storeChangesInIndexedDb(
	universalPersistenceKey: string,
	schema: TLStoreSchema,
	changes: RecordsDiff<any>,
	opts?: {
		didCancel?: () => boolean
	}
) {
	const storeId = STORE_PREFIX + universalPersistenceKey
	await withDb(storeId, async (db) => {
		const tx = db.transaction(['records', 'schema'], 'readwrite')
		const recordsStore = tx.objectStore('records')
		const schemaStore = tx.objectStore('schema')

		for (const [id, record] of Object.entries(changes.added)) {
			await recordsStore.put(record, id)
		}

		for (const [_prev, updated] of Object.values(changes.updated)) {
			await recordsStore.put(updated, updated.id)
		}

		for (const id of Object.keys(changes.removed)) {
			await recordsStore.delete(id)
		}

		schemaStore.put(schema.serialize(), 'schema')

		if (opts?.didCancel?.()) return tx.abort()

		await tx.done
	})
}

/** @internal */
export async function storeSnapshotInIndexedDb(
	universalPersistenceKey: string,
	schema: TLStoreSchema,
	snapshot: StoreSnapshot<any>,
	opts?: {
		didCancel?: () => boolean
	}
) {
	const storeId = STORE_PREFIX + universalPersistenceKey
	await withDb(storeId, async (db) => {
		const tx = db.transaction(['records', 'schema'], 'readwrite')
		const recordsStore = tx.objectStore('records')
		const schemaStore = tx.objectStore('schema')

		await recordsStore.clear()

		for (const [id, record] of Object.entries(snapshot)) {
			await recordsStore.put(record, id)
		}

		schemaStore.put(schema.serialize(), 'schema')

		if (opts?.didCancel?.()) return tx.abort()

		await tx.done
	})
}

/** @internal */
export function clearDb(universalPersistenceKey: string) {
	const dbId = STORE_PREFIX + universalPersistenceKey
	indexedDB.deleteDatabase(dbId)
}
