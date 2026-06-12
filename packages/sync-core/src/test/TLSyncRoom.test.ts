import { atom, computed } from '@tldraw/state'
import {
	BaseRecord,
	RecordId,
	SerializedSchema,
	SerializedSchemaV2,
	Store,
	StoreSchema,
	UnknownRecord,
	createMigrationIds,
	createMigrationSequence,
	createRecordMigrationSequence,
	createRecordType,
} from '@tldraw/store'
import {
	CameraRecordType,
	DocumentRecordType,
	InstancePageStateRecordType,
	InstancePresenceRecordType,
	PageRecordType,
	TLArrowShape,
	TLArrowShapeProps,
	TLBaseShape,
	TLDOCUMENT_ID,
	TLRecord,
	TLShapeId,
	createTLSchema,
	createUserId,
} from '@tldraw/tlschema'
import { IndexKey, ZERO_INDEX_KEY, mockUniqueId, sortById } from '@tldraw/utils'
import { vi, type Mock } from 'vitest'
import { RecordOpType } from '../lib/diff'
import { InMemorySyncStorage } from '../lib/InMemorySyncStorage'
import {
	TLConnectRequest,
	TLPushRequest,
	TLSocketServerSentEvent,
	getTlsyncProtocolVersion,
} from '../lib/protocol'
import {
	RoomSessionState,
	SESSION_IDLE_TIMEOUT,
	SESSION_REMOVAL_WAIT_TIME,
	SESSION_START_WAIT_TIME,
} from '../lib/RoomSession'
import {
	TLSyncClient,
	TLSyncErrorCloseEventCode,
	TLSyncErrorCloseEventReason,
} from '../lib/TLSyncClient'
import {
	DATA_MESSAGE_DEBOUNCE_INTERVAL,
	RoomSnapshot,
	TLRoomSocket,
	TLSyncRoom,
} from '../lib/TLSyncRoom'
import {
	TLSyncStorage,
	TLSyncStorageOnChangeCallbackProps,
	TLSyncStorageTransaction,
	TLSyncStorageTransactionCallback,
	TLSyncStorageTransactionOptions,
	TLSyncStorageTransactionResult,
} from '../lib/TLSyncStorage'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

// Some tests drive a real TLSyncClient, which schedules its pushes on
// requestAnimationFrame. Make that synchronous so flushing is deterministic.
// @ts-expect-error
global.requestAnimationFrame = (cb: () => any) => {
	cb()
}

const schema = createTLSchema()
const compareById = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)

const documentRecord = DocumentRecordType.create({ id: TLDOCUMENT_ID })
const pageRecord = PageRecordType.create({
	index: ZERO_INDEX_KEY,
	name: 'page 2',
	id: PageRecordType.createId('page_2'),
})

const records: TLRecord[] = [documentRecord, pageRecord].sort(compareById)

const makeSnapshot = (records: TLRecord[], others: Partial<RoomSnapshot> = {}) => ({
	documents: records.map((r) => ({ state: r, lastChangedClock: 0 })),
	clock: 0,
	documentClock: 0,
	schema: schema.serialize(),
	...others,
})

// Helper to create legacy snapshots without a documentClock field
const makeLegacySnapshot = (
	records: TLRecord[],
	others: Partial<Omit<RoomSnapshot, 'documentClock'>> = {}
) => ({
	documents: records.map((r) => ({ state: r, lastChangedClock: 0 })),
	clock: 0,
	...others,
})

const oldArrow: TLBaseShape<'arrow', Omit<TLArrowShapeProps, 'labelColor'>> = {
	typeName: 'shape',
	type: 'arrow',
	id: 'shape:old_arrow' as TLShapeId,
	index: ZERO_INDEX_KEY,
	isLocked: false,
	parentId: PageRecordType.createId(),
	rotation: 0,
	x: 0,
	y: 0,
	opacity: 1,
	props: {
		kind: 'arc',
		elbowMidPoint: 0.5,
		dash: 'draw',
		size: 'm',
		fill: 'none',
		color: 'black',
		bend: 0,
		start: { x: 0, y: 0 },
		end: { x: 0, y: 0 },
		arrowheadStart: 'none',
		arrowheadEnd: 'arrow',
		// @ts-ignore this is a legacy field
		text: '',
		font: 'draw',
		labelPosition: 0.5,
		scale: 1,
	},
	meta: {},
}

type MockSocket = TLRoomSocket<any> & {
	__lastMessage: null | TLSocketServerSentEvent<any>
	__messages: TLSocketServerSentEvent<any>[]
	sendMessage: Mock
	close: Mock
}

function makeSocket(): MockSocket {
	const socket: MockSocket = {
		__lastMessage: null,
		__messages: [],
		// cloning because the room reuses/clears message objects after sending
		// (a real socket serializes the message immediately)
		sendMessage: vi.fn((msg: TLSocketServerSentEvent<any>) => {
			const clone = structuredClone(msg)
			socket.__lastMessage = clone
			socket.__messages.push(clone)
		}),
		close: vi.fn(() => {
			socket.isOpen = false
		}),
		isOpen: true,
	}
	return socket
}

function sentMessages(socket: MockSocket): TLSocketServerSentEvent<any>[] {
	return socket.__messages
}

function sentDataMessages(socket: MockSocket): any[] {
	return sentMessages(socket).flatMap((msg: any) => (msg.type === 'data' ? msg.data : []))
}

function clearSocket(socket: MockSocket) {
	socket.sendMessage.mockClear()
	socket.__messages.length = 0
	socket.__lastMessage = null
}

function combinedPatchDiff(socket: MockSocket): Record<string, unknown> {
	return sentDataMessages(socket)
		.filter((msg) => msg.type === 'patch')
		.reduce((acc, patch) => ({ ...acc, ...patch.diff }), {})
}

const disposables: Array<() => void> = []

function makeRoom(
	opts: {
		snapshot?: RoomSnapshot
		clientTimeout?: number
		log?: { warn?: Mock; error?: Mock }
		onPresenceChange?(): void
	} = {}
) {
	const storage = new InMemorySyncStorage<TLRecord>({
		snapshot: opts.snapshot ?? makeSnapshot(records),
	})
	const room = new TLSyncRoom<TLRecord, undefined>({
		schema,
		storage,
		clientTimeout: opts.clientTimeout,
		log: opts.log,
		onPresenceChange: opts.onPresenceChange,
	})
	disposables.push(() => room.close())
	return { storage, room }
}

function connectSession(
	room: TLSyncRoom<any, any>,
	sessionId: string,
	opts: {
		isReadonly?: boolean
		protocolVersion?: number
		lastServerClock?: number
		schema?: SerializedSchema
		clear?: boolean
	} = {}
): MockSocket {
	const socket = makeSocket()
	room.handleNewSession({
		sessionId,
		socket,
		meta: undefined,
		isReadonly: opts.isReadonly ?? false,
	})
	room.handleMessage(sessionId, {
		type: 'connect',
		connectRequestId: 'connect-' + sessionId,
		lastServerClock: opts.lastServerClock ?? 0,
		protocolVersion: opts.protocolVersion ?? getTlsyncProtocolVersion(),
		schema: opts.schema ?? room.serializedSchema,
	} satisfies TLConnectRequest)
	if (opts.clear !== false) {
		clearSocket(socket)
	}
	return socket
}

function makePage(suffix: string, name: string, index = 'a2' as IndexKey) {
	return PageRecordType.create({ id: PageRecordType.createId(suffix), name, index })
}

function presencePut(userName = 'New User'): TLPushRequest<TLRecord>['presence'] {
	return [
		'put',
		InstancePresenceRecordType.create({
			id: InstancePresenceRecordType.createId('client-chosen'),
			currentPageId: pageRecord.id,
			userId: createUserId('user'),
			userName,
		}) as any,
	]
}

beforeEach(() => {
	let id = 0
	mockUniqueId(() => `id_${id++}`)
})

afterEach(() => {
	for (const dispose of disposables) {
		dispose()
	}
	disposables.length = 0
	vi.useRealTimers()
})

