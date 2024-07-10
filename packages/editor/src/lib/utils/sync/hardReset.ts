import { clearLocalStorage, clearSessionStorage } from '@tldraw/utils'
import { deleteDB } from 'idb'
import { LocalIndexedDb, getAllIndexDbNames } from './LocalIndexedDb'

/**
 * Clear the database of all data associated with tldraw.
 *
 * @public */
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

if (typeof window !== 'undefined') {
	if (process.env.NODE_ENV === 'development') {
		;(window as any).hardReset = hardReset
	}
	// window.__tldraw__hardReset is used to inject the logic into the tldraw library
	;(window as any).__tldraw__hardReset = hardReset
}
