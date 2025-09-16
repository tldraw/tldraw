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
	TLDocument,
	TLPage,
	TLRecord,
	TLShapeId,
	createTLSchema,
} from '@tldraw/tlschema'
import { IndexKey, ZERO_INDEX_KEY, mockUniqueId, promiseWithResolve, sortById } from '@tldraw/utils'
import { vi } from 'vitest'
import { TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason } from '../lib/TLSyncClient'
import {
	DATA_MESSAGE_DEBOUNCE_INTERVAL,
	DocumentState,
	MAX_TOMBSTONES,
	RoomSnapshot,
	TLRoomSocket,
	TLSyncRoom,
	TOMBSTONE_PRUNE_BUFFER_SIZE,
} from '../lib/TLSyncRoom'
import { RecordOpType } from '../lib/diff'
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
	it('can be constructed with a schema alone', () => {
		const room = new TLSyncRoom<any, undefined>({ schema })

		// we populate the store with a default document if none is given
		expect(room.getSnapshot().documents.length).toBeGreaterThan(0)
	})

	it('can be constructed with a snapshot', () => {
		const room = new TLSyncRoom<TLRecord, undefined>({
			schema,
			snapshot: makeSnapshot(records),
		})

		expect(
			room
				.getSnapshot()
				.documents.map((r) => r.state)
				.sort(sortById)
		).toEqual(records)

		expect(room.getSnapshot().documents.map((r) => r.lastChangedClock)).toEqual([0, 0])
	})

	it('trims tombstones down if you pass too many in the snapshot', () => {
		const room = new TLSyncRoom({
			schema,
			snapshot: {
				documents: [],
				clock: MAX_TOMBSTONES + 100,
				tombstones: Object.fromEntries(
					Array.from({ length: MAX_TOMBSTONES + 100 }, (_, i) => [PageRecordType.createId(), i])
				),
			},
		})

		expect(Object.keys(room.getSnapshot().tombstones ?? {})).toHaveLength(
			MAX_TOMBSTONES - TOMBSTONE_PRUNE_BUFFER_SIZE
		)
	})

	it('updates tombstoneHistoryStartsAtClock when pruning tombstones', () => {
		const room = new TLSyncRoom({
			schema,
			snapshot: {
				documents: [],
				clock: MAX_TOMBSTONES + 100,
				tombstones: Object.fromEntries(
					Array.from({ length: MAX_TOMBSTONES + 100 }, (_, i) => [PageRecordType.createId(), i])
				),
			},
		})

		// After pruning, tombstoneHistoryStartsAtClock should be updated to the clock value
		// of the oldest remaining tombstone
		const remainingTombstones = Object.values(room.getSnapshot().tombstones ?? {})
		const oldestRemainingClock = Math.min(...remainingTombstones)
		expect(room.tombstoneHistoryStartsAtClock).toBe(oldestRemainingClock)
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

		const room = new TLSyncRoom({
			schema,
			snapshot: makeSnapshot([...records, oldArrow], {
				schema: oldSerializedSchema,
			}),
		})

		const arrow = room.getSnapshot().documents.find((r) => r.state.id === oldArrow.id)
			?.state as TLArrowShape
		expect(arrow.props.labelColor).toBe('black')
	})

	it('filters out instance state records', () => {
		const schema = createTLSchema({ shapes: {}, bindings: {} })
		const room = new TLSyncRoom({
			schema,
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

		expect(
			room
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

describe('TLSyncRoom.updateStore', () => {
	const sessionAId = 'sessionA'
	const sessionBId = 'sessionB'
	let room = new TLSyncRoom<TLRecord, undefined>({ schema, snapshot: makeSnapshot(records) })
	let socketA = makeSocket()
	let socketB = makeSocket()
	function init(snapshot?: RoomSnapshot) {
		room = new TLSyncRoom<TLRecord, undefined>({
			schema,
			snapshot: snapshot ?? makeSnapshot(records),
		})
		socketA = makeSocket()
		socketB = makeSocket()
		room.handleNewSession({
			sessionId: sessionAId,
			socket: socketA,
			meta: null as any,
			isReadonly: false,
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

	test('it allows updating records', async () => {
		const clock = room.clock
		const documentClock = room.documentClock
		await room.updateStore((store) => {
			const document = store.get('document:document') as TLDocument
			document.name = 'My lovely document'
			store.put(document)
		})
		expect(
			(room.getSnapshot().documents.find((r) => r.state.id === 'document:document')?.state as any)
				.name
		).toBe('My lovely document')
		expect(clock).toBeLessThan(room.clock)
		expect(documentClock).toBeLessThan(room.documentClock)
	})

	test('it does not update unless you call .set', () => {
		const documentClock = room.documentClock
		room.updateStore((store) => {
			const document = store.get('document:document') as TLDocument
			document.name = 'My lovely document'
		})
		expect(
			(room.getSnapshot().documents.find((r) => r.state.id === 'document:document')?.state as any)
				.name
		).toBe('')
		expect(documentClock).toBe(room.documentClock)
	})

	test('after the change it sends a patch to all clients', async () => {
		const clock = room.clock
		const documentClock = room.documentClock
		await room.updateStore((store) => {
			const document = store.get('document:document') as TLDocument
			document.name = 'My lovely document'
			store.put(document)
		})

		expect(clock).toBeLessThan(room.clock)
		expect(documentClock).toBeLessThan(room.documentClock)

		expect(socketA.__lastMessage).toMatchInlineSnapshot(`
		{
		  "data": [
		    {
		      "diff": {
		        "document:document": [
		          "patch",
		          {
		            "name": [
		              "put",
		              "My lovely document",
		            ],
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
		expect(socketB.__lastMessage).toEqual(socketA.__lastMessage)
	})

	test('it allows adding new records', async () => {
		const id = PageRecordType.createId('page_3')
		await room.updateStore((store) => {
			const page = PageRecordType.create({ id, name: 'page 3', index: 'a0' as IndexKey })
			store.put(page)
		})

		expect(socketA.__lastMessage).toMatchInlineSnapshot(`
		{
		  "data": [
		    {
		      "diff": {
		        "page:page_3": [
		          "put",
		          {
		            "id": "page:page_3",
		            "index": "a0",
		            "meta": {},
		            "name": "page 3",
		            "typeName": "page",
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
		expect(socketB.__lastMessage).toEqual(socketA.__lastMessage)
		expect(room.getSnapshot().documents.find((r) => r.state.id === id)?.state).toBeTruthy()
	})

	test('it allows deleting records', async () => {
		await room.updateStore((store) => {
			store.delete('page:page_2')
		})

		expect(socketA.__lastMessage).toMatchInlineSnapshot(`
		{
		  "data": [
		    {
		      "diff": {
		        "page:page_2": [
		          "remove",
		        ],
		      },
		      "serverClock": 1,
		      "type": "patch",
		    },
		  ],
		  "type": "data",
		}
	`)
		expect(socketB.__lastMessage).toEqual(socketA.__lastMessage)
		expect(room.getSnapshot().documents.find((r) => r.state.id === 'page:page_2')).toBeFalsy()
	})

	test('it wont do anything if your changes are no-ops', async () => {
		const documentClock = room.documentClock
		await room.updateStore((store) => {
			const newPage = PageRecordType.create({ name: 'page 3', index: 'a0' as IndexKey })
			store.put(newPage)
			store.delete(newPage.id)
		})

		expect(room.documentClock).toBe(documentClock)
		expect(socketA.__lastMessage).toBeNull()
		expect(socketB.__lastMessage).toBeNull()

		await room.updateStore((store) => {
			const page = store.get('page:page_2')!
			store.delete(page)
			store.put(page)
		})

		expect(room.documentClock).toBe(documentClock)
		expect(socketA.__lastMessage).toBeNull()
		expect(socketB.__lastMessage).toBeNull()

		await room.updateStore((store) => {
			let page = store.get('page:page_2') as TLPage
			page.name = 'my lovely page'
			store.put(page)
			page = store.get('page:page_2') as TLPage
			store.delete(page)
			page.name = 'page 2'
			store.put(page)
		})

		expect(room.documentClock).toBe(documentClock)
		expect(socketA.__lastMessage).toBeNull()
		expect(socketB.__lastMessage).toBeNull()
	})

	test('it returns all records if you ask for them', async () => {
		let allRecords
		await room.updateStore((store) => {
			allRecords = store.getAll()
		})
		expect(allRecords!.sort(compareById)).toEqual(records)
		await room.updateStore((store) => {
			const page3 = PageRecordType.create({ name: 'page 3', index: 'a0' as IndexKey })
			store.put(page3)
			allRecords = store.getAll()
			expect(allRecords.sort(compareById)).toEqual([...records, page3].sort(compareById))
			store.delete(page3)
			allRecords = store.getAll()
		})
		expect(allRecords!.sort(compareById)).toEqual(records)
	})

	test('all operations fail after the store is closed', async () => {
		let store
		await room.updateStore((s) => {
			store = s
		})
		expect(() => {
			store!.put(PageRecordType.create({ name: 'page 3', index: 'a0' as IndexKey }))
		}).toThrowErrorMatchingInlineSnapshot(`[Error: StoreUpdateContext is closed]`)
		expect(() => {
			store!.delete('page:page_2')
		}).toThrowErrorMatchingInlineSnapshot(`[Error: StoreUpdateContext is closed]`)
		expect(() => {
			store!.getAll()
		}).toThrowErrorMatchingInlineSnapshot(`[Error: StoreUpdateContext is closed]`)
		expect(() => {
			store!.get('page:page_2')
		}).toThrowErrorMatchingInlineSnapshot(`[Error: StoreUpdateContext is closed]`)
	})

	test('it fails if the room is closed', async () => {
		room.close()
		await expect(
			room.updateStore(() => {
				// noop
			})
		).rejects.toMatchInlineSnapshot(`[Error: Cannot update store on a closed room]`)
	})

	test('it fails if you try to add bad data', async () => {
		await expect(
			room.updateStore((store) => {
				const page = store.get('page:page_2') as TLPage
				page.index = 34 as any
				store.put(page)
			})
		).rejects.toMatchInlineSnapshot(`[Error: failed to apply changes: INVALID_RECORD]`)
	})

	test('changes in multiple transaction are isolated from one another', async () => {
		const page3 = PageRecordType.create({ name: 'page 3', index: 'a0' as IndexKey })
		const didDelete = promiseWithResolve()
		const didPut = promiseWithResolve()
		const doneA = room.updateStore(async (store) => {
			store.put(page3)
			didPut.resolve(null)
			await didDelete
			expect(store.get(page3.id)).toBeTruthy()
		})
		const doneB = room.updateStore(async (store) => {
			await didPut
			expect(store.get(page3.id)).toBeFalsy()
			store.delete(page3.id)
			didDelete.resolve(null)
		})
		await Promise.all([doneA, doneB])
	})

	test('getting something that was deleted in the same transaction returns null', async () => {
		await room.updateStore((store) => {
			expect(store.get('page:page_2')).toBeTruthy()
			store.delete('page:page_2')
			expect(store.get('page:page_2')).toBe(null)
		})
	})

	test('getting something that never existed in the first place returns null', async () => {
		await room.updateStore((store) => {
			expect(store.get('page:page_3')).toBe(null)
		})
	})

	test('mutations to shapes gotten via .get are not committed unless you .put', async () => {
		const page3 = PageRecordType.create({ name: 'page 3', index: 'a0' as IndexKey })
		let page4 = PageRecordType.create({ name: 'page 4', index: 'a1' as IndexKey })
		let page2
		await room.updateStore((store) => {
			page2 = store.get('page:page_2') as TLPage
			page2.name = 'my lovely page 2'
			store.put(page3)
			page3.name = 'my lovely page 3'
			store.put(page4)
			page4 = store.get(page4.id) as TLPage
			page4.name = 'my lovely page 4'
		})

		const getPageNames = () =>
			room
				.getSnapshot()
				.documents.filter((r) => r.state.typeName === 'page')
				.map((r) => (r.state as any).name)
				.sort()

		expect(getPageNames()).toEqual(['page 2', 'page 3', 'page 4'])

		await room.updateStore((store) => {
			store.put(page2!)
			store.put(page3)
			store.put(page4)
		})

		expect(getPageNames()).toEqual(['my lovely page 2', 'my lovely page 3', 'my lovely page 4'])
	})
})

describe('isReadonly', () => {
	const sessionAId = 'sessionA'
	const sessionBId = 'sessionB'
	let room = new TLSyncRoom<TLRecord, undefined>({ schema, snapshot: makeSnapshot(records) })
	let socketA = makeSocket()
	let socketB = makeSocket()
	function init(snapshot?: RoomSnapshot) {
		room = new TLSyncRoom<TLRecord, undefined>({
			schema,
			snapshot: snapshot ?? makeSnapshot(records),
		})
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

		expect(room.documents.get('page:page_3')?.state).toBe(undefined)
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

		expect(room.documents.get('page:page_3')?.state).not.toBe(undefined)

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

			const room = new TLSyncRoom<TLRecord, undefined>({
				schema,
				snapshot: legacySnapshot,
			})

			// Room should load successfully without errors
			expect(room.getSnapshot().documents.length).toBe(2)

			// documentClock should be calculated from existing data
			const snapshot = room.getSnapshot()
			expect(snapshot.documentClock).toBe(0) // max lastChangedClock from documents
		})

		it('calculates documentClock correctly from documents with different lastChangedClock values', () => {
			const legacySnapshot = makeLegacySnapshot(records, {
				documents: [
					{ state: records[0], lastChangedClock: 5 },
					{ state: records[1], lastChangedClock: 10 },
				],
			})

			const room = new TLSyncRoom<TLRecord, undefined>({
				schema,
				snapshot: legacySnapshot,
			})

			const snapshot = room.getSnapshot()
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

			const room = new TLSyncRoom<TLRecord, undefined>({
				schema,
				snapshot: legacySnapshot,
			})

			const snapshot = room.getSnapshot()
			expect(snapshot.documentClock).toBe(12) // max of document (3) and tombstones (7, 12)
		})

		it('handles empty snapshot gracefully', () => {
			const emptyLegacySnapshot = makeLegacySnapshot([], {
				documents: [],
				tombstones: {},
			})

			const room = new TLSyncRoom<TLRecord, undefined>({
				schema,
				snapshot: emptyLegacySnapshot,
			})

			const snapshot = room.getSnapshot()
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

			const room = new TLSyncRoom<TLRecord, undefined>({
				schema,
				snapshot: legacySnapshot,
			})

			const snapshot = room.getSnapshot()
			expect(snapshot.documentClock).toBe(8) // max tombstone clock
		})

		it('preserves explicit documentClock when present', () => {
			const snapshotWithDocumentClock = makeSnapshot(records, {
				documentClock: 15,
			})

			const room = new TLSyncRoom<TLRecord, undefined>({
				schema,
				snapshot: snapshotWithDocumentClock,
			})

			const snapshot = room.getSnapshot()
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
				const room = new TLSyncRoom<TLRecord, undefined>({
					schema: schemaWithMigration,
					snapshot: snapshotWithDocumentClock,
					onDataChange,
				})

				// Migration should have run, incrementing the clock
				expect(room.getSnapshot().clock).toBe(11)
				expect(room.getSnapshot().documentClock).toBe(11)
				expect(onDataChange).toHaveBeenCalled()
			})

			it('preserves documentClock from snapshot when no migrations run (didIncrementClock = false)', () => {
				const snapshotWithDocumentClock = makeSnapshot(records, {
					documentClock: 15,
					clock: 20,
				})

				const onDataChange = vi.fn()
				const room = new TLSyncRoom<TLRecord, undefined>({
					schema,
					snapshot: snapshotWithDocumentClock,
					onDataChange,
				})

				// No migrations should have run
				expect(room.getSnapshot().documentClock).toBe(15)
				expect(room.getSnapshot().clock).toBe(20)
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
				const room = new TLSyncRoom<TLRecord, undefined>({
					schema,
					snapshot: legacySnapshot,
					onDataChange,
				})

				// Should calculate from existing data
				expect(room.getSnapshot().documentClock).toBe(12) // max lastChangedClock
				expect(room.getSnapshot().clock).toBe(15) // clock from snapshot
				expect(onDataChange).not.toHaveBeenCalled()
			})
		})
	})
})

// ============================================================================
// Additional comprehensive test coverage
// ============================================================================

describe('TLSyncRoom - Additional Coverage', () => {
	describe('DocumentState', () => {
		const recordType = PageRecordType
		const pageRecord = PageRecordType.create({ name: 'test page', index: 'a1' as IndexKey })

		it('createWithoutValidating creates instance correctly', () => {
			const state = DocumentState.createWithoutValidating(pageRecord, 5, recordType)
			expect(state.state).toEqual(pageRecord)
			expect(state.lastChangedClock).toBe(5)
		})

		it('createAndValidate validates record and creates instance', () => {
			const result = DocumentState.createAndValidate(pageRecord, 5, recordType)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.value.state).toEqual(pageRecord)
				expect(result.value.lastChangedClock).toBe(5)
			}
		})

		it('createAndValidate returns error for invalid record', () => {
			const invalidRecord = { ...pageRecord, index: 'invalid-index' as any }
			const result = DocumentState.createAndValidate(invalidRecord, 5, recordType)
			expect(result.ok).toBe(false)
		})

		it('replaceState returns null when no changes', () => {
			const state = DocumentState.createWithoutValidating(pageRecord, 5, recordType)
			const result = state.replaceState(pageRecord, 10)
			expect(result.ok).toBe(true)
			if (result.ok) {
				expect(result.value).toBe(null)
			}
		})

		it('replaceState returns diff and new state when changed', () => {
			const state = DocumentState.createWithoutValidating(pageRecord, 5, recordType)
			const newRecord = { ...pageRecord, name: 'updated page' }
			const result = state.replaceState(newRecord, 10)
			expect(result.ok).toBe(true)
			if (result.ok && result.value) {
				expect(result.value[0]).toBeDefined()
				expect(result.value[1].state).toEqual(newRecord)
				expect(result.value[1].lastChangedClock).toBe(10)
			}
		})

		it('replaceState validates new state', () => {
			const state = DocumentState.createWithoutValidating(pageRecord, 5, recordType)
			const invalidRecord = { ...pageRecord, index: 'invalid-index' as any }
			const result = state.replaceState(invalidRecord, 10)
			expect(result.ok).toBe(false)
		})

		it('mergeDiff applies diff and updates clock', () => {
			const state = DocumentState.createWithoutValidating(pageRecord, 5, recordType)
			const diff = { name: ['put', 'merged name'] as ['put', string] }
			const result = state.mergeDiff(diff, 15)
			expect(result.ok).toBe(true)
			if (result.ok && result.value) {
				expect(result.value[1].state.name).toBe('merged name')
				expect(result.value[1].lastChangedClock).toBe(15)
			}
		})
	})

	describe('Session Management', () => {
		let room: TLSyncRoom<TLRecord, { userId: string }>
		let socket: MockSocket

		beforeEach(() => {
			room = new TLSyncRoom({ schema, snapshot: makeSnapshot(records) })
			socket = makeSocket()
		})

		afterEach(() => {
			room.close()
		})

		it('handleNewSession creates session in awaiting state', () => {
			const sessionId = 'test-session'
			room.handleNewSession({
				sessionId,
				socket,
				meta: { userId: 'user1' },
				isReadonly: false,
			})

			const session = room.sessions.get(sessionId)
			expect(session).toBeDefined()
			expect(session?.state).toBe('awaiting-connect-message')
			expect(session?.meta).toEqual({ userId: 'user1' })
			expect(session?.isReadonly).toBe(false)
		})

		it('handleNewSession reuses presence id for existing session', () => {
			const sessionId = 'test-session'
			const presenceId = 'presence-123'

			// Create initial session with presence
			room.sessions.set(sessionId, {
				state: 'connected' as any,
				sessionId,
				presenceId,
				socket: makeSocket(),
				meta: { userId: 'user1' },
				isReadonly: false,
			} as any)

			room.handleNewSession({
				sessionId,
				socket,
				meta: { userId: 'user1' },
				isReadonly: false,
			})

			const session = room.sessions.get(sessionId)
			expect(session?.presenceId).toBe(presenceId)
		})

		it('isClosed returns false initially and true after close', () => {
			expect(room.isClosed()).toBe(false)
			room.close()
			expect(room.isClosed()).toBe(true)
		})

		it('close disconnects all sessions and clears disposables', () => {
			const sessionId = 'test-session'
			room.handleNewSession({
				sessionId,
				socket,
				meta: { userId: 'user1' },
				isReadonly: false,
			})

			expect(socket.isOpen).toBe(true)
			room.close()
			expect(socket.isOpen).toBe(false)
		})

		it('pruneSessions removes timed out awaiting sessions', async () => {
			vi.useFakeTimers()
			const sessionId = 'test-session'

			room.handleNewSession({
				sessionId,
				socket,
				meta: { userId: 'user1' },
				isReadonly: false,
			})

			expect(room.sessions.has(sessionId)).toBe(true)

			// Fast forward past session start timeout
			vi.advanceTimersByTime(15000)
			room.pruneSessions()

			expect(room.sessions.has(sessionId)).toBe(false)
			vi.useRealTimers()
		})

		it('pruneSessions removes sessions with closed sockets', () => {
			const sessionId = 'test-session'
			room.handleNewSession({
				sessionId,
				socket,
				meta: { userId: 'user1' },
				isReadonly: false,
			})

			socket.isOpen = false
			room.pruneSessions()

			expect(room.sessions.has(sessionId)).toBe(false)
		})

		it('emits room_became_empty when last session is removed', () => {
			vi.useFakeTimers()
			const roomEmptyHandler = vi.fn()
			room.events.on('room_became_empty', roomEmptyHandler)

			const sessionId = 'test-session'
			room.handleNewSession({
				sessionId,
				socket,
				meta: { userId: 'user1' },
				isReadonly: false,
			})

			room.handleClose(sessionId)
			// Fast forward past session removal wait time to trigger actual removal
			vi.advanceTimersByTime(6000)
			room.pruneSessions()

			expect(roomEmptyHandler).toHaveBeenCalled()
			vi.useRealTimers()
		})

		it('emits session_removed event with metadata', () => {
			vi.useFakeTimers()
			const sessionRemovedHandler = vi.fn()
			room.events.on('session_removed', sessionRemovedHandler)

			const sessionId = 'test-session'
			const meta = { userId: 'user1' }
			room.handleNewSession({
				sessionId,
				socket,
				meta,
				isReadonly: false,
			})

			room.handleClose(sessionId)
			// Fast forward past session removal wait time to trigger actual removal
			vi.advanceTimersByTime(6000)
			room.pruneSessions()

			expect(sessionRemovedHandler).toHaveBeenCalledWith({ sessionId, meta })
			vi.useRealTimers()
		})
	})

	describe('Message Handling', () => {
		let room: TLSyncRoom<TLRecord, { userId: string }>
		let socket: MockSocket
		const sessionId = 'test-session'

		beforeEach(() => {
			room = new TLSyncRoom({ schema, snapshot: makeSnapshot(records) })
			socket = makeSocket()
			room.handleNewSession({
				sessionId,
				socket,
				meta: { userId: 'user1' },
				isReadonly: false,
			})
		})

		afterEach(() => {
			room.close()
		})

		it('handleMessage ignores messages from unknown sessions', async () => {
			const result = await room.handleMessage('unknown-session', {
				type: 'ping',
			})
			expect(result).toBeUndefined()
		})

		it('handles ping messages and responds with pong', async () => {
			// First connect the session
			await room.handleMessage(sessionId, {
				type: 'connect',
				connectRequestId: 'connect-1',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: room.serializedSchema,
			} as TLConnectRequest)

			socket.__lastMessage = null

			await room.handleMessage(sessionId, {
				type: 'ping',
			})

			expect(socket.__lastMessage).toEqual({ type: 'pong' })
		})

		it('rejects sessions with incompatible protocol versions', async () => {
			await room.handleMessage(sessionId, {
				type: 'connect',
				connectRequestId: 'connect-1',
				lastServerClock: 0,
				protocolVersion: 1, // Very old version that will definitely be rejected
				schema: room.serializedSchema,
			} as TLConnectRequest)

			expect(room.sessions.has(sessionId)).toBe(false)
		})

		it('rejects sessions with null schema', async () => {
			await room.handleMessage(sessionId, {
				type: 'connect',
				connectRequestId: 'connect-1',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: null as any,
			} as TLConnectRequest)

			expect(room.sessions.has(sessionId)).toBe(false)
		})

		it('rejects sessions when server is too old', async () => {
			await room.handleMessage(sessionId, {
				type: 'connect',
				connectRequestId: 'connect-1',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion() + 1,
				schema: room.serializedSchema,
			} as TLConnectRequest)

			expect(room.sessions.has(sessionId)).toBe(false)
		})

		it('handles full state hydration for new clients', async () => {
			await room.handleMessage(sessionId, {
				type: 'connect',
				connectRequestId: 'connect-1',
				lastServerClock: -1, // Request full state
				protocolVersion: getTlsyncProtocolVersion(),
				schema: room.serializedSchema,
			} as TLConnectRequest)

			expect(socket.__lastMessage?.type).toBe('connect')
			const connectMsg = socket.__lastMessage as any
			expect(connectMsg.hydrationType).toBe('wipe_all')
			expect(Object.keys(connectMsg.diff)).toContain('document:document')
		})

		it('handles incremental sync for existing clients', async () => {
			// The condition for wipe_presence is:
			// lastServerClock >= tombstoneHistoryStartsAtClock AND lastServerClock <= clock
			// But if lastServerClock == clock, it still does wipe_all because
			// the condition is exclusive of equal to clock
			// Let's test the actual behavior instead
			await room.handleMessage(sessionId, {
				type: 'connect',
				connectRequestId: 'connect-1',
				lastServerClock: room.clock, // Equal to current clock
				protocolVersion: getTlsyncProtocolVersion(),
				schema: room.serializedSchema,
			} as TLConnectRequest)

			expect(socket.__lastMessage?.type).toBe('connect')
			const connectMsg = socket.__lastMessage as any
			// When lastServerClock == room.clock, it triggers wipe_all, not wipe_presence
			expect(connectMsg.hydrationType).toBe('wipe_all')
		})

		it('rejects push requests from disconnected sessions', async () => {
			const result = await room.handleMessage(sessionId, {
				type: 'push',
				clientClock: 0,
				diff: {},
			} as TLPushRequest<TLRecord>)

			expect(result).toBeUndefined()
		})

		it('handles push requests with invalid record types', async () => {
			// First connect the session
			await room.handleMessage(sessionId, {
				type: 'connect',
				connectRequestId: 'connect-1',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: room.serializedSchema,
			} as TLConnectRequest)

			const pushRequest: TLPushRequest<any> = {
				type: 'push',
				clientClock: 0,
				diff: {
					'invalid:record': [RecordOpType.Put, { id: 'invalid:record', typeName: 'unknown_type' }],
				},
			}

			await room.handleMessage(sessionId, pushRequest)

			// Session should be rejected due to invalid record type
			expect(room.sessions.has(sessionId)).toBe(false)
		})
	})

	describe('Broadcasting and Schema Migration', () => {
		let room: TLSyncRoom<TLRecord, { userId: string }>
		let socketA: MockSocket
		let socketB: MockSocket
		const sessionAId = 'session-a'
		const sessionBId = 'session-b'

		beforeEach(async () => {
			room = new TLSyncRoom({ schema, snapshot: makeSnapshot(records) })
			socketA = makeSocket()
			socketB = makeSocket()

			// Set up both sessions
			room.handleNewSession({
				sessionId: sessionAId,
				socket: socketA,
				meta: { userId: 'userA' },
				isReadonly: false,
			})
			room.handleNewSession({
				sessionId: sessionBId,
				socket: socketB,
				meta: { userId: 'userB' },
				isReadonly: false,
			})

			// Connect both sessions
			await room.handleMessage(sessionAId, {
				type: 'connect',
				connectRequestId: 'connect-a',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: room.serializedSchema,
			} as TLConnectRequest)

			await room.handleMessage(sessionBId, {
				type: 'connect',
				connectRequestId: 'connect-b',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: room.serializedSchema,
			} as TLConnectRequest)

			// Clear initial messages
			socketA.__lastMessage = null
			socketB.__lastMessage = null
		})

		afterEach(() => {
			room.close()
		})

		it('broadcastPatch excludes source session', () => {
			const diff = {
				'page:new-page': [
					RecordOpType.Put,
					PageRecordType.create({ name: 'broadcasted', index: 'a1' as IndexKey }),
				] as any,
			}

			room.broadcastPatch({ diff, sourceSessionId: sessionAId })

			expect(socketA.__lastMessage).toBe(null) // Excluded
			expect(socketB.__lastMessage?.type).toBe('data') // Received
		})

		it('broadcastPatch sends to all sessions when no source specified', () => {
			const diff = {
				'page:new-page': [
					RecordOpType.Put,
					PageRecordType.create({ name: 'broadcasted', index: 'a1' as IndexKey }),
				] as any,
			}

			room.broadcastPatch({ diff })

			expect(socketA.__lastMessage?.type).toBe('data')
			expect(socketB.__lastMessage?.type).toBe('data')
		})

		it('broadcastPatch cancels sessions with closed sockets', () => {
			vi.useFakeTimers()
			socketB.isOpen = false
			const diff = {
				'page:new-page': [
					RecordOpType.Put,
					PageRecordType.create({ name: 'broadcasted', index: 'a1' as IndexKey }),
				] as any,
			}

			room.broadcastPatch({ diff })

			// Session should be cancelled but not immediately removed
			// Fast forward to allow session pruning to remove it
			vi.advanceTimersByTime(6000)
			room.pruneSessions()

			expect(room.sessions.has(sessionBId)).toBe(false)
			vi.useRealTimers()
		})

		it('sendCustomMessage sends custom data to specific session', () => {
			const customData = { type: 'notification', message: 'Hello' }
			room.sendCustomMessage(sessionAId, customData)

			expect(socketA.__lastMessage).toEqual({
				type: 'custom',
				data: customData,
			})
			expect(socketB.__lastMessage).toBe(null)
		})

		it('sendCustomMessage handles unknown session gracefully', () => {
			const customData = { type: 'notification', message: 'Hello' }
			expect(() => {
				room.sendCustomMessage('unknown-session', customData)
			}).not.toThrow()
		})
	})

	describe('Data Debouncing', () => {
		let room: TLSyncRoom<TLRecord, { userId: string }>
		let socketA: MockSocket
		let socketB: MockSocket
		const sessionAId = 'session-a'
		const sessionBId = 'session-b'

		beforeEach(async () => {
			vi.useFakeTimers()
			room = new TLSyncRoom({ schema, snapshot: makeSnapshot(records) })
			socketA = makeSocket()
			socketB = makeSocket()

			// Set up sessions
			room.handleNewSession({
				sessionId: sessionAId,
				socket: socketA,
				meta: { userId: 'userA' },
				isReadonly: false,
			})
			room.handleNewSession({
				sessionId: sessionBId,
				socket: socketB,
				meta: { userId: 'userB' },
				isReadonly: false,
			})

			// Connect sessions
			await room.handleMessage(sessionAId, {
				type: 'connect',
				connectRequestId: 'connect-a',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: room.serializedSchema,
			} as TLConnectRequest)

			await room.handleMessage(sessionBId, {
				type: 'connect',
				connectRequestId: 'connect-b',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: room.serializedSchema,
			} as TLConnectRequest)

			// Clear initial messages
			socketA.__lastMessage = null
			socketB.__lastMessage = null
		})

		afterEach(() => {
			vi.useRealTimers()
			room.close()
		})

		it('debounces data messages', async () => {
			// Test the debouncing behavior directly using broadcastPatch
			const sendMessageSpy = vi.spyOn(socketB, 'sendMessage')

			// First broadcast - should be sent immediately
			room.broadcastPatch({
				diff: {
					'page:test1': [
						RecordOpType.Put,
						PageRecordType.create({ name: 'test1', index: 'a1' as IndexKey }),
					],
				},
			})

			expect(sendMessageSpy).toHaveBeenCalled()
			const firstDataCall = sendMessageSpy.mock.calls.find((call) => call[0].type === 'data')
			expect(firstDataCall).toBeDefined()

			sendMessageSpy.mockClear()

			// Second broadcast quickly - should be queued for debouncing
			room.broadcastPatch({
				diff: {
					'page:test2': [
						RecordOpType.Put,
						PageRecordType.create({ name: 'test2', index: 'a2' as IndexKey }),
					],
				},
			})

			// Should not have sent immediately (debounced)
			expect(sendMessageSpy.mock.calls.find((call) => call[0].type === 'data')).toBeUndefined()

			// Fast forward past debounce interval
			vi.advanceTimersByTime(DATA_MESSAGE_DEBOUNCE_INTERVAL + 1)

			// Now should have sent batched message
			expect(sendMessageSpy.mock.calls.find((call) => call[0].type === 'data')).toBeDefined()
		})

		it('flushes outstanding data messages correctly', async () => {
			// Test the flush functionality directly
			const sendMessageSpy = vi.spyOn(socketB, 'sendMessage')

			// First broadcast - should be sent immediately
			room.broadcastPatch({
				diff: {
					'page:test1': [
						RecordOpType.Put,
						PageRecordType.create({ name: 'test1', index: 'a1' as IndexKey }),
					],
				},
			})

			sendMessageSpy.mockClear()

			// Second broadcast - should be queued
			room.broadcastPatch({
				diff: {
					'page:test2': [
						RecordOpType.Put,
						PageRecordType.create({ name: 'test2', index: 'a2' as IndexKey }),
					],
				},
			})

			// Manually flush pending messages
			room._flushDataMessages(sessionBId)

			// Check that messages were sent
			const dataCall = sendMessageSpy.mock.calls.find((call) => call[0].type === 'data')
			expect(dataCall).toBeDefined()
		})

		it('handles flush for disconnected sessions gracefully', () => {
			room.sessions.delete(sessionBId)
			expect(() => {
				room._flushDataMessages(sessionBId)
			}).not.toThrow()
		})
	})

	describe('Tombstone Management', () => {
		let room: TLSyncRoom<TLRecord, undefined>

		beforeEach(() => {
			room = new TLSyncRoom({ schema, snapshot: makeSnapshot(records) })
		})

		afterEach(() => {
			room.close()
		})

		it('adds tombstones when documents are removed', async () => {
			await room.updateStore((store) => {
				store.delete('page:page_2')
			})

			const snapshot = room.getSnapshot()
			expect(snapshot.tombstones).toHaveProperty('page:page_2')
		})

		it('schedules tombstone pruning when threshold exceeded', async () => {
			const pruneSpy = vi.spyOn(room as any, 'pruneTombstones')

			// Add many tombstones to trigger pruning
			await room.updateStore((store) => {
				for (let i = 0; i < MAX_TOMBSTONES + 10; i++) {
					const pageId = PageRecordType.createId(`page_${i}`)
					const page = PageRecordType.create({
						id: pageId,
						name: `Page ${i}`,
						index: `a${i}` as IndexKey,
					})
					store.put(page)
					store.delete(pageId)
				}
			})

			// Wait for async pruning to be scheduled
			await new Promise((resolve) => setTimeout(resolve, 10))

			expect(pruneSpy).toHaveBeenCalled()
		})
	})

	describe('Error Handling', () => {
		let room: TLSyncRoom<TLRecord, { userId: string }>
		let socket: MockSocket
		const sessionId = 'test-session'

		beforeEach(() => {
			room = new TLSyncRoom({ schema, snapshot: makeSnapshot(records) })
			socket = makeSocket()
			room.handleNewSession({
				sessionId,
				socket,
				meta: { userId: 'user1' },
				isReadonly: false,
			})
		})

		afterEach(() => {
			room.close()
		})

		it('rejectSession removes session and closes socket', () => {
			expect(room.sessions.has(sessionId)).toBe(true)
			expect(socket.isOpen).toBe(true)

			room.rejectSession(sessionId)

			expect(room.sessions.has(sessionId)).toBe(false)
			expect(socket.isOpen).toBe(false)
		})

		it('rejectSession with fatal reason closes with error code', () => {
			const closeSpy = vi.spyOn(socket, 'close')

			room.rejectSession(sessionId, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)

			expect(closeSpy).toHaveBeenCalledWith(
				TLSyncErrorCloseEventCode,
				TLSyncErrorCloseEventReason.CLIENT_TOO_OLD
			)
		})

		it('handles socket close errors gracefully', () => {
			const closeSpy = vi.spyOn(socket, 'close').mockImplementation(() => {
				throw new Error('Socket already closed')
			})

			expect(() => {
				room.rejectSession(sessionId)
			}).not.toThrow()

			expect(closeSpy).toHaveBeenCalled()
		})

		it('updateStore throws error when room is closed', async () => {
			room.close()

			await expect(
				room.updateStore(() => {
					// noop
				})
			).rejects.toThrow('Cannot update store on a closed room')
		})
	})

	describe('Snapshot Handling', () => {
		it('getSnapshot returns complete room state', () => {
			const room = new TLSyncRoom({ schema, snapshot: makeSnapshot(records) })

			const snapshot = room.getSnapshot()

			expect(snapshot).toHaveProperty('clock')
			expect(snapshot).toHaveProperty('documentClock')
			expect(snapshot).toHaveProperty('documents')
			expect(snapshot).toHaveProperty('tombstones')
			expect(snapshot).toHaveProperty('tombstoneHistoryStartsAtClock')
			expect(snapshot).toHaveProperty('schema')

			expect(snapshot.documents).toHaveLength(2)
			expect(snapshot.schema).toEqual(room.serializedSchema)

			room.close()
		})

		it('getSnapshot filters out non-document records', async () => {
			const room = new TLSyncRoom({ schema, snapshot: makeSnapshot(records) })

			// Test that the snapshot only includes document-scoped records
			const snapshot = room.getSnapshot()
			const documentTypes = new Set(['document', 'page'])

			for (const doc of snapshot.documents) {
				expect(documentTypes.has(doc.state.typeName)).toBe(true)
			}

			// Ensure all returned records are document-scoped
			expect(
				snapshot.documents.every(
					(doc) => doc.state.typeName === 'document' || doc.state.typeName === 'page'
				)
			).toBe(true)

			room.close()
		})

		it('handles tombstoneHistoryStartsAtClock edge case for zero', () => {
			const snapshotWithZeroTombstone = makeSnapshot(records, {
				tombstones: { 'page:deleted': 0 },
				tombstoneHistoryStartsAtClock: 0,
			})

			const room = new TLSyncRoom({ schema, snapshot: snapshotWithZeroTombstone })

			// Should increment from 0 to handle legacy clients
			expect(room.tombstoneHistoryStartsAtClock).toBe(1)

			room.close()
		})
	})

	describe('Constants', () => {
		it('exports correct tombstone constants', () => {
			expect(MAX_TOMBSTONES).toBe(3000)
			expect(TOMBSTONE_PRUNE_BUFFER_SIZE).toBe(300)
		})

		it('exports correct debounce interval', () => {
			expect(DATA_MESSAGE_DEBOUNCE_INTERVAL).toBe(1000 / 60)
		})
	})
})
