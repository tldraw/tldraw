import { BaseRecord, RecordId, StoreSchema, createRecordType } from '@tldraw/store'
import { vi, type Mock } from 'vitest'
import { RecordOpType, ValueOpType } from '../lib/diff'
import { InMemorySyncStorage } from '../lib/InMemorySyncStorage'
import { TLSocketServerSentEvent, getTlsyncProtocolVersion } from '../lib/protocol'
import { RoomSnapshot, TLRoomSocket, TLSyncRoom } from '../lib/TLSyncRoom'

interface FolderRecord extends BaseRecord<'folder', RecordId<FolderRecord>> {
	secret: boolean
}
interface FileRecord extends BaseRecord<'file', RecordId<FileRecord>> {
	folderId: string
	text: string
}
interface PresenceRecord extends BaseRecord<'presence', RecordId<PresenceRecord>> {
	name: string
}
const Folder = createRecordType<FolderRecord>('folder', {
	scope: 'document',
	validator: { validate: (value) => value as FolderRecord },
})
const File = createRecordType<FileRecord>('file', {
	scope: 'document',
	validator: { validate: (value) => value as FileRecord },
})
const Presence = createRecordType<PresenceRecord>('presence', {
	scope: 'presence',
	validator: { validate: (value) => value as PresenceRecord },
})
type R = FolderRecord | FileRecord | PresenceRecord
const schema = StoreSchema.create<R>({ folder: Folder, file: File, presence: Presence })

