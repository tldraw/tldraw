import { SerializedSchemaV2 } from '@tldraw/store'
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
} from '@tldraw/tlschema'
import { IndexKey, ZERO_INDEX_KEY, mockUniqueId, sortById } from '@tldraw/utils'
import { vi } from 'vitest'
import { InMemorySyncStorage } from '../lib/InMemorySyncStorage'
import { RoomSnapshot, TLRoomSocket, TLSyncRoom } from '../lib/TLSyncRoom'
import {
	TLConnectRequest,
	TLPushRequest,
	TLSocketServerSentEvent,
	getTlsyncProtocolVersion,
} from '../lib/protocol'

const schema = createTLSchema()
const compareById = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)

const records = [
	DocumentRecordType.create({ id: TLDOCUMENT_ID }),
	PageRecordType.create({
		index: ZERO_INDEX_KEY,
		name: 'page 2',
		id: PageRecordType.createId('page_2'),
	}),
].sort(compareById)

const makeSnapshot = (records: TLRecord[], others: Partial<RoomSnapshot> = {}) => ({
	documents: records.map((r) => ({ state: r, lastChangedClock: 0 })),
	clock: 0,
	documentClock: 0,
	schema: schema.serialize(),
	...others,
})

// Helper to create legacy snapshots without documentClock field
const makeLegacySnapshot = (
	records: TLRecord[],
	others: Partial<Omit<RoomSnapshot, 'documentClock'>> = {}
) => ({
	documents: records.map((r) => ({ state: r, lastChangedClock: 0 })),
	clock: 0,
	...others,
})

