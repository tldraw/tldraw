import { RecordsDiff, SerializedSchema, SerializedStore } from '@tldraw/store'
import { TLRecord, TLStoreSchema } from '@tldraw/tlschema'
import { assert, getFromLocalStorage, noop, setInLocalStorage } from '@tldraw/utils'
import { IDBPDatabase, IDBPTransaction, deleteDB, openDB } from 'idb'
import { TLSessionStateSnapshot } from '../../config/TLSessionStateSnapshot'

// DO NOT CHANGE THESE WITHOUT ADDING MIGRATION LOGIC. DOING SO WOULD WIPE ALL EXISTING DATA.
const STORE_PREFIX = 'TLDRAW_DOCUMENT_v2'
const LEGACY_ASSET_STORE_PREFIX = 'TLDRAW_ASSET_STORE_v1'
const dbNameIndexKey = 'TLDRAW_DB_NAME_INDEX_v2'

/** @internal */
export const Table = {
	Records: 'records',
	Schema: 'schema',
	SessionState: 'session_state',
	Assets: 'assets',
} as const

/** @internal */
export type StoreName = (typeof Table)[keyof typeof Table]

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
export class LocalIndexedDb {
	private getDbPromise: Promise<IDBPDatabase<StoreName>>
	private isClosed = false
	private pendingTransactionSet = new Set<Promise<unknown>>()

	/** @internal */
	static connectedInstances = new Set<LocalIndexedDb>()

	constructor(persistenceKey: string) {
		LocalIndexedDb.connectedInstances.add(this)
		this.getDbPromise = (async () => {
			await migrateLegacyAssetDbIfNeeded(persistenceKey)
			return await openLocalDb(persistenceKey)
		})()
	}

	private getDb() {
		return this.getDbPromise
	}

	/**
	 * Wait for any pending transactions to be completed. Useful for tests.
	 *
	 * @internal
	 */
	pending(): Promise<void> {
		return Promise.allSettled([this.getDbPromise, ...this.pendingTransactionSet]).then(noop)
	}

	async close() {
		if (this.isClosed) return
		this.isClosed = true
		await this.pending()
		;(await this.getDb()).close()
		LocalIndexedDb.connectedInstances.delete(this)
	}

	private tx<Names extends StoreName[], Mode extends IDBTransactionMode, T>(
		mode: Mode,
		names: Names,
		cb: (tx: IDBPTransaction<StoreName, Names, Mode>) => Promise<T>
	): Promise<T> {
		const txPromise = (async () => {
			assert(!this.isClosed, 'db is closed')
			const db = await this.getDb()
			const tx = db.transaction(names, mode)
			// need to add a catch here early to prevent unhandled promise rejection
			// during react-strict-mode where this tx.done promise can be rejected
			// before we have a chance to await on it
			const done = tx.done.catch((e: unknown) => {
				if (!this.isClosed) {
					throw e
				}
			})
			try {
				return await cb(tx)
			} finally {
				if (!this.isClosed) {
					await done
				} else {
					tx.abort()
				}
			}
		})()
		this.pendingTransactionSet.add(txPromise)
		txPromise.finally(() => this.pendingTransactionSet.delete(txPromise))
		return txPromise
	}

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
			} else if (sessionStateSnapshot || sessionId) {
				console.error('sessionStateSnapshot and instanceId must be provided together')
			}
		})
	}

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
			} else if (sessionStateSnapshot || sessionId) {
				console.error('sessionStateSnapshot and instanceId must be provided together')
			}
		})
	}

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

	async getAsset(assetId: string): Promise<File | undefined> {
		return await this.tx('readonly', [Table.Assets], async (tx) => {
			const assetsStore = tx.objectStore(Table.Assets)
			return await assetsStore.get(assetId)
		})
	}

	async storeAsset(assetId: string, blob: File) {
		await this.tx('readwrite', [Table.Assets], async (tx) => {
			const assetsStore = tx.objectStore(Table.Assets)
			await assetsStore.put(blob, assetId)
		})
	}

	async removeAssets(assetId: string[]) {
		await this.tx('readwrite', [Table.Assets], async (tx) => {
			const assetsStore = tx.objectStore(Table.Assets)
			for (const id of assetId) {
				await assetsStore.delete(id)
			}
		})
	}
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