describe('22. Room construction (RC)', () => {
	it('[RC3] can be constructed with a storage, leaving current data unchanged', () => {
		const storage = new InMemorySyncStorage<TLRecord>({ snapshot: makeSnapshot(records) })
		const _room = new TLSyncRoom<TLRecord, undefined>({
			schema,
			storage,
		})

		expect(
			storage
				.getSnapshot()
				.documents.map((r) => r.state)
				.sort(sortById)
		).toEqual(records)

		expect(storage.getSnapshot().documents.map((r) => r.lastChangedClock)).toEqual([0, 0])
	})

	it('[RC3] migrates the snapshot if it is dealing with old data', () => {
		const serializedSchema = schema.serialize()
		const oldSerializedSchema: SerializedSchemaV2 = {
			schemaVersion: 2,
			sequences: {
				...serializedSchema.sequences,
				'com.tldraw.shape.arrow': 0,
			},
		}

		const storage = new InMemorySyncStorage<TLRecord>({
			snapshot: makeSnapshot([...records, oldArrow as any], {
				schema: oldSerializedSchema,
			}),
		})
		const _room = new TLSyncRoom<TLRecord, undefined>({
			schema,
			storage,
		})

		const arrow = storage.getSnapshot().documents.find((r) => r.state.id === oldArrow.id)
			?.state as TLArrowShape
		expect(arrow.props.labelColor).toBe('black')
	})

	it('[RC3] filters out instance state records if a migration occurs, for legacy reasons', () => {
		const schema = createTLSchema()
		const oldSchema = structuredClone(schema.serialize())
		oldSchema.sequences['com.tldraw.shape.arrow'] = 0
		const storage = new InMemorySyncStorage<TLRecord>({
			snapshot: makeSnapshot(
				[
					...records,
					schema.types.instance.create({
						currentPageId: PageRecordType.createId('page_1'),
						id: schema.types.instance.createId('instance_1'),
					}),
					InstancePageStateRecordType.create({
						id: InstancePageStateRecordType.createId(PageRecordType.createId('page_1')),
						pageId: PageRecordType.createId('page_1'),
					}),
					CameraRecordType.create({
						id: CameraRecordType.createId('camera_1'),
					}),
				],
				{
					schema: oldSchema,
				}
			),
		})
		const _room = new TLSyncRoom({ schema, storage })

		expect(
			storage
				.getSnapshot()
				.documents.map((r) => r.state)
				.sort(sortById)
		).toEqual(records)
	})

	it('[RC3] running migrations twice does not cause issues', () => {
		const serializedSchema = schema.serialize()
		const oldSerializedSchema: SerializedSchemaV2 = {
			schemaVersion: 2,
			sequences: {
				...serializedSchema.sequences,
				'com.tldraw.shape.arrow': 0,
			},
		}

		const storage = new InMemorySyncStorage<TLRecord>({
			snapshot: makeSnapshot([...records, oldArrow as any], {
				schema: oldSerializedSchema,
			}),
		})

		// First migration (simulating what TLSyncRoom constructor does)
		const _room1 = new TLSyncRoom<TLRecord, undefined>({
			schema,
			storage,
		})

		// Get state after first migration
		const snapshotAfterFirst = storage.getSnapshot()
		const arrowAfterFirst = snapshotAfterFirst.documents.find((r) => r.state.id === oldArrow.id)
			?.state as TLArrowShape

		// Verify migration happened
		expect(arrowAfterFirst.props.labelColor).toBe('black')

		// Create another room with the same storage (simulating a second migration attempt)
		const _room2 = new TLSyncRoom<TLRecord, undefined>({
			schema,
			storage,
		})

		// Get state after second "migration"
		const snapshotAfterSecond = storage.getSnapshot()
		const arrowAfterSecond = snapshotAfterSecond.documents.find((r) => r.state.id === oldArrow.id)
			?.state as TLArrowShape

		// Should still have the migrated value
		expect(arrowAfterSecond.props.labelColor).toBe('black')

		// Document count should be the same
		expect(snapshotAfterSecond.documents.length).toBe(snapshotAfterFirst.documents.length)

		// Schema should be up to date
		expect(snapshotAfterSecond.schema).toEqual(schema.serialize())
	})

	it('[RC3] already migrated data is not modified again', () => {
		// Start with current schema (no migration needed)
		const storage = new InMemorySyncStorage<TLRecord>({
			snapshot: makeSnapshot(records, {
				documentClock: 10,
			}),
		})

		const clockBefore = storage.getClock()

		// Create room - should not modify anything since schema is current
		const _room = new TLSyncRoom<TLRecord, undefined>({
			schema,
			storage,
		})

		// Clock should not have changed since no migration was needed
		expect(storage.getClock()).toBe(clockBefore)

		// Documents should be unchanged
		expect(storage.getSnapshot().documents.length).toBe(2)
	})

	it('[RC3] migration updates the schema version in storage', () => {
		const serializedSchema = schema.serialize()
		const oldSerializedSchema: SerializedSchemaV2 = {
			schemaVersion: 2,
			sequences: {
				...serializedSchema.sequences,
				'com.tldraw.shape.arrow': 0,
			},
		}

		const storage = new InMemorySyncStorage<TLRecord>({
			snapshot: makeSnapshot([...records, oldArrow as any], {
				schema: oldSerializedSchema,
			}),
		})

		// Verify old schema before room creation
		expect(storage.schema.get()).toEqual(oldSerializedSchema)

		// Create room which triggers migration
		const _room = new TLSyncRoom<TLRecord, undefined>({
			schema,
			storage,
		})

		// Schema should now be updated to current version
		expect(storage.schema.get()).toEqual(schema.serialize())
	})

	describe('legacy snapshots without a documentClock field', () => {
		it('[SS17] can load a snapshot without a documentClock field', () => {
			const legacySnapshot = makeLegacySnapshot(records)

			const storage = new InMemorySyncStorage<TLRecord>({ snapshot: legacySnapshot })
			const _room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

			// Room should load successfully without errors
			expect(storage.getSnapshot().documents.length).toBe(2)

			// documentClock should be calculated from existing data
			const snapshot = storage.getSnapshot()
			expect(snapshot.documentClock).toBe(0) // max lastChangedClock from documents
		})

		it('[IM1] calculates documentClock correctly from documents with different lastChangedClock values', () => {
			const legacySnapshot = makeLegacySnapshot(records, {
				documents: [
					{ state: records[0], lastChangedClock: 5 },
					{ state: records[1], lastChangedClock: 10 },
				],
			})

			const storage = new InMemorySyncStorage<TLRecord>({ snapshot: legacySnapshot })
			const _room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

			const snapshot = storage.getSnapshot()
			expect(snapshot.documentClock).toBe(10) // max lastChangedClock
		})

		it('[IM1] calculates documentClock correctly from tombstones', () => {
			const legacySnapshot = makeLegacySnapshot(records, {
				documents: [{ state: records[0], lastChangedClock: 3 }],
				tombstones: {
					'shape:deleted1': 7,
					'shape:deleted2': 12,
				},
			})

			const storage = new InMemorySyncStorage<TLRecord>({ snapshot: legacySnapshot })
			const _room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

			const snapshot = storage.getSnapshot()
			expect(snapshot.documentClock).toBe(12) // max of document (3) and tombstones (7, 12)
		})

		it('[SS17] handles an empty snapshot gracefully', () => {
			const emptyLegacySnapshot = makeLegacySnapshot([], {
				documents: [],
				tombstones: {},
			})

			const storage = new InMemorySyncStorage<TLRecord>({ snapshot: emptyLegacySnapshot })
			const _room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

			const snapshot = storage.getSnapshot()
			expect(snapshot.documentClock).toBe(0) // no documents or tombstones
		})

		it('[IM1] handles a snapshot with only tombstones', () => {
			const legacySnapshot = makeLegacySnapshot([], {
				documents: [],
				tombstones: {
					'shape:deleted1': 5,
					'shape:deleted2': 8,
				},
			})

			const storage = new InMemorySyncStorage<TLRecord>({ snapshot: legacySnapshot })
			const _room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

			const snapshot = storage.getSnapshot()
			expect(snapshot.documentClock).toBe(8) // max tombstone clock
		})

		it('[SS17] preserves an explicit documentClock when present', () => {
			const snapshotWithDocumentClock = makeSnapshot(records, {
				documentClock: 15,
			})

			const storage = new InMemorySyncStorage<TLRecord>({ snapshot: snapshotWithDocumentClock })
			const _room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

			const snapshot = storage.getSnapshot()
			expect(snapshot.documentClock).toBe(15) // should preserve explicit value
		})
	})

	it('[RC1] the serialized schema contains no undefined values', () => {
		const { room } = makeRoom()

		expect(room.serializedSchema).toEqual(JSON.parse(JSON.stringify(schema.serialize())))

		const hasUndefined = (value: unknown): boolean => {
			if (value === undefined) return true
			if (value && typeof value === 'object') {
				return Object.values(value).some(hasUndefined)
			}
			return false
		}
		expect(hasUndefined(room.serializedSchema)).toBe(false)
	})

	it('[RC2] a schema with more than one presence type throws at construction', () => {
		const presenceA = createRecordType<any>('presenceA', {
			scope: 'presence',
			validator: { validate: (r) => r },
		})
		const presenceB = createRecordType<any>('presenceB', {
			scope: 'presence',
			validator: { validate: (r) => r },
		})
		const badSchema = StoreSchema.create<any>({ presenceA, presenceB })
		const storage = new InMemorySyncStorage<any>({
			snapshot: { documents: [], clock: 0, documentClock: 0, schema: badSchema.serialize() },
		})

		expect(() => new TLSyncRoom<any, undefined>({ schema: badSchema, storage })).toThrow(
			/exactly zero or one presence type/
		)
	})

	it('[RC4] broadcasts external storage changes to connected clients', async () => {
		const { room, storage } = makeRoom()
		const socket = connectSession(room, 'test-session')

		// Simulate external storage change (as if another room instance modified it)
		const newPage = makePage('external_page', 'External Page')

		storage.transaction((txn) => {
			txn.set(newPage.id, newPage)
		})

		// Wait for onChange microtask to fire and the room to process the change
		await Promise.resolve()
		await Promise.resolve()

		// The client should have received a patch with the new page
		expect(socket.sendMessage).toHaveBeenCalled()
		const lastCall = sentMessages(socket).at(-1)! as any

		// Should be a data message containing a patch
		expect(lastCall.type).toBe('data')
		expect(lastCall.data).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'patch',
					diff: expect.objectContaining({
						[newPage.id]: ['put', expect.objectContaining({ id: newPage.id })],
					}),
				}),
			])
		)
	})

	it('[RC4] does not broadcast changes from its own transactions (via internalTxnId)', async () => {
		const { room } = makeRoom()
		const socketA = connectSession(room, 'session-a')
		const socketB = connectSession(room, 'session-b')

		// Client A pushes a change through the room
		const newPage = makePage('client_page', 'Client Page')

		room.handleMessage('session-a', {
			type: 'push',
			clientClock: 1,
			diff: {
				[newPage.id]: ['put', newPage],
			},
		} as TLPushRequest<TLRecord>)

		// Wait for any microtasks
		await Promise.resolve()

		// Client A should get push_result
		const clientAMessages = sentMessages(socketA)
		expect(clientAMessages.length).toBeGreaterThan(0)
		const lastAMessage = clientAMessages.at(-1)! as any
		expect(lastAMessage.type).toBe('data')
		expect(lastAMessage.data[0].type).toBe('push_result')

		// Client B should get exactly one patch (from the push), not a duplicate
		// from external change detection
		const clientBMessages = sentMessages(socketB) as any[]
		expect(clientBMessages.length).toBe(1)
		expect(clientBMessages[0].type).toBe('data')
		expect(clientBMessages[0].data[0].type).toBe('patch')
	})

	it('[RC4] handles multiple rapid external changes', async () => {
		const { room, storage } = makeRoom()
		const socket = connectSession(room, 'test-session')

		// Make multiple rapid external changes
		const page1 = makePage('rapid_page_1', 'Rapid Page 1', 'a2' as IndexKey)
		const page2 = makePage('rapid_page_2', 'Rapid Page 2', 'a3' as IndexKey)

		storage.transaction((txn) => {
			txn.set(page1.id, page1)
		})
		storage.transaction((txn) => {
			txn.set(page2.id, page2)
		})

		// Wait for all microtasks to settle
		await Promise.resolve()

		// Client should have received patches for both changes
		expect(socket.sendMessage).toHaveBeenCalled()
		const allDiffs = combinedPatchDiff(socket)
		expect(allDiffs[page1.id]).toBeDefined()
		expect(allDiffs[page2.id]).toBeDefined()
	})

	it('[RC4] broadcasts changes when a snapshot is loaded via a storage transaction during an active session', async () => {
		const { room, storage } = makeRoom()
		const socket = connectSession(room, 'active-session')

		// Load a new snapshot with additional page
		const newPage = makePage('new_page', 'New Page')

		storage.transaction((txn) => {
			txn.set(newPage.id, newPage)
		})

		// Wait for onChange to fire
		await Promise.resolve()

		// Client should have received the new page
		expect(socket.sendMessage).toHaveBeenCalled()
		const allDiffs = combinedPatchDiff(socket)
		expect(allDiffs[newPage.id]).toBeDefined()
	})

	it('[RC4] broadcasts document deletions made during an active session', async () => {
		const extraPage = makePage('extra_page', 'Extra Page')
		const { room, storage } = makeRoom({ snapshot: makeSnapshot([...records, extraPage]) })
		const socket = connectSession(room, 'active-session')

		// Delete the extra page via storage
		storage.transaction((txn) => {
			txn.delete(extraPage.id)
		})

		await Promise.resolve()

		// Client should have received the delete
		expect(socket.sendMessage).toHaveBeenCalled()
		const allDiffs = combinedPatchDiff(socket)
		expect(allDiffs[extraPage.id]).toEqual(['remove'])
	})

	it('[RC5] closes every session when an external change cannot be diffed incrementally', async () => {
		const { room, storage } = makeRoom()
		const socketA = connectSession(room, 'a')
		const socketB = connectSession(room, 'b')
		const becameEmpty = vi.fn()
		room.events.on('room_became_empty', becameEmpty)

		// An external transaction advances the clock, and the storage simultaneously
		// loses the tombstone history needed for an incremental diff (as happens when
		// a snapshot is loaded over the top of existing data).
		const newPage = makePage('wipe_page', 'Wipe Page')
		storage.transaction((txn) => {
			txn.set(newPage.id, newPage)
		})
		storage.tombstoneHistoryStartsAtClock.set(storage.getClock())

		await Promise.resolve()
		await Promise.resolve()

		// All sessions are removed so the clients reconnect and re-hydrate
		expect(room.sessions.size).toBe(0)
		expect(socketA.close).toHaveBeenCalled()
		expect(socketB.close).toHaveBeenCalled()
		expect(becameEmpty).toHaveBeenCalledTimes(1)
	})

	it('[RC6][SES1] the default client timeout prunes idle sessions via the periodic interval', () => {
		vi.useFakeTimers()
		const { room } = makeRoom()
		const socket = connectSession(room, 'idle')
		const removed = vi.fn()
		const becameEmpty = vi.fn()
		room.events.on('session_removed', removed)
		room.events.on('room_became_empty', becameEmpty)

		// Advance past the idle timeout; the periodic prune interval cancels the session
		vi.advanceTimersByTime(SESSION_IDLE_TIMEOUT + 2001)
		expect(room.sessions.get('idle')?.state).toBe(RoomSessionState.AwaitingRemoval)
		expect(socket.isOpen).toBe(false)

		// After the removal grace period it is removed entirely
		vi.advanceTimersByTime(SESSION_REMOVAL_WAIT_TIME + 2001)
		expect(room.sessions.size).toBe(0)
		expect(removed).toHaveBeenCalledWith({ sessionId: 'idle', meta: undefined })
		expect(becameEmpty).toHaveBeenCalledTimes(1)
	})

	it('[RC6] a clientTimeout of Infinity or 0 disables the periodic prune interval', () => {
		vi.useFakeTimers()
		for (const clientTimeout of [Infinity, 0]) {
			const { room } = makeRoom({ clientTimeout })
			connectSession(room, 'idle')

			vi.advanceTimersByTime(10 * SESSION_IDLE_TIMEOUT)

			expect(room.sessions.get('idle')?.state).toBe(RoomSessionState.Connected)
			room.close()
		}
	})

	it('[RC7] close() closes every session socket and isClosed() reports it', () => {
		const { room } = makeRoom()
		const socketA = connectSession(room, 'a')
		const socketB = connectSession(room, 'b')

		expect(room.isClosed()).toBe(false)

		room.close()

		expect(socketA.close).toHaveBeenCalled()
		expect(socketB.close).toHaveBeenCalled()
		expect(socketA.isOpen).toBe(false)
		expect(socketB.isOpen).toBe(false)
		expect(room.isClosed()).toBe(true)
	})
})

