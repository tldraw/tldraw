import { TLPersistentStorage } from '@tldraw/store'
import { SqlLiteSyncStorage } from '@tldraw/sync-core'
import { TLRecord } from '@tldraw/tlschema'
import { TLDrawDurableObject } from './TLDrawDurableObject'

/**
 * Durable Object for tldraw files that uses SQLite for persistence.
 * Extends TLDrawDurableObject and overrides storage to use SqlLiteSyncStorage.
 */
export class TLFileDurableObject extends TLDrawDurableObject {
	getHasBeenInitialized(): boolean {
		try {
			return this.ctx.storage.sql.exec('SELECT 1 FROM clock LIMIT 1').toArray().length > 0
		} catch (_e) {
			return false
		}
	}
	override getStorage(): Promise<TLPersistentStorage<TLRecord>> {
		if (!this._documentInfo) {
			throw new Error('documentInfo must be present when accessing room')
		}

		if (!this._storage) {
			// Use SQLite storage instead of loading from database
			// SQLite storage will initialize tables idempotently and load existing data
			if (SqlLiteSyncStorage.hasBeenInitialized(this.ctx.storage)) {
				this._storage = Promise.resolve(new SqlLiteSyncStorage<TLRecord>(this.ctx.storage))
			} else {
				this._storage = this.loadFromDatabase(this._documentInfo.slug).then(async (result) => {
					switch (result.type) {
						case 'room_found': {
							return new SqlLiteSyncStorage<TLRecord>(this.ctx.storage, result.snapshot)
						}
						default: {
							return new SqlLiteSyncStorage<TLRecord>(this.ctx.storage)
						}
					}
				})
			}
		}

		return this._storage
	}

	// Override persistToDatabase to be a noop since SQLite handles persistence automatically
	override async persistToDatabase() {
		// No-op: SQLite storage handles persistence automatically
		// Historical snapshots will be handled separately later
	}
}
