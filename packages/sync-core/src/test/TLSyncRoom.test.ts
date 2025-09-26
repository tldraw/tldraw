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

	test('it allows updating records and broadcasts to clients', async () => {
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
		expect(socketA.__lastMessage?.type).toBe('data')
		expect(socketB.__lastMessage?.type).toBe('data')
	})

	test('it does not update unless you call .put', async () => {
		const documentClock = room.documentClock
		await room.updateStore((store) => {
			const document = store.get('document:document') as TLDocument
			document.name = 'My lovely document'
		})
		expect(
			(room.getSnapshot().documents.find((r) => r.state.id === 'document:document')?.state as any)
				.name
		).toBe('')
		expect(documentClock).toBe(room.documentClock)
	})

	test('it detects no-ops and does not broadcast', async () => {
		const documentClock = room.documentClock
		await room.updateStore((store) => {
			const newPage = PageRecordType.create({ name: 'page 3', index: 'a0' as IndexKey })
			store.put(newPage)
			store.delete(newPage.id)
		})

		expect(room.documentClock).toBe(documentClock)
		expect(socketA.__lastMessage).toBeNull()
		expect(socketB.__lastMessage).toBeNull()
	})

	test('transaction isolation prevents cross-contamination', async () => {
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

	test('it fails with validation errors for invalid data', async () => {
		await expect(
			room.updateStore((store) => {
				const page = store.get('page:page_2') as TLPage
				page.index = 34 as any
				store.put(page)
			})
		).rejects.toMatchInlineSnapshot(`[Error: failed to apply changes: INVALID_RECORD]`)
	})

	test('it fails if the room is closed', async () => {
		room.close()
		await expect(
			room.updateStore(() => {
				// noop
			})
		).rejects.toMatchInlineSnapshot(`[Error: Cannot update store on a closed room]`)
	})
})

describe('readonly sessions', () => {
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

	it('blocks document updates from readonly sessions', async () => {
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

		// sessionA is readonly - should be rejected
		room.handleMessage(sessionAId, push)
		expect(room.documents.get('page:page_3')?.state).toBe(undefined)
		expect(
			socketA.__lastMessage?.type === 'data' &&
				socketA.__lastMessage.data[0]?.type === 'push_result'
				? socketA.__lastMessage.data[0].action
				: undefined
		).toBe('discard')
		expect(socketB.__lastMessage).toBe(null)

		// sessionB is not readonly - should succeed
		room.handleMessage(sessionBId, push)
		expect(room.documents.get('page:page_3')?.state).not.toBe(undefined)
		expect(
			socketB.__lastMessage?.type === 'data' &&
				socketB.__lastMessage.data[0]?.type === 'push_result'
				? socketB.__lastMessage.data[0].action
				: undefined
		).toBe('commit')
	})

	it('allows presence updates from readonly sessions', async () => {
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

		// sessionA is readonly but should allow presence
		room.handleMessage(sessionAId, presencePush)
		expect(
			socketA.__lastMessage?.type === 'data' &&
				socketA.__lastMessage.data[0]?.type === 'push_result'
				? socketA.__lastMessage.data[0].action
				: undefined
		).toBe('commit')
		expect(socketB.__lastMessage?.type).toBe('data')
	})
})

describe('backward compatibility', () => {
	it('loads snapshot without documentClock field', () => {
		const legacySnapshot = makeLegacySnapshot(records)

		const room = new TLSyncRoom<TLRecord, undefined>({
			schema,
			snapshot: legacySnapshot,
		})

		expect(room.getSnapshot().documents.length).toBe(2)
		expect(room.getSnapshot().documentClock).toBe(0)
	})

	it('calculates documentClock from max lastChangedClock', () => {
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

		expect(room.getSnapshot().documentClock).toBe(10)
	})

	it('preserves explicit documentClock when present', () => {
		const snapshotWithDocumentClock = makeSnapshot(records, {
			documentClock: 15,
		})

		const room = new TLSyncRoom<TLRecord, undefined>({
			schema,
			snapshot: snapshotWithDocumentClock,
		})

		expect(room.getSnapshot().documentClock).toBe(15)
	})
})
