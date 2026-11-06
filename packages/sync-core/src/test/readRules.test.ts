import { BaseRecord, RecordId, StoreSchema, createRecordType } from '@tldraw/store'
import { vi, type Mock } from 'vitest'
import { RecordOpType, ValueOpType } from '../lib/diff'
import { InMemorySyncStorage } from '../lib/InMemorySyncStorage'
import { TLSocketServerSentEvent, getTlsyncProtocolVersion } from '../lib/protocol'
import { RoomSnapshot, TLRoomSocket, TLSyncRoom } from '../lib/TLSyncRoom'

// `authorizeRead`: a folder is always readable; a file is readable when its folder is not secret,
// or the session is an admin.

interface FolderRecord extends BaseRecord<'folder', RecordId<FolderRecord>> {
	secret: boolean
}
interface FileRecord extends BaseRecord<'file', RecordId<FileRecord>> {
	folderId: string
	text: string
}
const Folder = createRecordType<FolderRecord>('folder', {
	scope: 'document',
	validator: { validate: (value) => value as FolderRecord },
})
const File = createRecordType<FileRecord>('file', {
	scope: 'document',
	validator: { validate: (value) => value as FileRecord },
})
type R = FolderRecord | FileRecord
const schema = StoreSchema.create<R>({ folder: Folder, file: File })

interface Meta {
	admin: boolean
}

const folder = Folder.create({ id: Folder.createId('f'), secret: false })
const file = File.create({ id: File.createId('a'), folderId: folder.id, text: 'hi' })

type MockSocket = TLRoomSocket<any> & { messages: TLSocketServerSentEvent<any>[]; close: Mock }

function makeSocket(): MockSocket {
	const socket: MockSocket = {
		messages: [],
		sendMessage: vi.fn((msg: TLSocketServerSentEvent<any>) => {
			socket.messages.push(structuredClone(msg))
		}),
		close: vi.fn(),
		isOpen: true,
	}
	return socket
}

const rooms: TLSyncRoom<R, Meta>[] = []
afterEach(() => {
	for (const room of rooms) room.close()
	rooms.length = 0
})

function makeRoom() {
	const snapshot: RoomSnapshot = {
		documents: [folder, file].map((state) => ({ state, lastChangedClock: 0 })),
		clock: 0,
		documentClock: 0,
		schema: schema.serialize(),
	}
	const room = new TLSyncRoom<R, Meta>({
		schema,
		storage: new InMemorySyncStorage<R>({ snapshot }),
		authorizeRead: {
			file: ({ session, record, get }) => {
				if (session.meta.admin) return true
				const parent = get(record.folderId) as FolderRecord | undefined
				return !!parent && !parent.secret
			},
		},
		authorizeRecord: {
			folder: ({ session, next, prev }) => (session.meta.admin ? (next ?? prev) : null),
		},
	})
	rooms.push(room)
	return room
}

function connect(room: TLSyncRoom<R, Meta>, sessionId: string, meta: Meta) {
	const socket = makeSocket()
	room.handleNewSession({ sessionId, socket, meta, isReadonly: false })
	room.handleMessage(sessionId, {
		type: 'connect',
		connectRequestId: 'c',
		lastServerClock: 0,
		protocolVersion: getTlsyncProtocolVersion(),
		schema: room.serializedSchema,
	})
	return socket
}

/** Every data message the socket got, flattened, after the connect message. */
function received(socket: MockSocket) {
	return socket.messages.flatMap((m: any) => (m.type === 'data' ? m.data : [m]))
}
function patches(socket: MockSocket) {
	return received(socket)
		.filter((m: any) => m.type === 'patch')
		.map((m: any) => m.diff)
}
function hydratedIds(socket: MockSocket) {
	const connectMsg = received(socket).find((m: any) => m.type === 'connect') as any
	return Object.keys(connectMsg.diff).sort()
}
function push(room: TLSyncRoom<R, Meta>, sessionId: string, diff: any, clientClock = 1) {
	room.handleMessage(sessionId, { type: 'push', clientClock, diff })
}
function lastPushResult(socket: MockSocket) {
	return received(socket)
		.filter((m: any) => m.type === 'push_result')
		.at(-1)
}
const flush = () => new Promise((r) => setTimeout(r, 50))