describe('23. Connect handshake (HS)', () => {
	it('[HS1] a session re-registered under the same id keeps its previous presence id', () => {
		const { room } = makeRoom()

		room.handleNewSession({
			sessionId: 's1',
			socket: makeSocket(),
			meta: undefined,
			isReadonly: false,
		})
		const presenceId = room.sessions.get('s1')!.presenceId
		expect(presenceId).not.toBeNull()

		// Re-register the same session id (e.g. a quick reconnect)
		room.handleNewSession({
			sessionId: 's1',
			socket: makeSocket(),
			meta: undefined,
			isReadonly: false,
		})
		expect(room.sessions.get('s1')!.presenceId).toBe(presenceId)

		// A different session gets a different presence id
		room.handleNewSession({
			sessionId: 's2',
			socket: makeSocket(),
			meta: undefined,
			isReadonly: false,
		})
		expect(room.sessions.get('s2')!.presenceId).not.toBe(presenceId)
	})

	it('[HS3] rejects a client whose schema version lacks down migrations', () => {
		// Use an old schema version that can't connect (arrow v0 has retired down migrations)
		const serializedSchema = schema.serialize()
		const oldSerializedSchema: SerializedSchemaV2 = {
			schemaVersion: 2,
			sequences: {
				...serializedSchema.sequences,
				'com.tldraw.shape.arrow': 0,
			},
		}

		const { room } = makeRoom()
		const socket = makeSocket()

		room.handleNewSession({
			sessionId: 'old-client-session',
			socket,
			meta: undefined,
			isReadonly: false,
		})

		room.handleMessage('old-client-session', {
			connectRequestId: 'connect-1',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: oldSerializedSchema,
			type: 'connect',
		})

		// Session should not be connected - it was rejected due to incompatible schema
		expect(room.sessions.get('old-client-session')?.state).not.toBe(RoomSessionState.Connected)

		// Socket should be closed with CLIENT_TOO_OLD
		expect(socket.close).toHaveBeenCalledWith(
			TLSyncErrorCloseEventCode,
			TLSyncErrorCloseEventReason.CLIENT_TOO_OLD
		)
	})

	it('[HS4] handles a client with lastServerClock greater than the current documentClock', () => {
		const { room } = makeRoom({ snapshot: makeSnapshot(records, { documentClock: 10 }) })

		// Client claims to have clock 100, but server is only at 10
		const socket = connectSession(room, 'future-clock-client', {
			lastServerClock: 100,
			clear: false,
		})

		// Session should still connect successfully
		expect(room.sessions.get('future-clock-client')?.state).toBe(RoomSessionState.Connected)

		// Check the connect response
		const connectResponse = socket.__lastMessage
		expect(connectResponse?.type).toBe('connect')
		if (connectResponse?.type === 'connect') {
			// Should receive wipe_all to reset client state
			expect(connectResponse.hydrationType).toBe('wipe_all')
			// Should receive all documents
			expect(Object.keys(connectResponse.diff).length).toBe(2)
		}
	})

	it('[HS4][HS5] provides all documents when the client has a future clock', () => {
		const { room } = makeRoom({
			snapshot: makeSnapshot(records, {
				documentClock: 5,
				documents: [
					{ state: records[0], lastChangedClock: 3 },
					{ state: records[1], lastChangedClock: 5 },
				],
			}),
		})

		const socket = connectSession(room, 'future-client', {
			lastServerClock: 999,
			clear: false,
		})

		const connectResponse = socket.__lastMessage
		expect(connectResponse?.type).toBe('connect')
		if (connectResponse?.type === 'connect') {
			// Both documents should be included regardless of their lastChangedClock
			expect(connectResponse.diff[records[0].id]).toBeDefined()
			expect(connectResponse.diff[records[1].id]).toBeDefined()
		}
	})

	it('[HS4][HS5] the connect response carries wipe_presence and other sessions presence, excluding the connecting session own presence', () => {
		const { room, storage } = makeRoom()

		connectSession(room, 'a')
		room.handleMessage('a', {
			type: 'push',
			clientClock: 0,
			presence: presencePut('Alice'),
		} as TLPushRequest<TLRecord>)
		const aPresenceId = room.sessions.get('a')!.presenceId!

		// B connects and sees A's presence in the connect diff
		const socketB = connectSession(room, 'b', {
			isReadonly: true,
			lastServerClock: storage.getClock(),
			clear: false,
		})
		const response = socketB.__lastMessage as any
		expect(response.type).toBe('connect')
		expect(response.connectRequestId).toBe('connect-b')
		expect(response.hydrationType).toBe('wipe_presence')
		expect(response.isReadonly).toBe(true)
		expect(response.serverClock).toBe(storage.getClock())
		expect(response.diff).toEqual({
			[aPresenceId]: ['put', expect.objectContaining({ id: aPresenceId, userName: 'Alice' })],
		})

		// B pushes presence, then A reconnects under the same session id
		room.handleMessage('b', {
			type: 'push',
			clientClock: 0,
			presence: presencePut('Bob'),
		} as TLPushRequest<TLRecord>)
		const bPresenceId = room.sessions.get('b')!.presenceId!

		room.handleClose('a')
		const socketA2 = connectSession(room, 'a', {
			lastServerClock: storage.getClock(),
			clear: false,
		})
		const response2 = socketA2.__lastMessage as any
		expect(response2.type).toBe('connect')

		// A's own (still stored) presence is excluded, B's presence is included
		expect(room.presenceStore.get(aPresenceId)).toBeDefined()
		expect(response2.diff[aPresenceId]).toBeUndefined()
		expect(response2.diff[bPresenceId]).toEqual([
			'put',
			expect.objectContaining({ id: bPresenceId, userName: 'Bob' }),
		])
	})

	it('[HS6] accepts a client with the same schema version and moves the session to Connected', () => {
		const { room } = makeRoom()
		const socket = connectSession(room, 'current-client-session', { clear: false })

		expect(room.sessions.get('current-client-session')?.state).toBe(RoomSessionState.Connected)
		expect(socket.__lastMessage?.type).toBe('connect')
	})
})

