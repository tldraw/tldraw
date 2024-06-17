import { IDBPDatabase, openDB } from 'idb'

// DO NOT CHANGE THESE WITHOUT ADDING MIGRATION LOGIC. DOING SO WOULD WIPE ALL EXISTING DATA.
const STORE_PREFIX = 'TLDRAW_ASSET_STORE_v1'

const Table = {
	Assets: 'assets',
} as const

type StoreName = (typeof Table)[keyof typeof Table]

async function withDb<T>(storeId: string, cb: (db: IDBPDatabase<StoreName>) => Promise<T>) {
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
