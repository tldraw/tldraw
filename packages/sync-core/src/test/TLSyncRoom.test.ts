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
			snapshot: makeSnapshot([...records, oldArrow], {
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

	it('filters out instance state records', () => {
		const schema = createTLSchema({ shapes: {}, bindings: {} })
		const storage = new InMemorySyncStorage<TLRecord>({
			snapshot: makeSnapshot([
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
			]),
		})
		const _room = new TLSyncRoom({
			schema,
			storage,
		})

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
		      "serverClock": 1,
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
		      "serverClock": 2,
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
		      "serverClock": 1,
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
		      "serverClock": 1,
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

		describe('Document clock initialization logic', () => {
			it('sets documentClock to room clock when migrations run (didIncrementClock = true)', () => {
				// Create a schema with a migration that will update documents
				const schemaWithMigration = createTLSchema({
					migrations: [
						{
							sequenceId: 'test-migration',
							retroactive: false,
							sequence: [
								{
									id: 'test-migration/1',
									scope: 'record',
									filter: (record: any) => record.typeName === 'document',
									up: (record: any) => {
										// Modify the record to trigger clock increment
										return { ...record, meta: { ...record.meta, migrated: true } }
									},
								},
							],
						},
					],
				})

				const snapshotWithDocumentClock = makeSnapshot(records, {
					documentClock: 5,
					clock: 10,
				})

				const onDataChange = vi.fn()
				const storage = new InMemorySyncStorage<TLRecord>({ snapshot: snapshotWithDocumentClock })
				storage.onChange(onDataChange)
				const _room = new TLSyncRoom<TLRecord, undefined>({ schema: schemaWithMigration, storage })

				// Migration should have run, incrementing the clock
				expect(storage.getSnapshot().clock).toBe(11)
				expect(storage.getSnapshot().documentClock).toBe(11)
				expect(onDataChange).toHaveBeenCalled()
			})

			it('preserves documentClock from snapshot when no migrations run (didIncrementClock = false)', () => {
				const snapshotWithDocumentClock = makeSnapshot(records, {
					documentClock: 15,
					clock: 20,
				})

				const onDataChange = vi.fn()
				const storage = new InMemorySyncStorage<TLRecord>({ snapshot: snapshotWithDocumentClock })
				storage.onChange(onDataChange)
				const _room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })

				// No migrations should have run
				expect(storage.getSnapshot().documentClock).toBe(15)
				expect(storage.getSnapshot().clock).toBe(20)
				expect(onDataChange).not.toHaveBeenCalled()
			})

			it('calculates documentClock when snapshot lacks documentClock field (didIncrementClock = false)', () => {
				const legacySnapshot = makeLegacySnapshot(records, {
					documents: [
						{ state: records[0], lastChangedClock: 7 },
						{ state: records[1], lastChangedClock: 12 },
					],
					clock: 15,
				})

				const onDataChange = vi.fn()
				const storage = new InMemorySyncStorage<TLRecord>({ snapshot: legacySnapshot })
				storage.onChange(onDataChange)
				const _room = new TLSyncRoom<TLRecord, undefined>({ schema, storage })
				// Should calculate from existing data
				expect(storage.getSnapshot().documentClock).toBe(12) // max lastChangedClock
				expect(storage.getSnapshot().clock).toBe(15) // clock from snapshot
				expect(onDataChange).not.toHaveBeenCalled()
			})
		})
	})
})
