import { getFromLocalStorage, setInLocalStorage } from '@tldraw/editor'
import { IDBPDatabase, openDB } from 'idb'

// DO NOT CHANGE THESE WITHOUT ADDING MIGRATION LOGIC. DOING SO WOULD WIPE ALL EXISTING DATA.
const STORE_PREFIX = 'TLDRAW_ASSET_STORE_v1'
// N.B. This isn't very clean b/c it's relying on that this is the same as the editor's key
// in indexedDb.ts. This is to make sure that hard reset also clears this asset store.
const dbNameIndexKey = 'TLDRAW_DB_NAME_INDEX_v2'

const Table = {
	Assets: 'assets',
} as const

type StoreName = (typeof Table)[keyof typeof Table]

async function withDb<T>(storeId: string, cb: (db: IDBPDatabase<StoreName>) => Promise<T>) {
	addDbName(storeId)
	const db = await openDB<StoreName>(storeId, 1, {
		upgrade(database) {
			if (!database.objectStoreNames.contains(Table.Assets)) {
				database.createObjectStore(Table.Assets)
			}
		},
	})
	try {
		return await cb(db)
	} finally {
		db.close()
	}
}

/** @public */
export async function getAssetFromIndexedDb({
	persistenceKey,
	assetId,
}: {
	persistenceKey: string
	assetId: string
}): Promise<Blob | undefined> {
	const storeId = STORE_PREFIX + persistenceKey

	return await withDb(storeId, async (db) => {
		const tx = db.transaction([Table.Assets], 'readwrite')
		const assetsStore = tx.objectStore(Table.Assets)
		return await assetsStore.get(assetId)
	})
}

/** @public */
export async function storeAssetInIndexedDb({
	persistenceKey,
	assetId,
	blob,
}: {
	persistenceKey: string
	assetId: string
	blob: Blob
}) {
	const storeId = STORE_PREFIX + persistenceKey

	await withDb(storeId, async (db) => {
		const tx = db.transaction([Table.Assets], 'readwrite')
		const assetsStore = tx.objectStore(Table.Assets)
		await assetsStore.put(blob, assetId)
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