interface Meta {
	admin: boolean
	userId?: string
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

function makeRoom(
	opts: { storage?: InMemorySyncStorage<R>; authorizeRead?: any; authorizeRecord?: any } = {}
) {
	const snapshot: RoomSnapshot = {
		documents: [folder, file].map((state) => ({ state, lastChangedClock: 0 })),
		clock: 0,
		documentClock: 0,
		schema: schema.serialize(),
	}
	const room = new TLSyncRoom<R, Meta>({
		schema,
		storage: opts.storage ?? new InMemorySyncStorage<R>({ snapshot }),
		authorizeRead: opts.authorizeRead ?? {
			file: ({ session, record, get }: any) => {
				if (session.meta.admin) return true
				const parent = get(record.folderId) as FolderRecord | undefined
				return !!parent && !parent.secret
			},
		},
		authorizeRecord: opts.authorizeRecord ?? {
			folder: ({ session, next, prev }: any) => (session.meta.admin ? (next ?? prev) : null),
		},
	})
	rooms.push(room)
	return room
}
function snap(): RoomSnapshot {
	return {
		documents: [folder, file].map((state) => ({ state, lastChangedClock: 0 })),
		clock: 0,
		documentClock: 0,
		schema: schema.serialize(),
	}
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
function received(socket: MockSocket) {
	return socket.messages.flatMap((m: any) => (m.type === 'data' ? m.data : [m]))
}
function patches(socket: MockSocket) {
	return received(socket)
		.filter((m: any) => m.type === 'patch')
		.map((m: any) => m.diff)
}
function push(room: TLSyncRoom<R, Meta>, sessionId: string, msg: any, clientClock = 1) {
	room.handleMessage(sessionId, { type: 'push', clientClock, ...msg })
}
const flush = () => new Promise((r) => setTimeout(r, 50))

describe('read rules: edge cases', () => {
	it('applies the presence of a rejected push, and broadcasts it', async () => {
		const room = makeRoom()
		const admin = connect(room, 'admin', { admin: true })
		connect(room, 'user', { admin: false })
		await flush()
		admin.messages.length = 0
		const presenceId = (room as any).sessions.get('user').presenceId
		push(room, 'user', {
			presence: [RecordOpType.Put, { id: presenceId, typeName: 'presence', name: 'bob' }],
			// denied: only admins may write folders
			diff: { [folder.id]: [RecordOpType.Patch, { secret: [ValueOpType.Put, true] }] },
		})
		await flush()
		const sawPresence = patches(admin).some((p: any) => p[presenceId])
		expect(room.presenceStore.get(presenceId)).toMatchObject({ name: 'bob' })
		expect(sawPresence).toBe(true)
	})

	it('applies a presence append once when the push is rejected', async () => {
		const room = makeRoom()
		connect(room, 'user', { admin: false })
		const presenceId = (room as any).sessions.get('user').presenceId
		push(room, 'user', {
			presence: [RecordOpType.Put, { id: presenceId, typeName: 'presence', name: 'ab' }],
		})
		push(
			room,
			'user',
			{
				presence: [RecordOpType.Patch, { name: [ValueOpType.Append, 'c', 2] }],
				diff: { [folder.id]: [RecordOpType.Patch, { secret: [ValueOpType.Put, true] }] },
			},
			2
		)
		expect(room.presenceStore.get(presenceId)).toMatchObject({ name: 'abc' })
	})

	it('removes a record that a change made straight to storage hides', async () => {
		const storage = new InMemorySyncStorage<R>({ snapshot: snap() })
		const room = makeRoom({
			storage,
			authorizeRead: { file: ({ record }: any) => record.text !== 'private' },
		})
		const user = connect(room, 'user', { admin: false })
		storage.transaction((txn) => {
			txn.set(file.id, { ...file, text: 'private' })
		})
		await flush()
		// expected: the file is removed for the user
		expect(patches(user).at(-1)).toEqual({ [file.id]: [RecordOpType.Remove] })
	})

	it('does not nest storage transactions when a wipe closes every session', async () => {
		class NoNest extends InMemorySyncStorage<R> {
			depth = 0
			override transaction(cb: any, opts?: any): any {
				if (this.depth > 0) throw new Error('cannot start a transaction within a transaction')
				this.depth++
				try {
					return super.transaction(cb, opts)
				} finally {
					this.depth--
				}
			}
		}
		const storage = new NoNest({ snapshot: snap() })
		const room = makeRoom({ storage })
		const a = connect(room, 'a', { admin: true })
		const b = connect(room, 'b', { admin: true })
		for (const s of ['a', 'b']) {
			const presenceId = (room as any).sessions.get(s).presenceId
			push(room, s, {
				presence: [RecordOpType.Put, { id: presenceId, typeName: 'presence', name: s }],
			})
		}
		// force broadcastChanges to see wipeAll (as after loadSnapshot / tombstone pruning)
		;(room as any).lastDocumentClock = -5
		storage.tombstoneHistoryStartsAtClock.set(1)
		let err: unknown
		try {
			// the room reads storage changes inside its own transaction
			;(room as any).transact((txn: any) => (room as any).broadcastChanges(txn))
		} catch (e) {
			err = e
		}
		expect(err).toBeUndefined()
		expect(a.close).toHaveBeenCalled()
		expect(b.close).toHaveBeenCalled()
	})

	it('rechecks records that the author created, when their parent hides them later', async () => {
		const room = makeRoom()
		const admin = connect(room, 'admin', { admin: true })
		const user = connect(room, 'user', { admin: false })
		const mine = File.create({ folderId: folder.id, text: 'mine' })
		push(room, 'user', { diff: { [mine.id]: [RecordOpType.Put, mine] } })
		await flush()
		push(room, 'admin', {
			diff: { [folder.id]: [RecordOpType.Patch, { secret: [ValueOpType.Put, true] }] },
		})
		await flush()
		const last = patches(user).at(-1)
		expect(last).toEqual({
			[folder.id]: [RecordOpType.Patch, { secret: [ValueOpType.Put, true] }],
			[file.id]: [RecordOpType.Remove],
			[mine.id]: [RecordOpType.Remove],
		})
		void admin
	})

	it('does not keep read dependencies of people who left', async () => {
		const room = makeRoom({
			authorizeRead: {
				file: ({ session, get }: any) => !get(`folder:perm-${session.meta.userId}`),
			},
		})
		// one long session, and 50 people who come and go
		connect(room, 'stay', { admin: false, userId: 'stay' })
		for (let i = 0; i < 50; i++) {
			connect(room, 's' + i, { admin: false, userId: 'u' + i })
			;(room as any).removeSession('s' + i)
		}
		expect((room as any).readDependents.size).toBe(51)
		// a change to the file replaces its edges with the ones of the sessions connected now
		push(room, 'stay', {
			diff: { [file.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, 'x'] }] },
		})
		expect((room as any).readDependents.size).toBe(1)
		// and when the last session leaves, nothing is kept
		;(room as any).removeSession('stay')
		expect((room as any).readDependents.size).toBe(0)
	})
})
describe('read rules: storage changes', () => {
	it('follows changes made straight to storage both ways', async () => {
		const storage = new InMemorySyncStorage<R>({ snapshot: snap() })
		const room = makeRoom({
			storage,
			authorizeRead: { file: ({ record }: any) => record.text !== 'private' },
		})
		const user = connect(room, 'user', { admin: false })
		storage.transaction((txn) => {
			txn.set(file.id, { ...file, text: 'public2' })
		})
		await flush()
		expect(patches(user).at(-1)).toEqual({
			[file.id]: [RecordOpType.Put, { ...file, text: 'public2' }],
		})
		storage.transaction((txn) => {
			txn.set(file.id, { ...file, text: 'private' })
		})
		await flush()
		storage.transaction((txn) => {
			txn.set(file.id, { ...file, text: 'public3' })
		})
		await flush()
		expect(patches(user).slice(1)).toEqual([
			{ [file.id]: [RecordOpType.Remove] },
			{ [file.id]: [RecordOpType.Put, { ...file, text: 'public3' }] },
		])
	})
})
describe('read rules: presence', () => {
	it('never sends a session its own presence', async () => {
		const room = makeRoom({
			authorizeRead: {
				presence: ({ get }: any) => !(get(folder.id) as FolderRecord).secret,
			},
		})
		connect(room, 'admin', { admin: true })
		const user = connect(room, 'user', { admin: false })
		const presenceId = (room as any).sessions.get('user').presenceId
		push(room, 'user', {
			presence: [RecordOpType.Put, { id: presenceId, typeName: 'presence', name: 'u' }],
		})
		// admin's presence too so the edge exists via user's evaluation
		const adminPresence = (room as any).sessions.get('admin').presenceId
		push(room, 'admin', {
			presence: [RecordOpType.Put, { id: adminPresence, typeName: 'presence', name: 'a' }],
		})
		await flush()
		push(
			room,
			'admin',
			{ diff: { [folder.id]: [RecordOpType.Patch, { secret: [ValueOpType.Put, true] }] } },
			2
		)
		await flush()
		push(
			room,
			'admin',
			{ diff: { [folder.id]: [RecordOpType.Patch, { secret: [ValueOpType.Put, false] }] } },
			3
		)
		await flush()
		const own = patches(user).filter((p: any) => p[presenceId])
		expect(own).toEqual([])
	})
})
