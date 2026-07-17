import { BaseRecord, RecordId, StoreSchema, createRecordType } from '@tldraw/store'
import { vi, type Mock } from 'vitest'
import { RecordOpType, ValueOpType } from '../lib/diff'
import { InMemorySyncStorage } from '../lib/InMemorySyncStorage'
import {
	TLConnectRequest,
	TLPushRequest,
	TLSocketServerSentEvent,
	getTlsyncProtocolVersion,
} from '../lib/protocol'
import { TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason } from '../lib/TLSyncClient'
import { RoomSnapshot, TLRoomSocket, TLSyncRoom } from '../lib/TLSyncRoom'

// A generic object-lane test schema: `doc` records live in the document lane, `note` records are
// served through the object-store lane (see `objectTypes` below). Deliberately not comment-shaped —
// the lane is a generic primitive.

interface DocRecord extends BaseRecord<'doc', RecordId<DocRecord>> {
	title: string
}
interface NoteRecord extends BaseRecord<'note', RecordId<NoteRecord>> {
	text: string
}
interface PresenceRecord extends BaseRecord<'presence', RecordId<PresenceRecord>> {
	name: string
}

const Doc = createRecordType<DocRecord>('doc', {
	scope: 'document',
	validator: { validate: (value) => value as DocRecord },
})
const Note = createRecordType<NoteRecord>('note', {
	scope: 'document',
	validator: { validate: (value) => value as NoteRecord },
})
const Presence = createRecordType<PresenceRecord>('presence', {
	scope: 'presence',
	validator: { validate: (value) => value as PresenceRecord },
})

type R = DocRecord | NoteRecord | PresenceRecord

const schema = StoreSchema.create<R>({ doc: Doc, note: Note, presence: Presence })

type MockSocket = TLRoomSocket<any> & {
	__messages: TLSocketServerSentEvent<any>[]
	sendMessage: Mock
	close: Mock
}

function makeSocket(): MockSocket {
	const socket: MockSocket = {
		__messages: [],
		// cloning because the room reuses/clears message objects after sending
		sendMessage: vi.fn((msg: TLSocketServerSentEvent<any>) => {
			socket.__messages.push(structuredClone(msg))
		}),
		close: vi.fn(() => {
			socket.isOpen = false
		}),
		isOpen: true,
	}
	return socket
}

function sentDataMessages(socket: MockSocket): any[] {
	return socket.__messages.flatMap((msg: any) => (msg.type === 'data' ? msg.data : []))
}

function clearSocket(socket: MockSocket) {
	socket.sendMessage.mockClear()
	socket.__messages.length = 0
}

const disposables: Array<() => void> = []
afterEach(() => {
	for (const dispose of disposables) dispose()
	disposables.length = 0
})

function makeRoom(
	opts: {
		snapshot?: RoomSnapshot
		objectTypes?: readonly string[]
		onCommittedChanges?(args: { diff: any; documentClock: number }): void
		authorizeRecord?: {
			[typeName: string]: (args: {
				session: { sessionId: string; meta: any }
				type: 'create' | 'update' | 'delete'
				prev: any
				next: any
			}) => any
		}
		log?: any
	} = {}
) {
	const storage = new InMemorySyncStorage<R>({
		snapshot: opts.snapshot ?? {
			documents: [],
			clock: 0,
			documentClock: 0,
			schema: schema.serialize(),
		},
		// keep the storage partition in step with the room's object lane
		objectTypes: opts.objectTypes,
	})
	const room = new TLSyncRoom<R, undefined>({
		schema,
		storage,
		objectTypes: opts.objectTypes,
		onCommittedChanges: opts.onCommittedChanges,
		authorizeRecord: opts.authorizeRecord,
		log: opts.log,
	})
	disposables.push(() => room.close())
	return { storage, room }
}

