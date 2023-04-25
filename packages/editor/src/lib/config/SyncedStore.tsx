import { TLStore } from '@tldraw/tlschema'

/** @public */
export interface ReadySyncedStore {
	readonly status: 'synced'
	readonly store: TLStore
	readonly error?: undefined
}

/** @public */
export interface ErrorSyncedStore {
	readonly status: 'error'
	readonly store?: undefined
	readonly error: Error
}

/** @public */
export interface InitializingSyncedStore {
	readonly status: 'loading'
	readonly store?: undefined
	readonly error?: undefined
}

/** @public */
export type SyncedStore = ReadySyncedStore | ErrorSyncedStore | InitializingSyncedStore
