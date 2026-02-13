import { DurableObjectSqliteSyncWrapper, SQLiteSyncStorage, TLSyncStorage } from '@tldraw/sync-core'
import { TLRecord } from '@tldraw/tlschema'
import { ROOM_NOT_FOUND, TLDrawDurableObject } from './TLDrawDurableObject'
import { getFeatureFlag } from './utils/featureFlags'

/**
 * Durable Object for tldraw files that uses SQLite for persistence when enabled.
 * Extends TLDrawDurableObject and overrides storage based on the sqlite_file_storage feature flag.
 */
export class TLFileDurableObject extends TLDrawDurableObject {
	override async loadStorage(slug: string): Promise<TLSyncStorage<TLRecord>> {
		const useSqlite = await getFeatureFlag(this.env, 'sqlite_file_storage')

		if (!useSqlite) {
			return super.loadStorage(slug)
		}

		try {
			const sql = new DurableObjectSqliteSyncWrapper(this.ctx.storage)
			const sqliteClock = SQLiteSyncStorage.getDocumentClock(sql)

			// If SQLite has been initialized, we need to check if R2 has fresher data.
			// This can happen if the sqlite_file_storage flag was toggled OFF then back ON,
			// since changes made while the flag was OFF would only be persisted to R2.
			if (sqliteClock !== null) {
				// Check the last persisted R2 clock (stored in DO storage during persist)
				// This is fast - just reading a number from DO storage, no R2 fetch needed
				const lastR2Clock = (await this.ctx.storage.get<number>('lastPersistedR2Clock')) ?? 0

				if (lastR2Clock > sqliteClock) {
					// R2 has fresher data, reinitialize SQLite from R2
					const result = await this.loadFromDatabase(slug)
					const storage = new SQLiteSyncStorage<TLRecord>({ sql, snapshot: result.snapshot })
					this.setRoomStorageUsedPercentage(result.roomSizeMB)
					return storage
				}

				// SQLite is up-to-date or fresher, use it directly
				return new SQLiteSyncStorage<TLRecord>({ sql })
			}

			// SQLite not initialized yet, load from R2 and initialize
			const result = await this.loadFromDatabase(slug)
			const storage = new SQLiteSyncStorage<TLRecord>({ sql, snapshot: result.snapshot })
			// We should not await on setRoomStorageUsedPercentage because it calls
			// getStorage under the hood which will only resolve once this function has returned.
			this.setRoomStorageUsedPercentage(result.roomSizeMB)
			return storage
		} catch (error) {
			if (error === ROOM_NOT_FOUND) {
				throw error
			}
			// report error and fallback to in-memory storage
			this.reportError(error)
			return super.loadStorage(slug)
		}
	}
}