function connectSession(
	room: TLSyncRoom<any, any>,
	sessionId: string,
	opts: {
		isReadonly?: boolean
		objectAccess?: 'read' | 'write'
		clear?: boolean
		meta?: any
	} = {}
): MockSocket {
	const socket = makeSocket()
	room.handleNewSession({
		sessionId,
		socket,
		meta: opts.meta,
		isReadonly: opts.isReadonly ?? false,
		objectAccess: opts.objectAccess,
	})
	room.handleMessage(sessionId, {
		type: 'connect',
		connectRequestId: 'connect-' + sessionId,
		lastServerClock: 0,
		protocolVersion: getTlsyncProtocolVersion(),
		schema: room.serializedSchema,
	} satisfies TLConnectRequest)
	if (opts.clear !== false) {
		clearSocket(socket)
	}
	return socket
}

function push(
	room: TLSyncRoom<any, any>,
	sessionId: string,
	diff: TLPushRequest<any>['diff'],
	clientClock = 1
) {
	room.handleMessage(sessionId, { type: 'push', clientClock, diff } satisfies TLPushRequest<any>)
}

function lastPushResult(socket: MockSocket) {
	return sentDataMessages(socket)
		.filter((m) => m.type === 'push_result')
		.at(-1)
}

function storedIds(storage: InMemorySyncStorage<R>) {
	// span both partitions: the document snapshot no longer contains object-lane records
	return [...storage.getSnapshot().documents, ...storage.getObjectsSnapshot()]
		.map((d) => d.state.id)
		.sort()
}