describe('24. Push handling (RP)', () => {
	function setupTwoSessions() {
		const { room, storage } = makeRoom()
		const socketA = connectSession(room, 'a')
		const socketB = connectSession(room, 'b')
		return { room, storage, socketA, socketB }
	}

	it('[RP1] ignores pushes from sessions that have not completed the handshake', () => {
		const { room, storage } = makeRoom()
		const socket = makeSocket()
		room.handleNewSession({ sessionId: 's1', socket, meta: undefined, isReadonly: false })

		const clockBefore = storage.getClock()
		const newPage = makePage('early_page', 'Too early')

		room.handleMessage('s1', {
			type: 'push',
			clientClock: 0,
			diff: { [newPage.id]: ['put', newPage] },
		} as TLPushRequest<TLRecord>)

		expect(storage.getClock()).toBe(clockBefore)
		expect(storage.documents.get(newPage.id)).toBeUndefined()
		expect(socket.sendMessage).not.toHaveBeenCalled()
		expect(room.sessions.get('s1')?.state).toBe(RoomSessionState.AwaitingConnectMessage)
	})

	it('[RP2] rejects the session when a push contains a record with an unknown type', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		try {
			const { room } = makeRoom()
			const socket = connectSession(room, 'invalid-record-session')

			// Try to push a record with an unknown type
			room.handleMessage('invalid-record-session', {
				type: 'push',
				clientClock: 1,
				diff: {
					'unknown:record': [
						'put',
						{
							id: 'unknown:record',
							typeName: 'unknown_type_that_does_not_exist',
						} as any,
					],
				},
			} as TLPushRequest<TLRecord>)

			// Session should be rejected/removed
			expect(room.sessions.get('invalid-record-session')).toBeUndefined()
			expect(socket.close).toHaveBeenCalledWith(
				TLSyncErrorCloseEventCode,
				TLSyncErrorCloseEventReason.INVALID_RECORD
			)
		} finally {
			consoleSpy.mockRestore()
		}
	})

	describe('schema validation of pushed records', () => {
		interface Book {
			typeName: 'book'
			id: RecordId<Book>
			title: string
		}
		const Book = createRecordType<Book>('book', {
			scope: 'document',
			validator: {
				validate: (record: unknown): Book => {
					if (typeof record !== 'object' || record === null) {
						throw new Error('Expected object')
					}
					if (!('title' in record)) {
						throw new Error('Expected title')
					}
					if (typeof record.title !== 'string') {
						throw new Error('Expected title to be a string')
					}
					return record as Book
				},
			},
		})
		const BookWithoutValidator = createRecordType<Book>('book', {
			scope: 'document',
			validator: { validate: (record) => record as Book },
		})
		type Presence = UnknownRecord & { typeName: 'presence' }
		const presenceType = createRecordType<Presence>('presence', {
			scope: 'presence',
			validator: { validate: (record) => record as Presence },
		})

		const bookSchema = StoreSchema.create<Book | Presence>({ book: Book, presence: presenceType })
		const bookSchemaWithoutValidator = StoreSchema.create<Book | Presence>({
			book: BookWithoutValidator,
			presence: presenceType,
		})

		let consoleSpy: ReturnType<typeof vi.spyOn>
		beforeEach(() => {
			consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		})
		afterEach(() => {
			consoleSpy.mockRestore()
		})

		async function makeTestInstance() {
			const server = new TestServer(bookSchema)
			const socketPair = new TestSocketPair('test', server)
			socketPair.connect()

			const flush = async () => {
				await Promise.resolve()
				while (socketPair.getNeedsFlushing()) {
					socketPair.flushClientSentEvents()
					socketPair.flushServerSentEvents()
				}
			}
			let onSyncError = vi.fn()
			const client = await new Promise<TLSyncClient<Book | Presence>>((resolve, reject) => {
				onSyncError = vi.fn(reject)
				const client = new TLSyncClient({
					store: new Store<Book | Presence, unknown>({
						schema: bookSchemaWithoutValidator,
						props: {},
					}),
					socket: socketPair.clientSocket as any,
					onLoad: resolve,
					onSyncError,
					presence: computed('', () => null),
				})
				disposables.push(() => client.close())
				flush()
			})

			return {
				server,
				socketPair,
				client,
				flush,
				onSyncError,
			}
		}

		it('[RP2] rejects invalid put operations that create a new document', async () => {
			const { client, flush, onSyncError, server } = await makeTestInstance()

			const prevServerDocs = server.storage.getSnapshot().documents

			client.store.put([
				{
					typeName: 'book',
					id: Book.createId('1'),
					// @ts-expect-error - deliberate invalid data
					title: 123 as string,
				},
			])
			await flush()

			expect(onSyncError).toHaveBeenCalledTimes(1)
			expect(onSyncError).toHaveBeenLastCalledWith(TLSyncErrorCloseEventReason.INVALID_RECORD)
			expect(server.storage.getSnapshot().documents).toStrictEqual(prevServerDocs)
		})

		it('[RP2] rejects invalid put operations that replace an existing document', async () => {
			const { client, flush, onSyncError, server } = await makeTestInstance()

			let prevServerDocs = server.storage.getSnapshot().documents
			const book: Book = { typeName: 'book', id: Book.createId('1'), title: 'Annihilation' }
			client.store.put([book])
			await flush()

			expect(onSyncError).toHaveBeenCalledTimes(0)
			expect(server.storage.getSnapshot().documents).not.toStrictEqual(prevServerDocs)
			prevServerDocs = server.storage.getSnapshot().documents

			client.socket.sendMessage({
				type: 'push',
				// @ts-expect-error clientClock is private
				clientClock: client.clientClock++,
				diff: {
					[book.id]: [
						RecordOpType.Put,
						{
							...book,
							// @ts-expect-error - deliberate invalid data
							title: 123 as string,
						},
					],
				},
			})
			await flush()

			expect(onSyncError).toHaveBeenCalledTimes(1)
			expect(onSyncError).toHaveBeenLastCalledWith(TLSyncErrorCloseEventReason.INVALID_RECORD)
			expect(server.storage.getSnapshot().documents).toStrictEqual(prevServerDocs)
		})

		it('[RP2] rejects invalid patch operations', async () => {
			const { client, flush, onSyncError, server } = await makeTestInstance()

			let prevServerDocs = server.storage.getSnapshot().documents

			// create the book
			client.store.put([
				{
					typeName: 'book',
					id: Book.createId('1'),
					title: 'The silence of the girls',
				},
			])
			await flush()

			expect(onSyncError).toHaveBeenCalledTimes(0)
			expect(server.storage.getSnapshot().documents).not.toStrictEqual(prevServerDocs)
			prevServerDocs = server.storage.getSnapshot().documents

			// update the title to be wrong
			client.store.put([
				{
					typeName: 'book',
					id: Book.createId('1'),
					// @ts-expect-error - deliberate invalid data
					title: 123 as string,
				},
			])
			await flush()
			expect(onSyncError).toHaveBeenCalledTimes(1)
			expect(onSyncError).toHaveBeenLastCalledWith(TLSyncErrorCloseEventReason.INVALID_RECORD)
			expect(server.storage.getSnapshot().documents).toStrictEqual(prevServerDocs)
		})
	})

	it('[RP3][RP7][RP8] a put of a new id stores the record, broadcasts a put, and commits', () => {
		const { storage, room, socketA, socketB } = setupTwoSessions()
		const newPage = makePage('page_3', 'my lovely page 3')

		room.handleMessage('a', {
			type: 'push',
			clientClock: 7,
			diff: { [newPage.id]: ['put', newPage] },
		} as TLPushRequest<TLRecord>)

		expect(storage.documents.get(newPage.id)?.state).toEqual(newPage)

		// The pusher gets a commit and never its own patch back
		expect(sentDataMessages(socketA)).toEqual([
			{ type: 'push_result', clientClock: 7, serverClock: 1, action: 'commit' },
		])

		// The other session gets the put broadcast
		expect(sentDataMessages(socketB)).toEqual([
			{ type: 'patch', diff: { [newPage.id]: ['put', newPage] }, serverClock: 1 },
		])
	})

	it('[RP3][RP7] a put over an existing record broadcasts only the difference and rebases the pusher', () => {
		const { storage, room, socketA, socketB } = setupTwoSessions()
		const renamed = { ...pageRecord, name: 'renamed' }

		room.handleMessage('a', {
			type: 'push',
			clientClock: 1,
			diff: { [pageRecord.id]: ['put', renamed] },
		} as TLPushRequest<TLRecord>)

		expect(storage.documents.get(pageRecord.id)?.state).toEqual(renamed)

		const expectedDiff = { [pageRecord.id]: ['patch', { name: ['put', 'renamed'] }] }
		expect(sentDataMessages(socketB)).toEqual([
			{ type: 'patch', diff: expectedDiff, serverClock: 1 },
		])
		expect(sentDataMessages(socketA)).toEqual([
			{
				type: 'push_result',
				clientClock: 1,
				serverClock: 1,
				action: { rebaseWithDiff: expectedDiff },
			},
		])
	})

	it('[RP3][RP7] a put equal to the stored record changes nothing and is discarded', () => {
		const { storage, room, socketA, socketB } = setupTwoSessions()

		room.handleMessage('a', {
			type: 'push',
			clientClock: 1,
			diff: { [pageRecord.id]: ['put', { ...pageRecord }] },
		} as TLPushRequest<TLRecord>)

		expect(storage.getClock()).toBe(0)
		expect(sentDataMessages(socketA)).toEqual([
			{ type: 'push_result', clientClock: 1, serverClock: 0, action: 'discard' },
		])
		expect(socketB.sendMessage).not.toHaveBeenCalled()
	})

	it('[RP4][RP7] a patch for a missing record is silently ignored and the push discarded', () => {
		const { storage, room, socketA, socketB } = setupTwoSessions()

		room.handleMessage('a', {
			type: 'push',
			clientClock: 1,
			diff: { 'page:does_not_exist': ['patch', { name: ['put', 'whatever'] }] },
		} as TLPushRequest<TLRecord>)

		expect(storage.getClock()).toBe(0)
		expect(room.sessions.get('a')?.state).toBe(RoomSessionState.Connected)
		expect(sentDataMessages(socketA)).toEqual([
			{ type: 'push_result', clientClock: 1, serverClock: 0, action: 'discard' },
		])
		expect(socketB.sendMessage).not.toHaveBeenCalled()
	})

	it('[RP5] successfully patches an arrow shape with the current schema', () => {
		// Create a document in the room first
		const existingArrow: TLArrowShape = {
			typeName: 'shape',
			type: 'arrow',
			id: 'shape:existing_arrow' as TLShapeId,
			index: ZERO_INDEX_KEY,
			isLocked: false,
			parentId: PageRecordType.createId(),
			rotation: 0,
			x: 0,
			y: 0,
			opacity: 1,
			props: {
				kind: 'arc',
				elbowMidPoint: 0.5,
				dash: 'draw',
				size: 'm',
				fill: 'none',
				color: 'black',
				labelColor: 'black',
				bend: 0,
				start: { x: 0, y: 0 },
				end: { x: 0, y: 0 },
				arrowheadStart: 'none',
				arrowheadEnd: 'arrow',
				richText: { type: 'doc', content: [] },
				font: 'draw',
				labelPosition: 0.5,
				scale: 1,
			},
			meta: {},
		}

		const { room, storage } = makeRoom({ snapshot: makeSnapshot([...records, existingArrow]) })
		connectSession(room, 'patch-migration-session')

		// Patch the arrow - this should work normally
		room.handleMessage('patch-migration-session', {
			type: 'push',
			clientClock: 1,
			diff: {
				[existingArrow.id]: ['patch', { props: ['patch', { color: ['put', 'red'] }] }],
			},
		} as TLPushRequest<TLRecord>)

		// Session should still be connected after valid patch
		expect(room.sessions.get('patch-migration-session')?.state).toBe(RoomSessionState.Connected)

		// Verify the patch was applied
		const patchedArrow = storage.documents.get(existingArrow.id)?.state as TLArrowShape
		expect(patchedArrow.props.color).toBe('red')
	})

	it('[RP6][RP7] a remove deletes the record, writes a tombstone, and broadcasts the removal', () => {
		const { storage, room, socketA, socketB } = setupTwoSessions()

		room.handleMessage('a', {
			type: 'push',
			clientClock: 1,
			diff: { [pageRecord.id]: ['remove'] },
		} as TLPushRequest<TLRecord>)

		expect(storage.documents.get(pageRecord.id)).toBeUndefined()
		expect(storage.tombstones.get(pageRecord.id)).toBe(1)

		expect(sentDataMessages(socketA)).toEqual([
			{ type: 'push_result', clientClock: 1, serverClock: 1, action: 'commit' },
		])
		expect(sentDataMessages(socketB)).toEqual([
			{ type: 'patch', diff: { [pageRecord.id]: ['remove'] }, serverClock: 1 },
		])
	})

	it('[RP6][RP7] a remove of a missing id is ignored', () => {
		const { storage, room, socketA, socketB } = setupTwoSessions()

		room.handleMessage('a', {
			type: 'push',
			clientClock: 1,
			diff: { 'page:does_not_exist': ['remove'] },
		} as TLPushRequest<TLRecord>)

		expect(storage.getClock()).toBe(0)
		expect(storage.tombstones.get('page:does_not_exist')).toBeUndefined()
		expect(sentDataMessages(socketA)).toEqual([
			{ type: 'push_result', clientClock: 1, serverClock: 0, action: 'discard' },
		])
		expect(socketB.sendMessage).not.toHaveBeenCalled()
	})

	it('[RP7] a patch that only partially applies gets rebaseWithDiff carrying the effective diff', () => {
		const { room, socketA, socketB } = setupTwoSessions()

		// The name op has an effect, the index op is a no-op
		room.handleMessage('a', {
			type: 'push',
			clientClock: 1,
			diff: {
				[pageRecord.id]: ['patch', { name: ['put', 'renamed'], index: ['put', ZERO_INDEX_KEY] }],
			},
		} as TLPushRequest<TLRecord>)

		const effectiveDiff = { [pageRecord.id]: ['patch', { name: ['put', 'renamed'] }] }
		expect(sentDataMessages(socketA)).toEqual([
			{
				type: 'push_result',
				clientClock: 1,
				serverClock: 1,
				action: { rebaseWithDiff: effectiveDiff },
			},
		])
		expect(sentDataMessages(socketB)).toEqual([
			{ type: 'patch', diff: effectiveDiff, serverClock: 1 },
		])
	})

	it('[RP7] a presence-only push gets a commit', () => {
		const { room, socketA } = setupTwoSessions()

		room.handleMessage('a', {
			type: 'push',
			clientClock: 9,
			presence: presencePut(),
		} as TLPushRequest<TLRecord>)

		expect(sentDataMessages(socketA)).toEqual([
			{ type: 'push_result', clientClock: 9, serverClock: 0, action: 'commit' },
		])
	})

	it('[RP9] does not allow updates from users who are marked as readonly', () => {
		const { room, storage } = makeRoom()
		const socketA = connectSession(room, 'sessionA', { isReadonly: true })
		const socketB = connectSession(room, 'sessionB', { isReadonly: false })
		const getDoc = (id: string) => storage.documents.get(id)?.state

		const push: TLPushRequest<any> = {
			clientClock: 0,
			diff: {
				'page:page_3': [
					'put',
					PageRecordType.create({
						id: 'page:page_3' as any,
						name: 'my lovely page 3',
						index: 'ab34' as IndexKey,
					}),
				],
			},
			presence: undefined,
			type: 'push',
		}

		// sessionA is readonly
		room.handleMessage('sessionA', push)

		expect(getDoc('page:page_3')).toBe(undefined)
		// should tell the session to discard it
		expect(socketA.__lastMessage).toEqual({
			type: 'data',
			data: [{ type: 'push_result', clientClock: 0, serverClock: 0, action: 'discard' }],
		})
		// should not have sent anything to sessionB
		expect(socketB.__lastMessage).toBe(null)

		// sessionB is not readonly
		room.handleMessage('sessionB', push)

		expect(getDoc('page:page_3')).not.toBe(undefined)

		// should tell the session to commit it
		expect(socketB.__lastMessage).toEqual({
			type: 'data',
			data: [{ type: 'push_result', clientClock: 0, serverClock: 1, action: 'commit' }],
		})
	})

	it('[RP9][RP7][RP10] still allows presence updates from readonly users', () => {
		const { room } = makeRoom()
		const socketA = connectSession(room, 'sessionA', { isReadonly: true })
		const socketB = connectSession(room, 'sessionB', { isReadonly: false })
		const presenceIdA = room.sessions.get('sessionA')!.presenceId!

		const presencePushRequest: TLPushRequest<any> = {
			clientClock: 0,
			diff: undefined,
			presence: [
				'put',
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('foo'),
					currentPageId: 'page:page_2' as any,
					userId: createUserId('foo'),
					userName: 'Jimbo',
				}),
			],
			type: 'push',
		}

		// sessionA is readonly
		room.handleMessage('sessionA', presencePushRequest)

		// commit for sessionA
		expect(socketA.__lastMessage).toEqual({
			type: 'data',
			data: [{ type: 'push_result', clientClock: 0, serverClock: 0, action: 'commit' }],
		})

		// patch for sessionB, stored under sessionA's presence id
		expect(socketB.__lastMessage).toEqual({
			type: 'data',
			data: [
				{
					type: 'patch',
					serverClock: 0,
					diff: {
						[presenceIdA]: [
							'put',
							expect.objectContaining({
								id: presenceIdA,
								typeName: 'instance_presence',
								currentPageId: 'page:page_2',
								userId: 'user:foo',
								userName: 'Jimbo',
							}),
						],
					},
				},
			],
		})
	})

	it('[RP10] presence changes do not affect the document clock', () => {
		const { room, storage } = makeRoom({ snapshot: makeSnapshot(records, { documentClock: 10 }) })
		connectSession(room, 'presence-test', { lastServerClock: 10 })

		const clockBefore = storage.getClock()

		// Send presence update
		room.handleMessage('presence-test', {
			type: 'push',
			clientClock: 1,
			diff: undefined,
			presence: presencePut('Test User'),
		} as TLPushRequest<TLRecord>)

		// Document clock should not have changed
		expect(storage.getClock()).toBe(clockBefore)
	})

	it('[RP10] presence is stored in the presence store with a forced id and typeName, never in document storage', () => {
		const { room, storage } = makeRoom()
		connectSession(room, 'presence-test')

		const presenceId = room.sessions.get('presence-test')!.presenceId!

		// Send a presence update whose record has a client-chosen id
		room.handleMessage('presence-test', {
			type: 'push',
			clientClock: 1,
			diff: undefined,
			presence: presencePut('Test User'),
		} as TLPushRequest<TLRecord>)

		// Presence should be in presenceStore under the session's presence id,
		// with id and typeName forced server-side
		const stored = room.presenceStore.get(presenceId) as any
		expect(stored).toBeDefined()
		expect(stored.id).toBe(presenceId)
		expect(stored.typeName).toBe('instance_presence')
		expect(stored.userName).toBe('Test User')

		// Presence should NOT be in document storage
		storage.transaction((txn) => {
			expect(txn.get(presenceId)).toBeUndefined()
		})
	})

	it('[RP10][SES3] presence is removed from the presence store when the session is removed', () => {
		const { room } = makeRoom()
		connectSession(room, 'presence-test')

		const presenceId = room.sessions.get('presence-test')!.presenceId!

		room.handleMessage('presence-test', {
			type: 'push',
			clientClock: 1,
			diff: undefined,
			presence: presencePut('Test User'),
		} as TLPushRequest<TLRecord>)

		expect(room.presenceStore.get(presenceId)).toBeDefined()

		// Close the session
		room.rejectSession('presence-test')

		// Presence should be removed
		expect(room.presenceStore.get(presenceId)).toBeUndefined()
	})

	it('[RP10] onPresenceChange fires on a microtask after presence changes', async () => {
		const onPresenceChange = vi.fn()
		const { room } = makeRoom({ onPresenceChange })
		connectSession(room, 'a')

		room.handleMessage('a', {
			type: 'push',
			clientClock: 1,
			presence: presencePut(),
		} as TLPushRequest<TLRecord>)

		// Not called synchronously
		expect(onPresenceChange).not.toHaveBeenCalled()

		await Promise.resolve()
		expect(onPresenceChange).toHaveBeenCalledTimes(1)
	})

	it('[RP11] pings are answered with pong, and pings and pushes update lastInteractionTime', () => {
		vi.useFakeTimers()
		const { room } = makeRoom()
		const socket = connectSession(room, 'a')
		const t0 = (room.sessions.get('a') as any).lastInteractionTime

		vi.advanceTimersByTime(1234)
		room.handleMessage('a', { type: 'ping' })
		expect(socket.__lastMessage).toEqual({ type: 'pong' })
		expect((room.sessions.get('a') as any).lastInteractionTime).toBe(t0 + 1234)

		vi.advanceTimersByTime(1000)
		room.handleMessage('a', {
			type: 'push',
			clientClock: 1,
			diff: { [pageRecord.id]: ['patch', { name: ['put', 'renamed'] }] },
		} as TLPushRequest<TLRecord>)
		expect((room.sessions.get('a') as any).lastInteractionTime).toBe(t0 + 2234)
	})

	it('[RP12][RP2] a TLSyncError mid-push rejects only the offending session', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		try {
			const { room, socketA, socketB } = setupTwoSessions()

			room.handleMessage('a', {
				type: 'push',
				clientClock: 1,
				diff: {
					'unknown:record': [
						'put',
						{ id: 'unknown:record', typeName: 'unknown_type_that_does_not_exist' } as any,
					],
				},
			} as TLPushRequest<TLRecord>)

			// Only the offending session is rejected
			expect(room.sessions.get('a')).toBeUndefined()
			expect(socketA.close).toHaveBeenCalledWith(
				TLSyncErrorCloseEventCode,
				TLSyncErrorCloseEventReason.INVALID_RECORD
			)
			expect(room.sessions.get('b')?.state).toBe(RoomSessionState.Connected)
			expect(socketB.close).not.toHaveBeenCalled()
		} finally {
			consoleSpy.mockRestore()
		}
	})

	it('[RP13] when storage modifies a pushed change, the pusher is rebased with the storage actual changes and others receive them', () => {
		// A storage layer that embellishes every written record (e.g. with server
		// metadata) and reports the actual changes back to the room.
		class EmbellishingStorage implements TLSyncStorage<TLRecord> {
			constructor(readonly inner: InMemorySyncStorage<TLRecord>) {}
			getClock() {
				return this.inner.getClock()
			}
			onChange(callback: (arg: TLSyncStorageOnChangeCallbackProps) => unknown) {
				return this.inner.onChange(callback)
			}
			getSnapshot() {
				return this.inner.getSnapshot()
			}
			transaction<T>(
				callback: TLSyncStorageTransactionCallback<TLRecord, T>,
				opts?: TLSyncStorageTransactionOptions
			): TLSyncStorageTransactionResult<T, TLRecord> {
				return this.inner.transaction<T>(
					((txn: TLSyncStorageTransaction<TLRecord>) => {
						const wrapped: TLSyncStorageTransaction<TLRecord> = {
							getClock: () => txn.getClock(),
							getChangesSince: (since) => txn.getChangesSince(since),
							get: (id) => txn.get(id),
							set: (id, record) =>
								txn.set(id, {
									...record,
									meta: { ...(record as any).meta, embellished: true },
								} as TLRecord),
							delete: (id) => txn.delete(id),
							entries: () => txn.entries(),
							keys: () => txn.keys(),
							values: () => txn.values(),
							getSchema: () => txn.getSchema(),
							setSchema: (s) => txn.setSchema(s),
						}
						return (callback as any)(wrapped)
					}) as any,
					// Always emit the actual changes so the room sees that they differ
					// from what the client requested
					{ ...opts, emitChanges: 'always' }
				)
			}
		}

		const inner = new InMemorySyncStorage<TLRecord>({ snapshot: makeSnapshot(records) })
		const storage = new EmbellishingStorage(inner)
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })
		disposables.push(() => room.close())

		const socketA = connectSession(room, 'a')
		const socketB = connectSession(room, 'b')

		const newPage = makePage('page_3', 'embellish me')
		room.handleMessage('a', {
			type: 'push',
			clientClock: 1,
			diff: { [newPage.id]: ['put', newPage] },
		} as TLPushRequest<TLRecord>)

		const embellished = { ...newPage, meta: { embellished: true } }
		expect(inner.documents.get(newPage.id)?.state).toEqual(embellished)

		// The pusher is rebased onto the storage's actual changes
		expect(sentDataMessages(socketA)).toEqual([
			{
				type: 'push_result',
				clientClock: 1,
				serverClock: 1,
				action: { rebaseWithDiff: { [newPage.id]: ['put', embellished] } },
			},
		])

		// Other sessions receive the actual changes too
		expect(sentDataMessages(socketB)).toEqual([
			{ type: 'patch', diff: { [newPage.id]: ['put', embellished] }, serverClock: 1 },
		])
	})
})

