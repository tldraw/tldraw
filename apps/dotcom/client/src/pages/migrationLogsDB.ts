import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'migration-errors'
const DB_VERSION = 1
const STORE_NAME = 'errors'

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
	if (!dbPromise) {
		dbPromise = openDB(DB_NAME, DB_VERSION, {
			upgrade(db, _oldVersion, _newVersion, _transaction) {
				db.createObjectStore(STORE_NAME, {
					keyPath: 'id',
					autoIncrement: true,
				})
			},
		})
	}
	return dbPromise
}

export async function saveMigrationLog(entry: object): Promise<void> {
	const db = await getDB()
	await db.add(STORE_NAME, entry)
}