describe('object store lane', () => {
	describe('type partition', () => {
		it('excludes object types from documentTypes and exposes them via objectTypes', () => {
			const { room } = makeRoom({ objectTypes: ['note'] })
			expect(room.documentTypes.has('doc')).toBe(true)
			expect(room.documentTypes.has('note')).toBe(false)
			expect(room.objectTypes.has('note')).toBe(true)
		})

		it('keeps documentTypes intact when no objectTypes are configured', () => {
			const { room } = makeRoom()
			expect(room.documentTypes.has('doc')).toBe(true)
			expect(room.documentTypes.has('note')).toBe(true)
			expect(room.objectTypes.size).toBe(0)
		})

		it('rejects object types that are not registered in the schema', () => {
			expect(() => makeRoom({ objectTypes: ['nonexistent'] })).toThrow(
				"object type 'nonexistent' is not registered"
			)
		})

		it('rejects object types that are not document-scoped', () => {
			expect(() => makeRoom({ objectTypes: ['presence'] })).toThrow(
				"object type 'presence' must have scope 'document'"
			)
		})
	})

	describe('object writes', () => {
		it('commits object puts, broadcasts them, and hydrates them on connect', () => {
			const { room, storage } = makeRoom({ objectTypes: ['note'] })
			const writer = connectSession(room, 'writer')
			const observer = connectSession(room, 'observer')

			const note = Note.create({ text: 'hello' })
			push(room, 'writer', { [note.id]: [RecordOpType.Put, note] })

			expect(lastPushResult(writer)).toMatchObject({ action: 'commit' })
			expect(storedIds(storage)).toEqual([note.id])

			// broadcast to the other session
			room._flushDataMessages('observer')
			expect(
				sentDataMessages(observer).find(
					(m) => m.type === 'patch' && m.diff[note.id]?.[0] === RecordOpType.Put
				)
			).toBeDefined()

			// a fresh connect hydrates the object record
			const late = connectSession(room, 'late', { clear: false })
			const connectMsg = late.__messages.find((m: any) => m.type === 'connect') as any
			expect(connectMsg.diff[note.id]).toEqual([RecordOpType.Put, note])
		})

		it('still rejects unknown record types for writable sessions', () => {
			const { room } = makeRoom({ objectTypes: ['note'] })
			const socket = connectSession(room, 'writer')

			push(room, 'writer', {
				'mystery:1': [RecordOpType.Put, { id: 'mystery:1', typeName: 'mystery' } as any],
			})

			expect(socket.close).toHaveBeenCalledWith(
				TLSyncErrorCloseEventCode,
				TLSyncErrorCloseEventReason.INVALID_RECORD
			)
		})

		it('skips unknown record types for denied sessions without rejecting (legacy readonly behavior)', () => {
			const { room, storage } = makeRoom({ objectTypes: ['note'] })
			const socket = connectSession(room, 'reader', { isReadonly: true })

			push(room, 'reader', {
				'mystery:1': [RecordOpType.Put, { id: 'mystery:1', typeName: 'mystery' } as any],
			})

			expect(socket.close).not.toHaveBeenCalled()
			expect(lastPushResult(socket)).toMatchObject({ action: 'discard' })
			expect(storedIds(storage)).toEqual([])
		})
	})

	describe('permission axes', () => {
		it('lets a readonly session with object write access write objects but not documents', () => {
			const { room, storage } = makeRoom({ objectTypes: ['note'] })
			// "can comment but not edit"
			const socket = connectSession(room, 'commenter', {
				isReadonly: true,
				objectAccess: 'write',
			})

			const doc = Doc.create({ title: 'nope' })
			const note = Note.create({ text: 'yep' })
			push(room, 'commenter', {
				[doc.id]: [RecordOpType.Put, doc],
				[note.id]: [RecordOpType.Put, note],
			})

			// only the object op survives, so the client is rebased onto it
			expect(lastPushResult(socket)).toMatchObject({
				action: { rebaseWithDiff: { [note.id]: [RecordOpType.Put, note] } },
			})
			expect(storedIds(storage)).toEqual([note.id])
		})

		it('blocks object writes for objectAccess: read while document writes still commit', () => {
			const { room, storage } = makeRoom({ objectTypes: ['note'] })
			const socket = connectSession(room, 'editor', { objectAccess: 'read' })

			const doc = Doc.create({ title: 'yep' })
			const note = Note.create({ text: 'nope' })
			push(room, 'editor', {
				[doc.id]: [RecordOpType.Put, doc],
				[note.id]: [RecordOpType.Put, note],
			})

			expect(lastPushResult(socket)).toMatchObject({
				action: { rebaseWithDiff: { [doc.id]: [RecordOpType.Put, doc] } },
			})
			expect(storedIds(storage)).toEqual([doc.id])
		})

		it('discards object-only pushes entirely for objectAccess: read', () => {
			const { room, storage } = makeRoom({ objectTypes: ['note'] })
			const socket = connectSession(room, 'reader', { objectAccess: 'read' })

			const note = Note.create({ text: 'nope' })
			push(room, 'reader', { [note.id]: [RecordOpType.Put, note] })

			expect(lastPushResult(socket)).toMatchObject({ action: 'discard' })
			expect(storedIds(storage)).toEqual([])
		})

		it('gates object patches and removes by objectAccess', () => {
			const note = Note.create({ text: 'original' })
			const { room, storage } = makeRoom({
				objectTypes: ['note'],
				snapshot: {
					documents: [{ state: note, lastChangedClock: 0 }],
					clock: 0,
					documentClock: 0,
					schema: schema.serialize(),
				},
			})
			const reader = connectSession(room, 'reader', { objectAccess: 'read' })

			push(room, 'reader', {
				[note.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, 'tampered'] }],
			})
			expect(lastPushResult(reader)).toMatchObject({ action: 'discard' })

			push(room, 'reader', { [note.id]: [RecordOpType.Remove] }, 2)
			expect(lastPushResult(reader)).toMatchObject({ action: 'discard' })
			expect(storedIds(storage)).toEqual([note.id])

			// a readonly-but-object-writable session can remove the object record
			connectSession(room, 'commenter', { isReadonly: true, objectAccess: 'write' })
			push(room, 'commenter', { [note.id]: [RecordOpType.Remove] })
			expect(storedIds(storage)).toEqual([])
		})
	})

	describe('storage partition', () => {
		it('keeps object records out of the document snapshot but in the objects snapshot', () => {
			const { room, storage } = makeRoom({ objectTypes: ['note'] })
			connectSession(room, 'writer')

			const doc = Doc.create({ title: 'canvas' })
			const note = Note.create({ text: 'annotation' })
			push(room, 'writer', {
				[doc.id]: [RecordOpType.Put, doc],
				[note.id]: [RecordOpType.Put, note],
			})

			// the document snapshot is pure-document by construction
			expect(storage.getSnapshot().documents.map((d) => d.state.id)).toEqual([doc.id])
			// the object lane is persisted separately
			expect(storage.getObjectsSnapshot().map((d) => d.state.id)).toEqual([note.id])

			// but a fresh connect still hydrates both (shared clock + change feed)
			const late = connectSession(room, 'late', { clear: false })
			const connectMsg = late.__messages.find((m: any) => m.type === 'connect') as any
			expect(Object.keys(connectMsg.diff).sort()).toEqual([doc.id, note.id].sort())
		})
	})

	describe('connect message', () => {
		it('carries the session objectAccess', () => {
			const { room } = makeRoom({ objectTypes: ['note'] })

			const writer = connectSession(room, 'writer', { clear: false })
			const writerConnect = writer.__messages.find((m: any) => m.type === 'connect') as any
			expect(writerConnect.objectAccess).toBe('write')

			const reader = connectSession(room, 'reader', { objectAccess: 'read', clear: false })
			const readerConnect = reader.__messages.find((m: any) => m.type === 'connect') as any
			expect(readerConnect.objectAccess).toBe('read')
		})
	})

	describe('onCommittedChanges projection hook', () => {
		it('fires with the committed object diff', async () => {
			const onCommittedChanges = vi.fn()
			const { room } = makeRoom({ objectTypes: ['note'], onCommittedChanges })
			connectSession(room, 'writer')

			const note = Note.create({ text: 'hello' })
			push(room, 'writer', { [note.id]: [RecordOpType.Put, note] })
			await Promise.resolve() // the hook fires on a microtask

			expect(onCommittedChanges).toHaveBeenCalledTimes(1)
			expect(onCommittedChanges.mock.calls[0][0].diff.puts[note.id]).toEqual(note)
		})

		it('does not fire when every op in the push was denied', async () => {
			const onCommittedChanges = vi.fn()
			const { room } = makeRoom({ objectTypes: ['note'], onCommittedChanges })
			connectSession(room, 'reader', { objectAccess: 'read' })

			const note = Note.create({ text: 'nope' })
			push(room, 'reader', { [note.id]: [RecordOpType.Put, note] })
			await Promise.resolve()

			expect(onCommittedChanges).not.toHaveBeenCalled()
		})
	})

	describe('authorizeRecord', () => {
		it('rejects a presence typeName key at construction', () => {
			expect(() => makeRoom({ authorizeRecord: { presence: ({ next }: any) => next } })).toThrow(
				/presence/
			)
		})

		// A per-type authorizer like dotcom's: stamp the note's text from the session's user id on
		// create, keep it immutable on update, allow deletes.
		const authorizeNote = ({ session, type, prev, next }: any) => {
			if (type === 'create') {
				const userId = session.meta?.userId
				if (!userId) return null
				return { ...next, text: `by:${userId}` }
			}
			if (type === 'update') return next.text === prev.text ? next : null
			return prev // delete allowed
		}

		function withNote(authorize: any, extra: any = {}) {
			return makeRoom({ objectTypes: ['note'], authorizeRecord: { note: authorize }, ...extra })
		}

		function seededWithNote(authorize: any) {
			const note = Note.create({ text: 'by:user-alice' })
			const { room, storage } = withNote(authorize, {
				snapshot: {
					documents: [{ state: note, lastChangedClock: 0 }],
					clock: 0,
					documentClock: 0,
					schema: schema.serialize(),
				},
			})
			return { room, storage, note }
		}

		const storedNote = (storage: InMemorySyncStorage<R>, id: string) =>
			storage.getObjectsSnapshot().find((d) => d.state.id === id)?.state as any

		it('stamps a created record from the session, overriding the client value', () => {
			const { room, storage } = withNote(authorizeNote)
			const socket = connectSession(room, 'alice', { meta: { userId: 'user-alice' } })

			const note = Note.create({ text: 'forged' })
			push(room, 'alice', { [note.id]: [RecordOpType.Put, note] })

			// the server rewrote the record, so it rebases the client onto the stamped value
			expect(lastPushResult(socket)).toMatchObject({
				action: {
					rebaseWithDiff: { [note.id]: [RecordOpType.Put, { ...note, text: 'by:user-alice' }] },
				},
			})
			expect(storedNote(storage, note.id)?.text).toBe('by:user-alice')
		})

		it('rejects a create the authorizer denies (returns null)', () => {
			const { room, storage } = withNote(authorizeNote)
			const socket = connectSession(room, 'anon', { meta: { userId: null } })

			const note = Note.create({ text: 'nope' })
			push(room, 'anon', { [note.id]: [RecordOpType.Put, note] })

			expect(socket.close).not.toHaveBeenCalled()
			expect(lastPushResult(socket)).toMatchObject({ action: 'discard' })
			expect(storedIds(storage)).toEqual([])
		})

		it('only runs for registered types — other records write through untouched', () => {
			const seen: string[] = []
			const { room, storage } = withNote(({ next }: any) => {
				seen.push('note')
				return next
			})
			connectSession(room, 'writer', { meta: { userId: 'u' } })

			const doc = Doc.create({ title: 'hi' })
			push(room, 'writer', { [doc.id]: [RecordOpType.Put, doc] })

			expect(seen).toEqual([])
			expect(storedIds(storage)).toEqual([doc.id])
		})

		it('authorizes document-lane record types', () => {
			// authorize `doc`, a document-lane record
			const { room, storage } = makeRoom({
				objectTypes: ['note'],
				authorizeRecord: {
					doc: ({ type, next }: any) => (type === 'create' ? { ...next, title: 'stamped' } : next),
				},
			})
			connectSession(room, 'writer', { meta: { userId: 'u' } })

			const doc = Doc.create({ title: 'client' })
			push(room, 'writer', { [doc.id]: [RecordOpType.Put, doc] })

			const stored = storage.getSnapshot().documents.find((d) => d.state.id === doc.id)
				?.state as any
			expect(stored?.title).toBe('stamped')
		})

		it('vetoes an update that changes an immutable field (patch)', () => {
			const { room, storage, note } = seededWithNote(authorizeNote)
			const socket = connectSession(room, 'mallory', { meta: { userId: 'user-mallory' } })

			push(room, 'mallory', {
				[note.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, 'tampered'] }],
			})

			expect(lastPushResult(socket)).toMatchObject({ action: 'discard' })
			expect(storedNote(storage, note.id)?.text).toBe('by:user-alice')
		})

		it('allows an update the authorizer permits (patch)', () => {
			const { room, storage, note } = seededWithNote(({ type, prev, next }: any) =>
				type === 'delete' ? prev : next
			)
			connectSession(room, 'alice', { meta: { userId: 'u' } })

			push(room, 'alice', {
				[note.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, 'edited'] }],
			})

			expect(storedNote(storage, note.id)?.text).toBe('edited')
		})

		it('does not consult the authorizer for a no-op patch', () => {
			const authorize = vi.fn(({ type, prev, next }: any) => (type === 'delete' ? prev : next))
			const { room, note } = seededWithNote(authorize)
			connectSession(room, 'alice', { meta: { userId: 'u' } })
			authorize.mockClear()

			push(room, 'alice', {
				[note.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, note.text] }],
			})

			expect(authorize).not.toHaveBeenCalled()
		})

		it('vetoes a delete the authorizer rejects', () => {
			const { room, storage, note } = seededWithNote(({ type, next }: any) =>
				type === 'delete' ? null : next
			)
			const socket = connectSession(room, 'mallory', { meta: { userId: 'm' } })

			push(room, 'mallory', { [note.id]: [RecordOpType.Remove] })

			expect(lastPushResult(socket)).toMatchObject({ action: 'discard' })
			expect(storedIds(storage)).toEqual([note.id])
		})

		it('vetoes a put that changes the typeName of an existing record', () => {
			const { room, storage, note } = seededWithNote(authorizeNote)
			const socket = connectSession(room, 'mallory', { meta: { userId: 'user-mallory' } })

			// a `doc`-shaped record reusing the note's id: the authorizer lookup keys off the incoming
			// typeName, so the swap would consult the doc authorizer (here: none) instead of note's
			push(room, 'mallory', {
				[note.id]: [RecordOpType.Put, { id: note.id, typeName: 'doc', title: 'swapped' } as any],
			})

			expect(lastPushResult(socket)).toMatchObject({ action: 'discard' })
			expect(storedNote(storage, note.id)?.typeName).toBe('note')
		})

		it('vetoes a put over an existing record that changes an immutable field', () => {
			const { room, storage, note } = seededWithNote(authorizeNote)
			const socket = connectSession(room, 'mallory', { meta: { userId: 'user-mallory' } })

			push(room, 'mallory', { [note.id]: [RecordOpType.Put, { ...note, text: 'tampered' }] })

			expect(lastPushResult(socket)).toMatchObject({ action: 'discard' })
			expect(storedNote(storage, note.id)?.text).toBe('by:user-alice')
		})

		it('ignores the record returned by an update authorizer (allow/veto only)', () => {
			const { room, storage, note } = seededWithNote(({ type, prev, next }: any) => {
				if (type === 'update') return { ...next, text: 'stamped-on-update' }
				return type === 'delete' ? prev : next
			})
			connectSession(room, 'alice', { meta: { userId: 'u' } })

			push(room, 'alice', { [note.id]: [RecordOpType.Put, { ...note, text: 'edited' }] })

			expect(storedNote(storage, note.id)?.text).toBe('edited')
		})

		it('rejects the write (fail closed) when the authorizer throws, without crashing the push', () => {
			const { room, storage } = withNote(() => {
				throw new Error('boom')
			})
			const socket = connectSession(room, 'alice', { meta: { userId: 'u' } })
			const note = Note.create({ text: 'x' })

			expect(() => push(room, 'alice', { [note.id]: [RecordOpType.Put, note] })).not.toThrow()
			expect(lastPushResult(socket)).toMatchObject({ action: 'discard' })
			expect(storedIds(storage)).toEqual([])
		})

		it('passes the change type for create, update, and delete', () => {
			const types: string[] = []
			const note = Note.create({ text: 'x' })
			const { room } = withNote(({ type, prev, next }: any) => {
				types.push(type)
				return type === 'delete' ? prev : next
			})
			connectSession(room, 'alice', { meta: { userId: 'u' } })

			push(room, 'alice', { [note.id]: [RecordOpType.Put, note] }, 1)
			push(room, 'alice', { [note.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, 'y'] }] }, 2)
			push(room, 'alice', { [note.id]: [RecordOpType.Remove] }, 3)

			expect(types).toEqual(['create', 'update', 'delete'])
		})

		it('logs a warning when a write is vetoed', () => {
			const warn = vi.fn()
			const note = Note.create({ text: 'by:user-alice' })
			const { room } = makeRoom({
				objectTypes: ['note'],
				authorizeRecord: { note: () => null },
				log: { warn },
			})
			connectSession(room, 'mallory', { meta: { userId: 'user-mallory' } })

			push(room, 'mallory', { [note.id]: [RecordOpType.Put, note] })

			expect(warn).toHaveBeenCalledTimes(1)
			expect(warn.mock.calls[0].join(' ')).toContain(note.id)
		})
	})
})