beforeEach(() => {
	let id = 0
	mockUniqueId(() => `id_${id++}`)
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

describe('TLSyncRoom', () => {
	it('can be constructed with a storage', () => {
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

	it('migrates the snapshot if it is dealing with old data', () => {
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

	it('filters out instance state records if a migration occurs, for legacy reasons', () => {
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
})

type MockSocket = TLRoomSocket<any> & { __lastMessage: null | TLSocketServerSentEvent<any> }
function makeSocket(): MockSocket {
	const socket: MockSocket = {
		__lastMessage: null,
		sendMessage: vi.fn((msg) => {
			socket.__lastMessage = msg
		}),
		close() {
			socket.isOpen = false
		},
		isOpen: true,
	}
	return socket
}

describe('isReadonly', () => {
	const sessionAId = 'sessionA'
	const sessionBId = 'sessionB'
	let storage = new InMemorySyncStorage<TLRecord>({ snapshot: makeSnapshot(records) })
	let room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })
	let socketA = makeSocket()
	let socketB = makeSocket()
	const getDoc = (id: string) => storage.documents.get(id)?.state
	function init(snapshot?: RoomSnapshot) {
		storage = new InMemorySyncStorage<TLRecord>({ snapshot: snapshot ?? makeSnapshot(records) })
		room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })
		socketA = makeSocket()
		socketB = makeSocket()
		room.handleNewSession({
			sessionId: sessionAId,
			socket: socketA,
			meta: null as any,
			isReadonly: true,
		})
		room.handleNewSession({
			sessionId: sessionBId,
			socket: socketB,
			meta: null as any,
			isReadonly: false,
		})
		room.handleMessage(sessionAId, {
			connectRequestId: 'connectRequestId' + sessionAId,
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
			type: 'connect',
		} satisfies TLConnectRequest)
		room.handleMessage(sessionBId, {
			connectRequestId: 'connectRequestId' + sessionBId,
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
			type: 'connect',
		} satisfies TLConnectRequest)
		expect(room.sessions.get(sessionAId)?.state).toBe('connected')
		expect(room.sessions.get(sessionBId)?.state).toBe('connected')
		socketA.__lastMessage = null
		socketB.__lastMessage = null
	}
	beforeEach(() => {
		init()
	})

	it('does not allow updates from users who are marked as readonly', async () => {
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
		room.handleMessage(sessionAId, push)

		expect(getDoc('page:page_3')).toBe(undefined)
		// should tell the session to discard it
		expect(socketA.__lastMessage).toMatchInlineSnapshot(`
		{
		  "data": [
		    {
		      "action": "discard",
		      "clientClock": 0,
		      "serverClock": 0,
		      "type": "push_result",
		    },
		  ],
		  "type": "data",
		}
	`)
		// should not have sent anything to sessionB
		expect(socketB.__lastMessage).toBe(null)

		// sessionB is not readonly
		room.handleMessage(sessionBId, push)

		expect(getDoc('page:page_3')).not.toBe(undefined)

		// should tell the session to commit it
		expect(socketB.__lastMessage).toMatchInlineSnapshot(`
		{
		  "data": [
		    {
		      "action": "commit",
		      "clientClock": 0,
		      "serverClock": 1,
		      "type": "push_result",
		    },
		  ],
		  "type": "data",
		}
	`)
	})

	it('still allows presence updates from readonly users', async () => {
		const presencePush: TLPushRequest<any> = {
			clientClock: 0,
			diff: undefined,
			presence: [
				'put',
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('foo'),
					currentPageId: 'page:page_2' as any,
					userId: 'foo',
					userName: 'Jimbo',
				}),
			],
			type: 'push',
		}

		// sessionA is readonly
		room.handleMessage(sessionAId, presencePush)

		// commit for sessionA
		expect(socketA.__lastMessage).toMatchInlineSnapshot(`
		{
		  "data": [
		    {
		      "action": "commit",
		      "clientClock": 0,
		      "serverClock": 0,
		      "type": "push_result",
		    },
		  ],
		  "type": "data",
		}
	`)

		// patch for sessionB
		expect(socketB.__lastMessage).toMatchInlineSnapshot(`
		{
		  "data": [
		    {
		      "diff": {
		        "instance_presence:id_0": [
		          "put",
		          {
		            "brush": null,
		            "camera": null,
		            "chatMessage": "",
		            "color": "#FF0000",
		            "currentPageId": "page:page_2",
		            "cursor": null,
		            "followingUserId": null,
		            "id": "instance_presence:id_0",
		            "lastActivityTimestamp": null,
		            "meta": {},
		            "screenBounds": null,
		            "scribbles": [],
		            "selectedShapeIds": [],
		            "typeName": "instance_presence",
		            "userId": "foo",
		            "userName": "Jimbo",
		          },
		        ],
		      },
		      "serverClock": 0,
		      "type": "patch",
		    },
		  ],
		  "type": "data",
		}
	`)
	})

	describe('Backward compatibility with existing snapshots', () => {
		it('can load snapshot without documentClock field', () => {
			const legacySnapshot = makeLegacySnapshot(records)

			const storage = new InMemorySyncStorage<TLRecord>({ snapshot: legacySnapshot })
			const _room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

			// Room should load successfully without errors
			expect(storage.getSnapshot().documents.length).toBe(2)

			// documentClock should be calculated from existing data
			const snapshot = storage.getSnapshot()
			expect(snapshot.documentClock).toBe(0) // max lastChangedClock from documents
		})

		it('calculates documentClock correctly from documents with different lastChangedClock values', () => {
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

		it('calculates documentClock correctly from tombstones', () => {
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

		it('handles empty snapshot gracefully', () => {
			const emptyLegacySnapshot = makeLegacySnapshot([], {
				documents: [],
				tombstones: {},
			})

			const storage = new InMemorySyncStorage<TLRecord>({ snapshot: emptyLegacySnapshot })
			const _room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

			const snapshot = storage.getSnapshot()
			expect(snapshot.documentClock).toBe(0) // no documents or tombstones
		})

		it('handles snapshot with only tombstones', () => {
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

		it('preserves explicit documentClock when present', () => {
			const snapshotWithDocumentClock = makeSnapshot(records, {
				documentClock: 15,
			})

			const storage = new InMemorySyncStorage<TLRecord>({ snapshot: snapshotWithDocumentClock })
			const _room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

			const snapshot = storage.getSnapshot()
			expect(snapshot.documentClock).toBe(15) // should preserve explicit value
		})
	})
})

describe('External storage changes', () => {
	it('broadcasts external storage changes to connected clients', async () => {
		const storage = new InMemorySyncStorage<TLRecord>({ snapshot: makeSnapshot(records) })
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

		const socket = makeSocket()
		const sessionId = 'test-session'

		room.handleNewSession({
			sessionId,
			socket,
			meta: undefined,
			isReadonly: false,
		})

		room.handleMessage(sessionId, {
			connectRequestId: 'connect-1',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
			type: 'connect',
		})

		expect(room.sessions.get(sessionId)?.state).toBe('connected')
		socket.__lastMessage = null

		// Simulate external storage change (as if another room instance modified it)
		const newPage = PageRecordType.create({
			id: PageRecordType.createId('external_page'),
			name: 'External Page',
			index: 'a2' as IndexKey,
		})

		storage.transaction((txn) => {
			txn.set(newPage.id, newPage)
		})

		// Wait for onChange microtask to fire
		await Promise.resolve()
		// Wait for the room to process the change
		await Promise.resolve()

		// The client should have received a patch with the new page
		expect(socket.sendMessage).toHaveBeenCalled()
		const calls = (socket.sendMessage as any).mock.calls
		const lastCall = calls[calls.length - 1][0]

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

	it('does not broadcast changes from its own transactions (via internalTxnId)', async () => {
		const storage = new InMemorySyncStorage<TLRecord>({ snapshot: makeSnapshot(records) })
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

		const socketA = makeSocket()
		const socketB = makeSocket()
		const sessionAId = 'session-a'
		const sessionBId = 'session-b'

		// Connect two clients
		room.handleNewSession({
			sessionId: sessionAId,
			socket: socketA,
			meta: undefined,
			isReadonly: false,
		})
		room.handleNewSession({
			sessionId: sessionBId,
			socket: socketB,
			meta: undefined,
			isReadonly: false,
		})

		room.handleMessage(sessionAId, {
			connectRequestId: 'connect-a',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
			type: 'connect',
		})
		room.handleMessage(sessionBId, {
			connectRequestId: 'connect-b',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
			type: 'connect',
		})

		// Clear message history
		;(socketA.sendMessage as any).mockClear()
		;(socketB.sendMessage as any).mockClear()

		// Client A pushes a change through the room
		const newPage = PageRecordType.create({
			id: PageRecordType.createId('client_page'),
			name: 'Client Page',
			index: 'a2' as IndexKey,
		})

		room.handleMessage(sessionAId, {
			type: 'push',
			clientClock: 1,
			diff: {
				[newPage.id]: ['put', newPage],
			},
		} as TLPushRequest<TLRecord>)

		// Wait for any microtasks
		await Promise.resolve()

		// Client A should get push_result
		const clientACalls = (socketA.sendMessage as any).mock.calls
		expect(clientACalls.length).toBeGreaterThan(0)
		const lastAMessage = clientACalls[clientACalls.length - 1][0]
		expect(lastAMessage.type).toBe('data')
		expect(lastAMessage.data[0].type).toBe('push_result')

		// Client B should get exactly one patch (from the push), not a duplicate from external change detection
		const clientBCalls = (socketB.sendMessage as any).mock.calls
		expect(clientBCalls.length).toBe(1)
		expect(clientBCalls[0][0].type).toBe('data')
		expect(clientBCalls[0][0].data[0].type).toBe('patch')
	})

	it('handles multiple rapid external changes', async () => {
		const storage = new InMemorySyncStorage<TLRecord>({ snapshot: makeSnapshot(records) })
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

		const socket = makeSocket()
		const sessionId = 'test-session'

		room.handleNewSession({
			sessionId,
			socket,
			meta: undefined,
			isReadonly: false,
		})

		room.handleMessage(sessionId, {
			connectRequestId: 'connect-1',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
			type: 'connect',
		})
		;(socket.sendMessage as any).mockClear()

		// Make multiple rapid external changes
		const page1 = PageRecordType.create({
			id: PageRecordType.createId('rapid_page_1'),
			name: 'Rapid Page 1',
			index: 'a2' as IndexKey,
		})
		const page2 = PageRecordType.create({
			id: PageRecordType.createId('rapid_page_2'),
			name: 'Rapid Page 2',
			index: 'a3' as IndexKey,
		})

		storage.transaction((txn) => {
			txn.set(page1.id, page1)
		})
		storage.transaction((txn) => {
			txn.set(page2.id, page2)
		})

		// Wait for all microtasks to settle
		await Promise.resolve()

		// Client should have received patches for both changes
		const calls = (socket.sendMessage as any).mock.calls
		expect(calls.length).toBeGreaterThan(0)

		// Collect all patches received
		const allPatches: any[] = []
		for (const call of calls) {
			const msg = call[0]
			if (msg.type === 'data') {
				for (const item of msg.data) {
					if (item.type === 'patch') {
						allPatches.push(item)
					}
				}
			}
		}

		// Should have received both pages in patches
		const allDiffs = allPatches.reduce((acc, patch) => ({ ...acc, ...patch.diff }), {})
		expect(allDiffs[page1.id]).toBeDefined()
		expect(allDiffs[page2.id]).toBeDefined()
	})
})

describe('Migration idempotency', () => {
	it('running migrations twice does not cause issues', () => {
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
		// This would happen if TestServer ran migrations before TLSyncRoom constructor
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

	it('already migrated data is not modified again', () => {
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

	it('migration updates schema version in storage', () => {
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
})

describe('Protocol version handling', () => {
	it('sets supportsStringAppend to false for protocol version 7', () => {
		const storage = new InMemorySyncStorage<TLRecord>({ snapshot: makeSnapshot(records) })
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

		const socket = makeSocket()
		const sessionId = 'v7-session'

		room.handleNewSession({
			sessionId,
			socket,
			meta: undefined,
			isReadonly: false,
		})

		// Connect with protocol version 7 (which gets upgraded to 8 but with supportsStringAppend = false)
		room.handleMessage(sessionId, {
			connectRequestId: 'connect-1',
			lastServerClock: 0,
			protocolVersion: 7,
			schema: room.serializedSchema,
			type: 'connect',
		})

		const session = room.sessions.get(sessionId)
		expect(session?.state).toBe('connected')
		if (session?.state === 'connected') {
			expect(session.supportsStringAppend).toBe(false)
		}
	})

	it('sets supportsStringAppend to true for protocol version 8', () => {
		const storage = new InMemorySyncStorage<TLRecord>({ snapshot: makeSnapshot(records) })
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

		const socket = makeSocket()
		const sessionId = 'v8-session'

		room.handleNewSession({
			sessionId,
			socket,
			meta: undefined,
			isReadonly: false,
		})

		room.handleMessage(sessionId, {
			connectRequestId: 'connect-1',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(), // version 8
			schema: room.serializedSchema,
			type: 'connect',
		})

		const session = room.sessions.get(sessionId)
		expect(session?.state).toBe('connected')
		if (session?.state === 'connected') {
			expect(session.supportsStringAppend).toBe(true)
		}
	})

	it('getCanEmitStringAppend returns false when any client lacks string append support', () => {
		const storage = new InMemorySyncStorage<TLRecord>({ snapshot: makeSnapshot(records) })
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

		const socketV7 = makeSocket()
		const socketV8 = makeSocket()

		// Connect v8 client first
		room.handleNewSession({
			sessionId: 'v8-client',
			socket: socketV8,
			meta: undefined,
			isReadonly: false,
		})
		room.handleMessage('v8-client', {
			connectRequestId: 'connect-v8',
			lastServerClock: 0,
			protocolVersion: 8,
			schema: room.serializedSchema,
			type: 'connect',
		})

		// With only v8 client, should be true
		expect(room.getCanEmitStringAppend()).toBe(true)

		// Connect v7 client
		room.handleNewSession({
			sessionId: 'v7-client',
			socket: socketV7,
			meta: undefined,
			isReadonly: false,
		})
		room.handleMessage('v7-client', {
			connectRequestId: 'connect-v7',
			lastServerClock: 0,
			protocolVersion: 7,
			schema: room.serializedSchema,
			type: 'connect',
		})

		// With mixed clients, should be false
		expect(room.getCanEmitStringAppend()).toBe(false)
	})
})

describe('Presence store isolation', () => {
	it('presence changes do not affect document clock', () => {
		const storage = new InMemorySyncStorage<TLRecord>({
			snapshot: makeSnapshot(records, { documentClock: 10 }),
		})
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

		const socket = makeSocket()
		const sessionId = 'presence-test'

		room.handleNewSession({
			sessionId,
			socket,
			meta: undefined,
			isReadonly: false,
		})

		room.handleMessage(sessionId, {
			connectRequestId: 'connect-1',
			lastServerClock: 10,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
			type: 'connect',
		})

		const clockBefore = storage.getClock()

		// Send presence update
		room.handleMessage(sessionId, {
			type: 'push',
			clientClock: 1,
			diff: undefined,
			presence: [
				'put',
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('presence-1'),
					currentPageId: PageRecordType.createId('page_2'),
					userId: 'user-1',
					userName: 'Test User',
				}),
			],
		} as TLPushRequest<TLRecord>)

		// Document clock should not have changed
		expect(storage.getClock()).toBe(clockBefore)
	})

	it('presence is stored in presenceStore, not document storage', () => {
		const storage = new InMemorySyncStorage<TLRecord>({ snapshot: makeSnapshot(records) })
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

		const socket = makeSocket()
		const sessionId = 'presence-test'

		room.handleNewSession({
			sessionId,
			socket,
			meta: undefined,
			isReadonly: false,
		})

		room.handleMessage(sessionId, {
			connectRequestId: 'connect-1',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
			type: 'connect',
		})

		const session = room.sessions.get(sessionId)
		const presenceId = session?.presenceId

		// Send presence update
		room.handleMessage(sessionId, {
			type: 'push',
			clientClock: 1,
			diff: undefined,
			presence: [
				'put',
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('any'),
					currentPageId: PageRecordType.createId('page_2'),
					userId: 'user-1',
					userName: 'Test User',
				}),
			],
		} as TLPushRequest<TLRecord>)

		// Presence should be in presenceStore
		expect(room.presenceStore.get(presenceId!)).toBeDefined()

		// Presence should NOT be in document storage
		storage.transaction((txn) => {
			expect(txn.get(presenceId!)).toBeUndefined()
		})
	})

	it('presence is removed from presenceStore when session is removed', async () => {
		const storage = new InMemorySyncStorage<TLRecord>({ snapshot: makeSnapshot(records) })
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

		const socket = makeSocket()
		const sessionId = 'presence-test'

		room.handleNewSession({
			sessionId,
			socket,
			meta: undefined,
			isReadonly: false,
		})

		room.handleMessage(sessionId, {
			connectRequestId: 'connect-1',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
			type: 'connect',
		})

		const session = room.sessions.get(sessionId)!
		const presenceId = session.presenceId!

		// Send presence
		room.handleMessage(sessionId, {
			type: 'push',
			clientClock: 1,
			diff: undefined,
			presence: [
				'put',
				InstancePresenceRecordType.create({
					id: InstancePresenceRecordType.createId('any'),
					currentPageId: PageRecordType.createId('page_2'),
					userId: 'user-1',
					userName: 'Test User',
				}),
			],
		} as TLPushRequest<TLRecord>)

		expect(room.presenceStore.get(presenceId)).toBeDefined()

		// Close the session
		room.rejectSession(sessionId)

		// Presence should be removed
		expect(room.presenceStore.get(presenceId)).toBeUndefined()
	})
})

describe('Client with future clock', () => {
	it('handles client with lastServerClock greater than current documentClock', () => {
		const storage = new InMemorySyncStorage<TLRecord>({
			snapshot: makeSnapshot(records, { documentClock: 10 }),
		})
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

		const socket = makeSocket()
		const sessionId = 'future-clock-client'

		room.handleNewSession({
			sessionId,
			socket,
			meta: undefined,
			isReadonly: false,
		})

		// Client claims to have clock 100, but server is only at 10
		room.handleMessage(sessionId, {
			connectRequestId: 'connect-1',
			lastServerClock: 100, // Future clock!
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
			type: 'connect',
		})

		// Session should still connect successfully
		expect(room.sessions.get(sessionId)?.state).toBe('connected')

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

	it('provides all documents when client has future clock', () => {
		const storage = new InMemorySyncStorage<TLRecord>({
			snapshot: makeSnapshot(records, {
				documentClock: 5,
				documents: [
					{ state: records[0], lastChangedClock: 3 },
					{ state: records[1], lastChangedClock: 5 },
				],
			}),
		})
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

		const socket = makeSocket()
		const sessionId = 'future-client'

		room.handleNewSession({
			sessionId,
			socket,
			meta: undefined,
			isReadonly: false,
		})

		room.handleMessage(sessionId, {
			connectRequestId: 'connect-1',
			lastServerClock: 999,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
			type: 'connect',
		})

		const connectResponse = socket.__lastMessage
		expect(connectResponse?.type).toBe('connect')
		if (connectResponse?.type === 'connect') {
			// Both documents should be included regardless of their lastChangedClock
			expect(connectResponse.diff[records[0].id]).toBeDefined()
			expect(connectResponse.diff[records[1].id]).toBeDefined()
		}
	})
})

describe('Loading snapshot during active session', () => {
	it('broadcasts changes when snapshot is loaded via storage transaction', async () => {
		const storage = new InMemorySyncStorage<TLRecord>({ snapshot: makeSnapshot(records) })
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

		const socket = makeSocket()
		const sessionId = 'active-session'

		room.handleNewSession({
			sessionId,
			socket,
			meta: undefined,
			isReadonly: false,
		})

		room.handleMessage(sessionId, {
			connectRequestId: 'connect-1',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
			type: 'connect',
		})
		;(socket.sendMessage as any).mockClear()

		// Load a new snapshot with additional page
		const newPage = PageRecordType.create({
			id: PageRecordType.createId('new_page'),
			name: 'New Page',
			index: 'a2' as IndexKey,
		})

		storage.transaction((txn) => {
			txn.set(newPage.id, newPage)
		})

		// Wait for onChange to fire
		await Promise.resolve()

		// Client should have received the new page
		const calls = (socket.sendMessage as any).mock.calls
		expect(calls.length).toBeGreaterThan(0)

		const allPatches: any[] = []
		for (const call of calls) {
			const msg = call[0]
			if (msg.type === 'data') {
				for (const item of msg.data) {
					if (item.type === 'patch') {
						allPatches.push(item)
					}
				}
			}
		}

		const allDiffs = allPatches.reduce((acc, patch) => ({ ...acc, ...patch.diff }), {})
		expect(allDiffs[newPage.id]).toBeDefined()
	})

	it('handles document deletion during active session', async () => {
		const extraPage = PageRecordType.create({
			id: PageRecordType.createId('extra_page'),
			name: 'Extra Page',
			index: 'a2' as IndexKey,
		})

		const storage = new InMemorySyncStorage<TLRecord>({
			snapshot: makeSnapshot([...records, extraPage]),
		})
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

		const socket = makeSocket()
		const sessionId = 'active-session'

		room.handleNewSession({
			sessionId,
			socket,
			meta: undefined,
			isReadonly: false,
		})

		room.handleMessage(sessionId, {
			connectRequestId: 'connect-1',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
			type: 'connect',
		})
		;(socket.sendMessage as any).mockClear()

		// Delete the extra page via storage
		storage.transaction((txn) => {
			txn.delete(extraPage.id)
		})

		await Promise.resolve()

		// Client should have received the delete
		const calls = (socket.sendMessage as any).mock.calls
		expect(calls.length).toBeGreaterThan(0)

		const allPatches: any[] = []
		for (const call of calls) {
			const msg = call[0]
			if (msg.type === 'data') {
				for (const item of msg.data) {
					if (item.type === 'patch') {
						allPatches.push(item)
					}
				}
			}
		}

		const allDiffs = allPatches.reduce((acc, patch) => ({ ...acc, ...patch.diff }), {})
		expect(allDiffs[extraPage.id]).toEqual(['remove'])
	})
})

describe('Invalid record handling', () => {
	it('rejects session when push contains record with unknown type', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
		const storage = new InMemorySyncStorage<TLRecord>({ snapshot: makeSnapshot(records) })
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

		const socket = makeSocket()
		const sessionId = 'invalid-record-session'

		room.handleNewSession({
			sessionId,
			socket,
			meta: undefined,
			isReadonly: false,
		})

		room.handleMessage(sessionId, {
			connectRequestId: 'connect-1',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
			type: 'connect',
		})

		expect(room.sessions.get(sessionId)?.state).toBe('connected')

		// Try to push a record with an unknown type
		room.handleMessage(sessionId, {
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
		const session = room.sessions.get(sessionId)
		expect(session?.state === 'connected').toBe(false)
		consoleSpy.mockRestore()
	})
})

describe('Migration and patch handling', () => {
	it('successfully patches arrow shape with current schema', () => {
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

		const storage = new InMemorySyncStorage<TLRecord>({
			snapshot: makeSnapshot([...records, existingArrow]),
		})
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

		const socket = makeSocket()
		const sessionId = 'patch-migration-session'

		room.handleNewSession({
			sessionId,
			socket,
			meta: undefined,
			isReadonly: false,
		})

		// Connect with current schema
		room.handleMessage(sessionId, {
			connectRequestId: 'connect-1',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
			type: 'connect',
		})

		expect(room.sessions.get(sessionId)?.state).toBe('connected')

		// Patch the arrow - this should work normally
		room.handleMessage(sessionId, {
			type: 'push',
			clientClock: 1,
			diff: {
				[existingArrow.id]: ['patch', { props: ['patch', { color: ['put', 'red'] }] }],
			},
		} as TLPushRequest<TLRecord>)

		// Session should still be connected after valid patch
		expect(room.sessions.get(sessionId)?.state).toBe('connected')

		// Verify the patch was applied
		const patchedArrow = storage.documents.get(existingArrow.id)?.state as TLArrowShape
		expect(patchedArrow.props.color).toBe('red')
	})

	it('rejects client with incompatible schema version that lacks down migrations', () => {
		// Use an old schema version that can't connect (arrow v0 has no down migration)
		const serializedSchema = schema.serialize()
		const oldSerializedSchema: SerializedSchemaV2 = {
			schemaVersion: 2,
			sequences: {
				...serializedSchema.sequences,
				// Set arrow shape to version 0, which has retired down migrations
				'com.tldraw.shape.arrow': 0,
			},
		}

		const storage = new InMemorySyncStorage<TLRecord>({ snapshot: makeSnapshot(records) })
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

		const socket = makeSocket()
		const sessionId = 'old-client-session'

		room.handleNewSession({
			sessionId,
			socket,
			meta: undefined,
			isReadonly: false,
		})

		// Connect with old schema - this should fail because arrow v1 migration has no down function
		room.handleMessage(sessionId, {
			connectRequestId: 'connect-1',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: oldSerializedSchema,
			type: 'connect',
		})

		// Session should not be connected - it was rejected due to incompatible schema
		expect(room.sessions.get(sessionId)?.state).not.toBe('connected')

		// Socket should be closed with CLIENT_TOO_OLD
		expect(socket.isOpen).toBe(false)
	})

	it('accepts client with same schema version', () => {
		const storage = new InMemorySyncStorage<TLRecord>({ snapshot: makeSnapshot(records) })
		const room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

		const socket = makeSocket()
		const sessionId = 'current-client-session'

		room.handleNewSession({
			sessionId,
			socket,
			meta: undefined,
			isReadonly: false,
		})

		// Connect with same schema
		room.handleMessage(sessionId, {
			connectRequestId: 'connect-1',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion(),
			schema: room.serializedSchema,
			type: 'connect',
		})

		// Session should be connected
		expect(room.sessions.get(sessionId)?.state).toBe('connected')
	})
})