describe('25. Messaging and broadcast (RB)', () => {
	function setupTwoSessions() {
		const { room, storage } = makeRoom()
		const socketA = connectSession(room, 'a')
		const socketB = connectSession(room, 'b')
		return { room, storage, socketA, socketB }
	}

	it('[RB1] data messages are debounced: the first is sent immediately, the rest are buffered until the flush', () => {
		vi.useFakeTimers()
		const { room, socketB } = setupTwoSessions()
		const newPage = makePage('page_3', 'v1')

		// First data message is sent immediately, wrapped as a data event
		room.handleMessage('a', {
			type: 'push',
			clientClock: 1,
			diff: { [newPage.id]: ['put', newPage] },
		} as TLPushRequest<TLRecord>)

		expect(socketB.sendMessage).toHaveBeenCalledTimes(1)
		expect(sentMessages(socketB)[0]).toEqual({
			type: 'data',
			data: [{ type: 'patch', diff: { [newPage.id]: ['put', newPage] }, serverClock: 1 }],
		})

		// Messages within the debounce interval are buffered
		room.handleMessage('a', {
			type: 'push',
			clientClock: 2,
			diff: { [newPage.id]: ['patch', { name: ['put', 'v2'] }] },
		} as TLPushRequest<TLRecord>)
		room.handleMessage('a', {
			type: 'push',
			clientClock: 3,
			diff: { [newPage.id]: ['patch', { name: ['put', 'v3'] }] },
		} as TLPushRequest<TLRecord>)

		expect(socketB.sendMessage).toHaveBeenCalledTimes(1)

		// ...and flushed together as a single data message
		vi.advanceTimersByTime(DATA_MESSAGE_DEBOUNCE_INTERVAL + 1)

		expect(socketB.sendMessage).toHaveBeenCalledTimes(2)
		expect(sentMessages(socketB)[1]).toEqual({
			type: 'data',
			data: [
				{
					type: 'patch',
					diff: { [newPage.id]: ['patch', { name: ['put', 'v2'] }] },
					serverClock: 2,
				},
				{
					type: 'patch',
					diff: { [newPage.id]: ['patch', { name: ['put', 'v3'] }] },
					serverClock: 3,
				},
			],
		})
	})

	it('[RB2] a custom message flushes buffered data messages first, preserving order', () => {
		vi.useFakeTimers()
		const { room, socketB } = setupTwoSessions()
		const newPage = makePage('page_3', 'v1')

		room.handleMessage('a', {
			type: 'push',
			clientClock: 1,
			diff: { [newPage.id]: ['put', newPage] },
		} as TLPushRequest<TLRecord>)
		room.handleMessage('a', {
			type: 'push',
			clientClock: 2,
			diff: { [newPage.id]: ['patch', { name: ['put', 'v2'] }] },
		} as TLPushRequest<TLRecord>)

		// One immediate data message, one buffered
		expect(socketB.sendMessage).toHaveBeenCalledTimes(1)

		room.sendCustomMessage('b', 'hello')

		const messages = sentMessages(socketB) as any[]
		expect(messages.map((m) => m.type)).toEqual(['data', 'data', 'custom'])
		expect(messages[1].data[0].diff).toEqual({
			[newPage.id]: ['patch', { name: ['put', 'v2'] }],
		})
		expect(messages[2]).toEqual({ type: 'custom', data: 'hello' })
	})

	it('[RB2] pong does not flush buffered data messages', () => {
		vi.useFakeTimers()
		const { room, socketB } = setupTwoSessions()
		const newPage = makePage('page_3', 'v1')

		room.handleMessage('a', {
			type: 'push',
			clientClock: 1,
			diff: { [newPage.id]: ['put', newPage] },
		} as TLPushRequest<TLRecord>)
		room.handleMessage('a', {
			type: 'push',
			clientClock: 2,
			diff: { [newPage.id]: ['patch', { name: ['put', 'v2'] }] },
		} as TLPushRequest<TLRecord>)
		expect(socketB.sendMessage).toHaveBeenCalledTimes(1)

		// B pings while it has a buffered data message: the pong arrives first
		room.handleMessage('b', { type: 'ping' })

		let messages = sentMessages(socketB) as any[]
		expect(messages.map((m) => m.type)).toEqual(['data', 'pong'])

		// The buffered message is delivered by the regular flush afterwards
		vi.advanceTimersByTime(DATA_MESSAGE_DEBOUNCE_INTERVAL + 1)
		messages = sentMessages(socketB) as any[]
		expect(messages.map((m) => m.type)).toEqual(['data', 'pong', 'data'])
	})

	it('[RB3] sending to a session whose socket is closed cancels that session', () => {
		const { room, socketB } = setupTwoSessions()

		socketB.isOpen = false

		const newPage = makePage('page_3', 'hello')
		room.handleMessage('a', {
			type: 'push',
			clientClock: 1,
			diff: { [newPage.id]: ['put', newPage] },
		} as TLPushRequest<TLRecord>)

		expect(room.sessions.get('b')?.state).toBe(RoomSessionState.AwaitingRemoval)
		expect(socketB.sendMessage).not.toHaveBeenCalled()
	})

	it('[RB4] a per-session migration failure during broadcast rejects only the affected session', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		try {
			interface RBUser extends BaseRecord<'user', RecordId<RBUser>> {
				name: string
			}
			const RBUser = createRecordType<RBUser>('user', {
				scope: 'document',
				validator: { validate: (r) => r as RBUser },
			})
			const rbUserVersions = createMigrationIds('test.rb.user', { Touch: 1 } as const)
			const rbServerSchema = StoreSchema.create<RBUser>(
				{ user: RBUser },
				{
					migrations: [
						createRecordMigrationSequence({
							sequenceId: 'test.rb.user',
							recordType: 'user',
							sequence: [
								{
									id: rbUserVersions.Touch,
									up: (r: any) => r,
									down: (r: any) => {
										if (r.name === 'explode') throw new Error('cannot down-migrate')
										return r
									},
								},
							],
						}),
					],
				}
			)
			const rbOldSchema = StoreSchema.create<RBUser>(
				{ user: RBUser },
				{
					migrations: [
						createMigrationSequence({
							sequenceId: 'test.rb.user',
							sequence: [],
							retroactive: true,
						}),
					],
				}
			)

			const storage = new InMemorySyncStorage<RBUser>({
				snapshot: { documents: [], clock: 0, documentClock: 0, schema: rbServerSchema.serialize() },
			})
			const room = new TLSyncRoom<RBUser, undefined>({ schema: rbServerSchema, storage })
			disposables.push(() => room.close())

			const oldSocket = connectSession(room, 'old', { schema: rbOldSchema.serialize() })
			const peerSocket = connectSession(room, 'peer')
			const pusherSocket = connectSession(room, 'pusher')

			const user = RBUser.create({ id: RBUser.createId('boom'), name: 'explode' })
			room.handleMessage('pusher', {
				type: 'push',
				clientClock: 1,
				diff: { [user.id]: ['put', user] },
			} as TLPushRequest<RBUser>)

			// The old client could not down-migrate the record and was rejected
			expect(room.sessions.get('old')).toBeUndefined()
			expect(oldSocket.close).toHaveBeenCalledWith(
				TLSyncErrorCloseEventCode,
				TLSyncErrorCloseEventReason.CLIENT_TOO_OLD
			)

			// The broadcast proceeded for the same-version session
			expect(room.sessions.get('peer')?.state).toBe(RoomSessionState.Connected)
			expect(sentDataMessages(peerSocket)).toEqual([
				{ type: 'patch', diff: { [user.id]: ['put', user] }, serverClock: 1 },
			])

			// And the pusher got its commit
			expect(sentDataMessages(pusherSocket)).toEqual([
				{ type: 'push_result', clientClock: 1, serverClock: 1, action: 'commit' },
			])
		} finally {
			consoleSpy.mockRestore()
		}
	})

	it('[RB5] sends a custom message to a connected client', async () => {
		type Presence = UnknownRecord & { typeName: 'presence' }
		const presenceType = createRecordType<Presence>('presence', {
			scope: 'presence',
			validator: { validate: (record) => record as Presence },
		})
		const customSchema = StoreSchema.create<Presence>({ presence: presenceType })

		const store = new Store<any, any>({ schema: customSchema, props: {} })

		const sessionId = 'test-session-1'
		const server = new TestServer(customSchema)
		const socketPair = new TestSocketPair(sessionId, server)
		socketPair.connect()

		const onCustomMessageReceived = vi.fn()
		const client = new TLSyncClient({
			store,
			socket: socketPair.clientSocket,
			onCustomMessageReceived,
			onLoad: vi.fn(),
			onSyncError: vi.fn(),
			presence: atom('', null),
		})
		disposables.push(() => client.close())
		await socketPair.flushAllEvents()
		server.room.sendCustomMessage(sessionId, 'hello world')
		await socketPair.flushAllEvents()
		expect(onCustomMessageReceived.mock.lastCall).toEqual(['hello world'])
	})

	it('[RB5] sending a custom message to an unknown or not-yet-connected session warns and does nothing', () => {
		const warn = vi.fn()
		const { room } = makeRoom({ log: { warn } })

		room.sendCustomMessage('nobody', 'hello')
		expect(warn).toHaveBeenCalledWith('Tried to send message to unknown session', 'custom')

		warn.mockClear()
		const socket = makeSocket()
		room.handleNewSession({ sessionId: 'pending', socket, meta: undefined, isReadonly: false })
		room.sendCustomMessage('pending', 'hello')
		expect(warn).toHaveBeenCalledWith('Tried to send message to disconnected client', 'custom')
		expect(socket.sendMessage).not.toHaveBeenCalled()
	})
})

