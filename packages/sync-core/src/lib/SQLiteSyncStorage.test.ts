import { DatabaseSync } from 'node:sqlite'
import { DocumentRecordType, PageRecordType, TLDOCUMENT_ID, TLRecord } from '@tldraw/tlschema'
import { ZERO_INDEX_KEY } from '@tldraw/utils'
import { describe, expect, it } from 'vitest'
import {
	contractRecords,
	contractSchema,
	makeContractSnapshot,
	makePage,
	registerStorageContractTests,
} from '../test/storageContractSuite'
import { NodeSqliteWrapper } from './NodeSqliteWrapper'
import { SQLiteSyncStorage } from './SQLiteSyncStorage'

function createWrapper(config?: { tablePrefix?: string }) {
	return new NodeSqliteWrapper(new DatabaseSync(':memory:'), config)
}

describe('SQLiteSyncStorage', () => {
	registerStorageContractTests({
		create: (opts) => new SQLiteSyncStorage<TLRecord>({ sql: createWrapper(), ...opts }),
	})

	describe('persistence and initialization', () => {
		it('[SQ1] data persists across re-instantiation over the same database', () => {
			const sql = createWrapper()
			const storage = new SQLiteSyncStorage<TLRecord>({
				sql,
				snapshot: makeContractSnapshot(contractRecords),
			})
			const newPage = makePage('persisted')
			storage.transaction((txn) => txn.set(newPage.id, newPage))

			const reopened = new SQLiteSyncStorage<TLRecord>({ sql })
			expect(reopened.getClock()).toBe(1)
			expect(
				reopened.getSnapshot().documents.find((d) => d.state.id === newPage.id)?.state
			).toEqual(newPage)
		})

		it('[SQ1] sweeps pre-partition object-lane rows out of the documents table on reopen', () => {
			// a database written before the objects table existed: object-lane records (here
			// 'page' stands in) live in the documents table
			const sql = createWrapper()
			const storage = new SQLiteSyncStorage<TLRecord>({
				sql,
				snapshot: makeContractSnapshot(contractRecords),
			})
			const extraPage = makePage('legacy')
			storage.transaction((txn) => txn.set(extraPage.id, extraPage))
			expect(storage.getSnapshot().documents).toHaveLength(3)

			// reopening with objectTypes moves the rows into the objects partition
			const reopened = new SQLiteSyncStorage<TLRecord>({ sql, objectTypes: ['page'] })
			expect(reopened.getSnapshot().documents.map((d) => d.state.typeName)).toEqual(['document'])
			expect(
				reopened
					.getObjectsSnapshot()
					.map((d) => d.state.id)
					.sort()
			).toEqual([contractRecords[1].id, extraPage.id].sort())
			// lastChangedClock survives the move
			expect(
				reopened.getObjectsSnapshot().find((d) => d.state.id === extraPage.id)?.lastChangedClock
			).toBe(1)
		})

		it('[SQ1] honors the table prefix', () => {
			const sql = createWrapper({ tablePrefix: 'tldraw_' })
			const storage = new SQLiteSyncStorage<TLRecord>({
				sql,
				snapshot: makeContractSnapshot(contractRecords, { documentClock: 7 }),
			})
			expect(storage.getClock()).toBe(7)
			// the prefixed tables exist; the unprefixed ones do not
			expect(sql.prepare('SELECT count(*) as count FROM tldraw_documents').all()).toEqual([
				{ count: 2 },
			])
			expect(() => sql.prepare('SELECT count(*) as count FROM documents').all()).toThrow()
		})

		it('[SQ2] a provided snapshot wipes and replaces existing data', () => {
			const sql = createWrapper()
			const storage = new SQLiteSyncStorage<TLRecord>({
				sql,
				snapshot: makeContractSnapshot(contractRecords, { documentClock: 10 }),
			})
			const extra = makePage('extra')
			storage.transaction((txn) => txn.set(extra.id, extra))

			const replacement = makeContractSnapshot([contractRecords[0]], { documentClock: 3 })
			const reinitialized = new SQLiteSyncStorage<TLRecord>({ sql, snapshot: replacement })
			expect(reinitialized.getClock()).toBe(3)
			expect(reinitialized.getSnapshot().documents.map((d) => d.state.id)).toEqual([
				contractRecords[0].id,
			])
		})

		it('[SQ2] without a snapshot, pre-existing data is kept untouched', () => {
			const sql = createWrapper()
			new SQLiteSyncStorage<TLRecord>({
				sql,
				snapshot: makeContractSnapshot(contractRecords, { documentClock: 9 }),
			})
			const reopened = new SQLiteSyncStorage<TLRecord>({ sql })
			expect(reopened.getClock()).toBe(9)
			expect(reopened.getSnapshot().documents.length).toBe(2)
		})

		it('[SQ2] accepts a StoreSnapshot and converts it', () => {
			const sql = createWrapper()
			const storage = new SQLiteSyncStorage<TLRecord>({
				sql,
				snapshot: {
					store: {
						[TLDOCUMENT_ID]: contractRecords[0],
						[contractRecords[1].id]: contractRecords[1],
					} as any,
					schema: contractSchema.serialize(),
				},
			})
			const snapshot = storage.getSnapshot()
			expect(snapshot.documentClock).toBe(0)
			expect(snapshot.documents.length).toBe(2)
			expect(snapshot.documents.every((d) => d.lastChangedClock === 0)).toBe(true)
			expect(snapshot.tombstones).toEqual({})
		})
	})

	describe('clock handling vs the in-memory implementation', () => {
		it('[SQ3] takes documentClock verbatim, without clamping to lastChangedClock', () => {
			const storage = new SQLiteSyncStorage<TLRecord>({
				sql: createWrapper(),
				snapshot: makeContractSnapshot(contractRecords, {
					documents: [
						{ state: contractRecords[0], lastChangedClock: 10 },
						{ state: contractRecords[1], lastChangedClock: 3 },
					],
					documentClock: 3,
				}),
			})
			expect(storage.getClock()).toBe(3)
		})

		it('[SQ3] takes tombstoneHistoryStartsAtClock verbatim and keeps tombstones with an empty history window', () => {
			const storage = new SQLiteSyncStorage<TLRecord>({
				sql: createWrapper(),
				snapshot: makeContractSnapshot(contractRecords, {
					tombstones: { 'shape:deleted1': 5 },
					tombstoneHistoryStartsAtClock: 15,
					documentClock: 15,
				}),
			})
			const snapshot = storage.getSnapshot()
			expect(snapshot.tombstoneHistoryStartsAtClock).toBe(15)
			expect(snapshot.tombstones).toEqual({ 'shape:deleted1': 5 })
		})
	})

	describe('static methods', () => {
		it('[SQ4] hasBeenInitialized is false for an empty database and true once initialized', () => {
			const sql = createWrapper()
			expect(SQLiteSyncStorage.hasBeenInitialized(sql)).toBe(false)
			new SQLiteSyncStorage<TLRecord>({ sql, snapshot: makeContractSnapshot(contractRecords) })
			expect(SQLiteSyncStorage.hasBeenInitialized(sql)).toBe(true)
		})

		it('[SQ4] hasBeenInitialized respects the table prefix', () => {
			const sql = createWrapper({ tablePrefix: 'test_' })
			expect(SQLiteSyncStorage.hasBeenInitialized(sql)).toBe(false)
			new SQLiteSyncStorage<TLRecord>({ sql, snapshot: makeContractSnapshot(contractRecords) })
			expect(SQLiteSyncStorage.hasBeenInitialized(sql)).toBe(true)
		})

		it('[SQ5] getDocumentClock returns null when uninitialized, the persisted clock afterwards', () => {
			const sql = createWrapper()
			expect(SQLiteSyncStorage.getDocumentClock(sql)).toBe(null)

			const storage = new SQLiteSyncStorage<TLRecord>({
				sql,
				snapshot: makeContractSnapshot(contractRecords, { documentClock: 42 }),
			})
			expect(SQLiteSyncStorage.getDocumentClock(sql)).toBe(42)

			const newPage = makePage('test_page')
			storage.transaction((txn) => txn.set(newPage.id, newPage))
			expect(SQLiteSyncStorage.getDocumentClock(sql)).toBe(43)
		})
	})

	describe('storage format migrations', () => {
		it('[SQ6] stores document state as JSON-encoded BLOBs', () => {
			const sql = createWrapper()
			new SQLiteSyncStorage<TLRecord>({
				sql,
				snapshot: makeContractSnapshot(contractRecords),
			})
			const row = sql
				.prepare<{ state: Uint8Array }>('SELECT state FROM documents WHERE id = ?')
				.all(TLDOCUMENT_ID as any)[0]
			// node:sqlite may hand back a Uint8Array from another realm, so avoid instanceof
			expect(typeof row.state).not.toBe('string')
			expect(ArrayBuffer.isView(row.state)).toBe(true)
			expect(JSON.parse(new TextDecoder().decode(row.state))).toEqual(contractRecords[0])
		})

		it('[SQ6] migrates v1 databases (TEXT column) to BLOB, preserving data', () => {
			// simulate a database created by the v1 schema
			const db = new DatabaseSync(':memory:')
			db.exec(`
				CREATE TABLE documents (
					id TEXT PRIMARY KEY,
					state TEXT NOT NULL,
					lastChangedClock INTEGER NOT NULL
				);
				CREATE INDEX idx_documents_lastChangedClock ON documents(lastChangedClock);
				CREATE TABLE tombstones (
					id TEXT PRIMARY KEY,
					clock INTEGER NOT NULL
				);
				CREATE INDEX idx_tombstones_clock ON tombstones(clock);
				CREATE TABLE metadata (
					migrationVersion INTEGER NOT NULL,
					documentClock INTEGER NOT NULL,
					tombstoneHistoryStartsAtClock INTEGER NOT NULL,
					schema TEXT NOT NULL
				);
				INSERT INTO metadata (migrationVersion, documentClock, tombstoneHistoryStartsAtClock, schema)
				VALUES (1, 5, 0, '${JSON.stringify(contractSchema.serialize()).replace(/'/g, "''")}');
			`)
			const doc = DocumentRecordType.create({ id: TLDOCUMENT_ID })
			const page = PageRecordType.create({
				id: PageRecordType.createId('migrated_page'),
				name: 'Migrated Page',
				index: ZERO_INDEX_KEY,
			})
			const insert = db.prepare(
				'INSERT INTO documents (id, state, lastChangedClock) VALUES (?, ?, ?)'
			)
			insert.run(doc.id, JSON.stringify(doc), 1)
			insert.run(page.id, JSON.stringify(page), 2)
			db.exec("INSERT INTO tombstones (id, clock) VALUES ('shape:deleted', 3)")

			const storage = new SQLiteSyncStorage<TLRecord>({ sql: new NodeSqliteWrapper(db) })

			const snapshot = storage.getSnapshot()
			expect(snapshot.documentClock).toBe(5)
			expect(snapshot.documents.map((d) => d.state.id).sort()).toEqual([doc.id, page.id].sort())
			expect(snapshot.tombstones).toEqual({ 'shape:deleted': 3 })

			// still writable after migration
			const newPage = makePage('new_after_migration')
			storage.transaction((txn) => txn.set(newPage.id, newPage))
			expect(storage.getSnapshot().documents.length).toBe(3)
		})

		it('[SQ6] fresh databases start at migration version 3', () => {
			const sql = createWrapper()
			new SQLiteSyncStorage<TLRecord>({ sql, snapshot: makeContractSnapshot(contractRecords) })
			const row = sql
				.prepare<{ migrationVersion: number }>('SELECT migrationVersion FROM metadata')
				.all()[0]
			expect(row?.migrationVersion).toBe(3)
		})
	})
})
