import {
	DurableObjectSqliteSyncWrapper,
	SqlLiteSyncStorage,
	TLSyncStorage,
} from '@tldraw/sync-core'
import { TLRecord } from '@tldraw/tlschema'
import { TLDrawDurableObject } from './TLDrawDurableObject'
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

		const sql = new DurableObjectSqliteSyncWrapper(this.ctx.storage)

		if (SqlLiteSyncStorage.hasBeenInitialized(sql)) {
			return new SqlLiteSyncStorage<TLRecord>({ sql })
		}

		const result = await this.loadFromDatabase(slug)
		switch (result.type) {
			case 'room_found': {
				const storage = new SqlLiteSyncStorage<TLRecord>({ sql, snapshot: result.snapshot })
				// In case it's an old snapshot with no usage percentage set, set it now.
				// This should not await because it calls getStorage under the hood which
				// will only resolve once this function has returned.
				this.setRoomStorageUsedPercentage(result.roomSizeMB)
				return storage
			}
			default: {
				return new SqlLiteSyncStorage<TLRecord>({ sql })
			}
		}
	}
}
