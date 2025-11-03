/// <reference no-default-lib="true"/>
/// <reference types="@cloudflare/workers-types" />

import { SerializedSchema } from '@tldraw/store'
import { RoomSnapshot, squashSyncDiffsMutable, SyncDiff } from '@tldraw/sync-core'
import { createTLSchema, TLRecord } from '@tldraw/tlschema'
import { objectMapEntries } from '@tldraw/utils'
import { SQLITE_FLUSH_INTERVAL_MS } from './config'
import {
	FileDOMetadataRow,
	FileDORecordRow,
	migrate,
} from './fileDurableObject/fileDurableObjectMigrations'
import { Logger } from './Logger'
import { TLDrawDurableObject } from './TLDrawDurableObject'
import { DBLoadResult, Environment } from './types'
import { throttle } from './utils/throttle'

/**
 * A durable object that extends TLDrawDurableObject with SQLite-backed persistence.
 * This provides efficient incremental updates using diff-based writes to SQLite,
 * while maintaining R2 as a periodic backup mechanism.
 */
export class TLFileDurableObject extends TLDrawDurableObject {
	protected readonly sqliteDb: SqlStorage
	protected readonly log: Logger

	constructor(state: DurableObjectState, env: Environment) {
		super(state, env)
		this.sqliteDb = this.ctx.storage.sql
		this.log = new Logger(env, 'TLFileDurableObject', this.sentry ?? undefined)
	}

	// Diff accumulation for batched persistence
	protected pendingSyncDiff: SyncDiff<TLRecord> | null = null

	private didUpdateSchema = false
	private maybeUpdateSchema() {
		if (this.didUpdateSchema) return
		this.didUpdateSchema = true
		this.sqliteDb.exec(
			'UPDATE metadata SET schema = ?',
			JSON.stringify(createTLSchema().serialize())
		)
	}

	/**
	 * Queue a diff for persistence. Diffs are accumulated using squashSyncDiffsMutable
	 * and flushed periodically.
	 */
	override handleDataChange(diff?: SyncDiff<TLRecord>): void {
		if (!diff) return

		if (!this.pendingSyncDiff) {
			// First diff, clone it
			this.pendingSyncDiff = {
				added: { ...diff.added },
				updated: { ...diff.updated },
				removed: { ...diff.removed },
				tombstoneHistoryStartsAt: diff.tombstoneHistoryStartsAt,
				documentClock: diff.documentClock,
				serverClock: diff.serverClock,
			}
		} else {
			// Squash into existing diff (keeps latest clocks)
			squashSyncDiffsMutable(this.pendingSyncDiff, [diff])
		}
		this.flushPendingDiffs()
	}

	/**
	 * Flush the accumulated diff by persisting it.
	 */
	flushPendingDiffs = throttle(async () => {
		if (!this.pendingSyncDiff) return

		const diffToFlush = this.pendingSyncDiff
		this.pendingSyncDiff = null

		this.persistDiffToSQLite(diffToFlush)
	}, SQLITE_FLUSH_INTERVAL_MS)

	/**
	 * Initialize SQLite schema for storing records, tombstones, and metadata.
	 * @protected
	 */
	protected initializePersistenceLayer(): void {
		// Run database migrations
		migrate(this.sqliteDb, this.log)
	}

	protected override async loadFromDatabase(slug: string): Promise<DBLoadResult> {
		const localRoom = this.maybeLoadLocalRoom()
		if (localRoom) {
			return {
				type: 'room_found',
				snapshot: localRoom,
				roomSizeMB: 0,
			}
		}
		const res = await super.loadFromDatabase(slug)
		if (res.type === 'room_found') {
			this.initializePersistenceLayer()
			this.hydrateSQLiteFromSnapshot(res.snapshot)
		}
		return res
	}