describe('26. Session lifecycle (SES)', () => {
	it('[SES1][SES2][SES3] an idle connected session is cancelled, kept for a grace period, then removed', () => {
		vi.useFakeTimers()
		const { room } = makeRoom({ clientTimeout: SESSION_IDLE_TIMEOUT })
		const socket = connectSession(room, 'idle')
		const presenceId = room.sessions.get('idle')!.presenceId
		const removed = vi.fn()
		const becameEmpty = vi.fn()
		room.events.on('session_removed', removed)
		room.events.on('room_became_empty', becameEmpty)

		// Shift the clock past the idle timeout without firing the interval so we
		// can observe the prune pass directly
		vi.setSystemTime(Date.now() + SESSION_IDLE_TIMEOUT + 1)
		room.pruneSessions()

		const session = room.sessions.get('idle')!
		expect(session.state).toBe(RoomSessionState.AwaitingRemoval)
		// [SES2] presence id is kept for a quick reconnect, and the socket is closed
		expect(session.presenceId).toBe(presenceId)
		expect(socket.isOpen).toBe(false)
		expect(removed).not.toHaveBeenCalled()

		// Not removed before the grace period has elapsed
		vi.setSystemTime(Date.now() + 1001)
		room.pruneSessions()
		expect(room.sessions.get('idle')?.state).toBe(RoomSessionState.AwaitingRemoval)

		// [SES1] removed once it has been awaiting removal for SESSION_REMOVAL_WAIT_TIME
		vi.setSystemTime(Date.now() + SESSION_REMOVAL_WAIT_TIME + 1)
		room.pruneSessions()
		expect(room.sessions.size).toBe(0)
		// [SES3] events fire on removal
		expect(removed).toHaveBeenCalledWith({ sessionId: 'idle', meta: undefined })
		expect(becameEmpty).toHaveBeenCalledTimes(1)
	})

	it('[SES1] a session that never sends a connect message is removed after SESSION_START_WAIT_TIME', () => {
		vi.useFakeTimers()
		const { room } = makeRoom()
		room.handleNewSession({
			sessionId: 'never-connects',
			socket: makeSocket(),
			meta: undefined,
			isReadonly: false,
		})

		vi.setSystemTime(Date.now() + SESSION_START_WAIT_TIME + 1)
		room.pruneSessions()

		expect(room.sessions.size).toBe(0)
	})

	it('[SES1] a connected session whose socket has closed is cancelled on prune', () => {
		const { room } = makeRoom()
		const socket = connectSession(room, 's1')

		socket.isOpen = false
		room.pruneSessions()

		expect(room.sessions.get('s1')?.state).toBe(RoomSessionState.AwaitingRemoval)
	})

	it('[SES2] handleClose moves the session to AwaitingRemoval keeping its presence id and meta', () => {
		const storage = new InMemorySyncStorage<TLRecord>({ snapshot: makeSnapshot(records) })
		const room = new TLSyncRoom<TLRecord, { userId: string }>({ schema, storage })
		disposables.push(() => room.close())

		const socket = makeSocket()
		room.handleNewSession({
			sessionId: 's1',
			socket,
			meta: { userId: 'user-1' },
			isReadonly: false,
		})
		room.handleMessage('s1', {
			type: 'connect',
			connectRequestId: 'connect-s1',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
		} satisfies TLConnectRequest)
		const presenceId = room.sessions.get('s1')!.presenceId

		room.handleClose('s1')

		const session = room.sessions.get('s1')!
		expect(session.state).toBe(RoomSessionState.AwaitingRemoval)
		expect(session.presenceId).toBe(presenceId)
		expect(session.meta).toEqual({ userId: 'user-1' })
		expect(socket.close).toHaveBeenCalled()
	})

	it('[SES3] removing a session deletes its presence record and broadcasts the deletion to everyone', () => {
		const { room } = makeRoom()
		connectSession(room, 'a')
		const socketB = connectSession(room, 'b')
		const presenceIdA = room.sessions.get('a')!.presenceId!

		room.handleMessage('a', {
			type: 'push',
			clientClock: 1,
			presence: presencePut('Leaving Soon'),
		} as TLPushRequest<TLRecord>)
		expect(room.presenceStore.get(presenceIdA)).toBeDefined()

		// Flush B's debounced data messages and start from a clean slate
		room._flushDataMessages('b')
		clearSocket(socketB)

		room.rejectSession('a')

		expect(room.presenceStore.get(presenceIdA)).toBeUndefined()
		expect(sentDataMessages(socketB)).toEqual([
			{ type: 'patch', diff: { [presenceIdA]: ['remove'] }, serverClock: 0 },
		])
	})

	it('[SES4] legacy protocol clients are rejected with a mapped incompatibility_error and no close code', () => {
		const cases = [
			[TLSyncErrorCloseEventReason.CLIENT_TOO_OLD, 'clientTooOld'],
			[TLSyncErrorCloseEventReason.SERVER_TOO_OLD, 'serverTooOld'],
			[TLSyncErrorCloseEventReason.INVALID_RECORD, 'invalidRecord'],
			[TLSyncErrorCloseEventReason.FORBIDDEN, 'invalidOperation'],
		] as const

		for (const [reason, legacyReason] of cases) {
			const { room } = makeRoom()
			// Protocol version 6 clients require legacy rejection
			const socket = connectSession(room, 'legacy', { protocolVersion: 6 })

			room.rejectSession('legacy', reason)

			expect(sentMessages(socket)).toEqual([
				{ type: 'incompatibility_error', reason: legacyReason },
			])
			expect(socket.close).toHaveBeenCalledWith()
			expect(room.sessions.size).toBe(0)
		}
	})

	it('[SES4] modern clients are rejected by closing the socket with code 4099 and the reason', () => {
		const { room } = makeRoom()
		const socket = connectSession(room, 'modern')

		room.rejectSession('modern', TLSyncErrorCloseEventReason.FORBIDDEN)

		expect(sentMessages(socket)).toEqual([])
		expect(socket.close).toHaveBeenCalledWith(
			TLSyncErrorCloseEventCode,
			TLSyncErrorCloseEventReason.FORBIDDEN
		)
		expect(room.sessions.size).toBe(0)
	})

	it('[HS2][SES5] sets supportsStringAppend to false for protocol version 7', () => {
		const { room } = makeRoom()
		connectSession(room, 'v7-session', { protocolVersion: 7 })

		const session = room.sessions.get('v7-session')
		expect(session?.state).toBe(RoomSessionState.Connected)
		if (session?.state === RoomSessionState.Connected) {
			expect(session.supportsStringAppend).toBe(false)
		}
	})

	it('[HS2][SES5] sets supportsStringAppend to true for protocol version 8', () => {
		const { room } = makeRoom()
		connectSession(room, 'v8-session', { protocolVersion: getTlsyncProtocolVersion() })

		const session = room.sessions.get('v8-session')
		expect(session?.state).toBe(RoomSessionState.Connected)
		if (session?.state === RoomSessionState.Connected) {
			expect(session.supportsStringAppend).toBe(true)
		}
	})

	it('[SES5] getCanEmitStringAppend returns false when any connected client lacks string append support', () => {
		const { room } = makeRoom()

		connectSession(room, 'v8-client', { protocolVersion: 8 })

		// With only a v8 client, should be true
		expect(room.getCanEmitStringAppend()).toBe(true)

		connectSession(room, 'v7-client', { protocolVersion: 7 })

		// With mixed clients, should be false
		expect(room.getCanEmitStringAppend()).toBe(false)
	})

	it('[SES6] handleResumedSession registers a session directly in Connected state and restores its presence', () => {
		const { room } = makeRoom()
		const socket = makeSocket()
		const presenceId = InstancePresenceRecordType.createId('resumed')
		const presenceRecord = InstancePresenceRecordType.create({
			id: presenceId,
			currentPageId: pageRecord.id,
			userId: createUserId('resumed'),
			userName: 'Resumed',
		})

		room.handleResumedSession({
			sessionId: 'resumed',
			socket,
			meta: undefined,
			isReadonly: false,
			serializedSchema: room.serializedSchema,
			presenceId,
			presenceRecord,
			requiresLegacyRejection: false,
			supportsStringAppend: true,
		})

		const session = room.sessions.get('resumed')! as any
		expect(session.state).toBe(RoomSessionState.Connected)
		// requiresDownMigrations is recomputed from the supplied schema
		expect(session.requiresDownMigrations).toBe(false)
		// the presence record is restored into the presence store
		expect(room.presenceStore.get(presenceId)).toEqual(presenceRecord)

		// the resumed session handles messages like any connected session
		room.handleMessage('resumed', { type: 'ping' })
		expect(socket.__lastMessage).toEqual({ type: 'pong' })
	})

	it('[SES7] a message from an unknown session id logs a warning and is ignored', () => {
		const warn = vi.fn()
		const { room } = makeRoom({ log: { warn } })

		room.handleMessage('unknown-session', { type: 'ping' })

		expect(warn).toHaveBeenCalledWith('Received message from unknown session')
	})
})
