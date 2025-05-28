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
import {
	MAX_TOMBSTONES,
	RoomSnapshot,
	TLRoomSocket,
	TLSyncRoom,
	TOMBSTONE_PRUNE_BUFFER_SIZE,
} from '../lib/TLSyncRoom'
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
		sendMessage: jest.fn((msg) => {
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
		}).toThrowErrorMatchingInlineSnapshot(`"StoreUpdateContext is closed"`)
		expect(() => {
			store!.delete('page:page_2')
		}).toThrowErrorMatchingInlineSnapshot(`"StoreUpdateContext is closed"`)
		expect(() => {
			store!.getAll()
		}).toThrowErrorMatchingInlineSnapshot(`"StoreUpdateContext is closed"`)
		expect(() => {
			store!.get('page:page_2')
		}).toThrowErrorMatchingInlineSnapshot(`"StoreUpdateContext is closed"`)
	})

	test('it fails if the room is closed', () => {
		room.close()
		expect(
			room.updateStore(() => {
				// noop
			})
		).rejects.toMatchInlineSnapshot(`[Error: Cannot update store on a closed room]`)
	})

	test('it fails if you try to add bad data', () => {
		expect(
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

		expect(room.state.get().documents['page:page_3']?.state).toBe(undefined)
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

		expect(room.state.get().documents['page:page_3']?.state).not.toBe(undefined)

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
})