	/**
	 * Load room from SQLite if available and fresh, otherwise fall back to R2.
	 * @protected
	 */
	maybeLoadLocalRoom(): RoomSnapshot | null {
		const records = this.sqliteDb.exec<FileDORecordRow>('SELECT * FROM records').toArray()
		const tombstones = this.sqliteDb.exec('SELECT * FROM tombstones').toArray()
		const metadataRows = this.sqliteDb.exec<FileDOMetadataRow>('SELECT * FROM metadata').toArray()

		if (records.length === 0) return null
		assert(metadataRows.length === 1, 'Expected exactly one metadata row')
		const metadata = metadataRows[0]

		return {
			documents: records.map((r: any) => ({
				state: JSON.parse(r.data as string),
				lastChangedClock: r.lastChangedClock as number,
			})),
			tombstones: Object.fromEntries(
				tombstones.map((t: any) => [t.id as string, t.deletedAtClock as number])
			),
			tombstoneHistoryStartsAtClock: metadata.tombstoneHistoryStartsAtClock as number,
			schema: JSON.parse(metadata.schema as string) as SerializedSchema,
			documentClock: metadata.documentClock as number,
			clock: metadata.serverClock as number,
		} satisfies Required<RoomSnapshot>
	}

	/**
	 * Hydrate SQLite with data from a room snapshot (typically from R2).
	 * @private
	 */
	private async hydrateSQLiteFromSnapshot(snapshot: RoomSnapshot): Promise<void> {
		this.sqliteDb.exec('BEGIN TRANSACTION')
		try {
			// Clear existing data
			this.sqliteDb.exec('DELETE FROM records')
			this.sqliteDb.exec('DELETE FROM tombstones')

			// Insert records
			for (const doc of snapshot.documents) {
				this.sqliteDb.exec(
					'INSERT INTO records VALUES (?, ?, ?, ?)',
					doc.state.id,
					doc.state.typeName,
					JSON.stringify(doc.state),
					doc.lastChangedClock
				)
			}

			// Insert tombstones
			for (const [id, clock] of Object.entries(snapshot.tombstones || {})) {
				this.sqliteDb.exec('INSERT INTO tombstones VALUES (?, ?)', id, clock)
			}

			// Insert metadata
			this.sqliteDb.exec(
				`INSERT OR REPLACE INTO metadata VALUES 
					('serverClock', ?),
					('documentClock', ?),
					('tombstoneHistoryStartsAtClock', ?),
					('lastModified', ?)`,
				snapshot.clock,
				snapshot.documentClock ?? snapshot.clock,
				snapshot.tombstoneHistoryStartsAtClock ?? 0,
				new Date().toISOString()
			)

			this.sqliteDb.exec('COMMIT')
		} catch (e) {
			this.sqliteDb.exec('ROLLBACK')
			throw e
		}
	}

	/**
	 * Apply incremental diff to SQLite, extracting per-record clocks from tuples.
	 * @private
	 */
	private persistDiffToSQLite(diff: SyncDiff<TLRecord>) {
		this.sqliteDb.exec('BEGIN TRANSACTION')
		try {
			this.maybeUpdateSchema()
			// Handle added records - extract clock from tuple
			for (const [id, [record, clock]] of objectMapEntries(diff.added)) {
				this.sqliteDb.exec(
					'INSERT OR REPLACE INTO records VALUES (?, ?, ?, ?)',
					id,
					record.typeName,
					JSON.stringify(record),
					clock // Per-record clock from tuple
				)
			}

			// Handle updated records - extract clock from tuple
			for (const [id, [_from, to, clock]] of objectMapEntries(diff.updated)) {
				this.sqliteDb.exec(
					'UPDATE records SET data = ?, lastChangedClock = ? WHERE id = ?',
					JSON.stringify(to),
					clock, // Per-record clock from tuple
					id
				)
			}

			// Handle removed records - extract clock from tuple
			for (const [id, [_record, clock]] of objectMapEntries(diff.removed)) {
				this.sqliteDb.exec('DELETE FROM records WHERE id = ?', id)
				this.sqliteDb.exec(
					'INSERT OR REPLACE INTO tombstones VALUES (?, ?)',
					id,
					clock // Per-record clock from tuple
				)
			}

			this.sqliteDb.exec(
				`INSERT OR REPLACE INTO metadata VALUES
						('serverClock', ?),
						('documentClock', ?),
						('tombstoneHistoryStartsAtClock', ?),
						('lastModified', ?)
				`,
				diff.serverClock,
				diff.documentClock,
				diff.tombstoneHistoryStartsAt,
				new Date().toISOString(),
			)

			this.sqliteDb.exec('COMMIT')
		} catch (e) {
			this.sqliteDb.exec('ROLLBACK')
			throw e
		}
	}
}