describe('authorizeRead', () => {
	it('leaves unreadable records out of the hydration', () => {
		const room = makeRoom()
		push(room, connectAdmin(room), {
			[folder.id]: [RecordOpType.Patch, { secret: [ValueOpType.Put, true] }],
		})
		const user = connect(room, 'user', { admin: false })
		expect(hydratedIds(user)).toEqual([folder.id])
	})

	it('follows a record that the rule reads, when only that record changes', async () => {
		const room = makeRoom()
		const admin = connectAdmin(room)
		const user = connect(room, 'user', { admin: false })
		expect(hydratedIds(user)).toEqual([file.id, folder.id].sort())

		// the folder stays readable, but the file in it does not
		push(room, admin, { [folder.id]: [RecordOpType.Patch, { secret: [ValueOpType.Put, true] }] })
		await flush()
		expect(patches(user).at(-1)).toEqual({
			[folder.id]: [RecordOpType.Patch, { secret: [ValueOpType.Put, true] }],
			[file.id]: [RecordOpType.Remove],
		})

		// and comes back in full when the folder opens again
		push(
			room,
			admin,
			{ [folder.id]: [RecordOpType.Patch, { secret: [ValueOpType.Put, false] }] },
			2
		)
		await flush()
		expect(patches(user).at(-1)).toEqual({
			[folder.id]: [RecordOpType.Patch, { secret: [ValueOpType.Put, false] }],
			[file.id]: [RecordOpType.Put, file],
		})
	})

	it('sends dependents to the session that made the change', async () => {
		const room = makeRoom()
		// a non-admin who may write folders here: it hides the file from itself
		;(room as any).authorizeRecord = undefined
		const user = connect(room, 'user', { admin: false })
		push(room, 'user', { [folder.id]: [RecordOpType.Patch, { secret: [ValueOpType.Put, true] }] })
		await flush()
		expect(lastPushResult(user)).toMatchObject({ action: 'commit' })
		expect(patches(user).at(-1)).toEqual({ [file.id]: [RecordOpType.Remove] })
	})

	it('rejects writes to records that the session may not read, before or after', () => {
		const room = makeRoom()
		push(room, connectAdmin(room), {
			[folder.id]: [RecordOpType.Patch, { secret: [ValueOpType.Put, true] }],
		})
		const user = connect(room, 'user', { admin: false })

		push(room, 'user', { [file.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, 'x'] }] })
		expect(lastPushResult(user)).toMatchObject({ action: 'discard' })
		// a new file in the secret folder
		const hidden = File.create({ folderId: folder.id, text: 'new' })
		push(room, 'user', { [hidden.id]: [RecordOpType.Put, hidden] }, 2)
		expect(lastPushResult(user)).toMatchObject({ action: 'discard' })
		expect(stored(room, hidden.id)).toBeUndefined()
	})

	it('rejects a whole push when one of its writes is denied', () => {
		const room = makeRoom()
		const user = connect(room, 'user', { admin: false })
		const mine = File.create({ folderId: folder.id, text: 'mine' })
		push(room, 'user', {
			[mine.id]: [RecordOpType.Put, mine],
			[folder.id]: [RecordOpType.Patch, { secret: [ValueOpType.Put, true] }],
		})
		expect(lastPushResult(user)).toMatchObject({ action: 'discard' })
		expect(stored(room, mine.id)).toBeUndefined()
	})

	it('drops the read dependencies of deleted records', async () => {
		const room = makeRoom()
		const admin = connectAdmin(room)
		connect(room, 'user', { admin: false })
		expect((room as any).readDependencies.has(file.id)).toBe(true)
		push(room, admin, { [file.id]: [RecordOpType.Remove] })
		await flush()
		expect((room as any).readDependencies.has(file.id)).toBe(false)
		expect((room as any).readDependents.get(folder.id)?.has(file.id) ?? false).toBe(false)
	})
})

function connectAdmin(room: TLSyncRoom<R, Meta>) {
	connect(room, 'admin', { admin: true })
	return 'admin'
}

function stored(room: TLSyncRoom<R, Meta>, id: string) {
	return (room as any).storage.getSnapshot().documents.find((d: any) => d.state.id === id)
}
