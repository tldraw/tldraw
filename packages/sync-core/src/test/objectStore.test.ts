import { BaseRecord, RecordId, StoreSchema, createRecordType } from '@tldraw/store'
import { vi, type Mock } from 'vitest'
import { canRead } from '../lib/canRead'
import { canWrite } from '../lib/canWrite'
import { RecordOpType, ValueOpType } from '../lib/diff'
import { InMemorySyncStorage } from '../lib/InMemorySyncStorage'
import {
	TLConnectRequest,
	TLPushRequest,
	TLSocketServerSentEvent,
	getTlsyncProtocolVersion,
} from '../lib/protocol'
import { TLSocketRoom } from '../lib/TLSocketRoom'
import { TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason } from '../lib/TLSyncClient'
import {
	RoomSnapshot,
	composeBeforeRead,
	composeBeforeWrite,
	beforeWriteFromAuthorizers,
	TLBeforeWriteHook,
	TLRoomSocket,
	TLSyncRoom,
} from '../lib/TLSyncRoom'

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
		beforeWrite?: {
			[typeName: string]: (args: {
				session: { sessionId: string; isReadonly: boolean; meta: any }
				type: 'create' | 'update' | 'delete'
				prev: any
				next: any
			}) => any
		}
		beforeRead?: { [typeName: string]: (args: any) => any }
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
		beforeWrite: opts.beforeWrite,
		beforeRead: opts.beforeRead,
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

		it('[US1][US3] updateStore sees and can delete object-lane records', async () => {
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			const socketRoom = new TLSocketRoom<R, void>({
				schema,
				storage: new InMemorySyncStorage<R>({
					snapshot: { documents: [], clock: 0, documentClock: 0, schema: schema.serialize() },
					objectTypes: ['note'],
				}),
				objectTypes: ['note'],
			})
			disposables.push(() => socketRoom.close())
			const doc = Doc.create({ title: 'canvas' })
			const note = Note.create({ text: 'annotation' })
			socketRoom.storage.transaction((txn) => {
				txn.set(doc.id, doc)
				txn.set(note.id, note)
			})

			// the update context reads both lanes, not just the document snapshot
			// eslint-disable-next-line @typescript-eslint/no-deprecated
			await socketRoom.updateStore((store) => {
				expect(store.get(note.id)).toEqual(note)
				expect(
					store
						.getAll()
						.map((r) => r.id)
						.sort()
				).toEqual([doc.id, note.id].sort())
				store.delete(note.id)
			})
			expect(socketRoom.getRecord(note.id)).toBeUndefined()
			expect(socketRoom.getRecord(doc.id)).toEqual(doc)
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

	describe('beforeWrite', () => {
		it('rejects a presence typeName key at construction', () => {
			expect(() => makeRoom({ beforeWrite: { presence: ({ next }: any) => next } })).toThrow(
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
			if (type === 'update') return next.text === prev.text ? next : prev
			return // delete allowed
		}

		function withNote(authorize: any, extra: any = {}) {
			return makeRoom({ objectTypes: ['note'], beforeWrite: { note: authorize }, ...extra })
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

		it('exposes the session isReadonly flag to the authorizer', () => {
			const authorize = vi.fn(({ next }: any) => next)
			const { room } = withNote(authorize)
			// a canvas-readonly session can still write the object lane (objectAccess defaults to
			// 'write'), which is exactly why authorizers need to see isReadonly independently
			connectSession(room, 'reader', { isReadonly: true, meta: { userId: 'u' } })

			const note = Note.create({ text: 'x' })
			push(room, 'reader', { [note.id]: [RecordOpType.Put, note] })

			expect(authorize.mock.calls[0][0].session.isReadonly).toBe(true)

			authorize.mockClear()
			connectSession(room, 'writer', { isReadonly: false, meta: { userId: 'u' } })
			const note2 = Note.create({ text: 'y' })
			push(room, 'writer', { [note2.id]: [RecordOpType.Put, note2] })

			expect(authorize.mock.calls[0][0].session.isReadonly).toBe(false)
		})

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

		it('rejects a create the authorizer denies', () => {
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
				beforeWrite: {
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
			const { room, storage, note } = seededWithNote(({ type, next }: any) =>
				type === 'delete' ? undefined : next
			)
			connectSession(room, 'alice', { meta: { userId: 'u' } })

			push(room, 'alice', {
				[note.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, 'edited'] }],
			})

			expect(storedNote(storage, note.id)?.text).toBe('edited')
		})

		it('does not consult the authorizer for a no-op patch', () => {
			const authorize = vi.fn(({ type, next }: any) => (type === 'delete' ? undefined : next))
			const { room, note } = seededWithNote(authorize)
			connectSession(room, 'alice', { meta: { userId: 'u' } })
			authorize.mockClear()

			push(room, 'alice', {
				[note.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, note.text] }],
			})

			expect(authorize).not.toHaveBeenCalled()
		})

		it('vetoes a delete the authorizer rejects', () => {
			const { room, storage, note } = seededWithNote(({ type, prev, next }: any) =>
				type === 'delete' ? prev : next
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

		// The typeName guard must not depend on authorizers being configured: the write gate keys
		// off the *incoming* typeName, so relabeling an existing object-lane record as a document
		// type would otherwise let an objectAccess:'read' session write through the document lane.
		it('vetoes a typeName swap even with no beforeWrite configured', () => {
			const note = Note.create({ text: 'by:user-alice' })
			const { room, storage } = makeRoom({
				objectTypes: ['note'],
				snapshot: {
					documents: [{ state: note, lastChangedClock: 0 }],
					clock: 0,
					documentClock: 0,
					schema: schema.serialize(),
				},
			})
			// denied on the object lane, but allowed on the document lane
			const socket = connectSession(room, 'mallory', {
				objectAccess: 'read',
				meta: { userId: 'user-mallory' },
			})

			push(room, 'mallory', {
				[note.id]: [RecordOpType.Put, { id: note.id, typeName: 'doc', title: 'swapped' } as any],
			})

			expect(lastPushResult(socket)).toMatchObject({ action: 'discard' })
			expect(storedNote(storage, note.id)?.typeName).toBe('note')
			expect(storedNote(storage, note.id)?.text).toBe('by:user-alice')
		})

		it('vetoes a put over an existing record that changes an immutable field', () => {
			const { room, storage, note } = seededWithNote(authorizeNote)
			const socket = connectSession(room, 'mallory', { meta: { userId: 'user-mallory' } })

			push(room, 'mallory', { [note.id]: [RecordOpType.Put, { ...note, text: 'tampered' }] })

			expect(lastPushResult(socket)).toMatchObject({ action: 'discard' })
			expect(storedNote(storage, note.id)?.text).toBe('by:user-alice')
		})

		it.each(['put', 'patch'] as const)(
			'stores the record a hook returns on update (%s) and rebases the client',
			(kind) => {
				const { room, storage, note } = seededWithNote(({ type, next }: any) =>
					type === 'update' ? { ...next, text: next.text + '-stamped' } : undefined
				)
				const socket = connectSession(room, 'alice', { meta: { userId: 'u' } })

				push(room, 'alice', {
					[note.id]:
						kind === 'put'
							? [RecordOpType.Put, { ...note, text: 'edited' }]
							: [RecordOpType.Patch, { text: [ValueOpType.Put, 'edited'] }],
				})

				expect(storedNote(storage, note.id)?.text).toBe('edited-stamped')
				expect(lastPushResult(socket).action).toHaveProperty('rebaseWithDiff')
			}
		)

		it.each(['put', 'patch'] as const)(
			'deletes the record when a hook returns null on update (%s)',
			(kind) => {
				const { room, storage, note } = seededWithNote(({ type }: any) =>
					type === 'update' ? null : undefined
				)
				connectSession(room, 'alice', { meta: { userId: 'u' } })

				push(room, 'alice', {
					[note.id]:
						kind === 'put'
							? [RecordOpType.Put, { ...note, text: 'edited' }]
							: [RecordOpType.Patch, { text: [ValueOpType.Put, 'edited'] }],
				})

				expect(storedIds(storage)).toEqual([])
			}
		)

		it('stores the record a hook returns instead of a delete', () => {
			const { room, storage, note } = seededWithNote(({ type, prev }: any) =>
				type === 'delete' ? { ...prev, text: 'tombstone' } : undefined
			)
			connectSession(room, 'alice', { meta: { userId: 'u' } })

			push(room, 'alice', { [note.id]: [RecordOpType.Remove] })

			expect(storedNote(storage, note.id)?.text).toBe('tombstone')
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
			const { room } = withNote(({ type, next }: any) => {
				types.push(type)
				return type === 'delete' ? undefined : next
			})
			connectSession(room, 'alice', { meta: { userId: 'u' } })

			push(room, 'alice', { [note.id]: [RecordOpType.Put, note] }, 1)
			push(room, 'alice', { [note.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, 'y'] }] }, 2)
			push(room, 'alice', { [note.id]: [RecordOpType.Remove] }, 3)

			expect(types).toEqual(['create', 'update', 'delete'])
		})

		describe('hook results', () => {
			function pushNoteWith(hook: any) {
				const warn = vi.fn()
				const { room, storage } = makeRoom({
					objectTypes: ['note'],
					beforeWrite: { note: hook },
					log: { warn },
				})
				connectSession(room, 'writer', { meta: { userId: 'u' } })
				const note = Note.create({ text: 'client' })
				push(room, 'writer', { [note.id]: [RecordOpType.Put, note] })
				return { warn, note: storedNote(storage, note.id) }
			}

			it('returning nothing allows the write as it is', () => {
				const { note, warn } = pushNoteWith(() => undefined)
				expect(note?.text).toBe('client')
				expect(warn).not.toHaveBeenCalled()
			})

			it('returning prev keeps the stored record and logs it', () => {
				const { note, warn } = pushNoteWith(({ prev }: any) => prev)
				expect(note).toBeUndefined()
				expect(warn).toHaveBeenCalledTimes(1)
			})

			it('returning null on create skips the record', () => {
				const { note } = pushNoteWith(() => null)
				expect(note).toBeUndefined()
			})

			it('keeps the stored record when a hook changes the id', () => {
				const { note } = pushNoteWith(({ next }: any) => ({ ...next, id: 'note:other' }))
				expect(note).toBeUndefined()
			})

			it.each([null, false])(
				'%s from a deprecated authorizeRecord hook rejects the write and never deletes',
				(legacy) => {
					const hooks = beforeWriteFromAuthorizers<R, undefined>({ note: () => legacy as any })
					const { note } = pushNoteWith(hooks.note)
					expect(note).toBeUndefined()

					const seeded = seededWithNote(hooks.note)
					connectSession(seeded.room, 'alice', { meta: { userId: 'u' } })
					push(seeded.room, 'alice', {
						[seeded.note.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, 'edited'] }],
					})
					expect(storedNote(seeded.storage, seeded.note.id)?.text).toBe('by:user-alice')
				}
			)

			it('a deprecated authorizeRecord hook stamps on create only', () => {
				const hooks = beforeWriteFromAuthorizers<R, undefined>({
					note: ({ next }: any) => ({ ...next, text: 'stamped' }),
				})
				expect(pushNoteWith(hooks.note).note?.text).toBe('stamped')

				const seeded = seededWithNote(hooks.note)
				connectSession(seeded.room, 'alice', { meta: { userId: 'u' } })
				push(seeded.room, 'alice', {
					[seeded.note.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, 'edited'] }],
				})
				expect(storedNote(seeded.storage, seeded.note.id)?.text).toBe('edited')
			})
		})

		it('logs a warning when a write is vetoed', () => {
			const warn = vi.fn()
			const note = Note.create({ text: 'by:user-alice' })
			const { room } = makeRoom({
				objectTypes: ['note'],
				beforeWrite: { note: ({ prev }: any) => prev },
				log: { warn },
			})
			connectSession(room, 'mallory', { meta: { userId: 'user-mallory' } })

			push(room, 'mallory', { [note.id]: [RecordOpType.Put, note] })

			expect(warn).toHaveBeenCalledTimes(1)
			expect(warn.mock.calls[0].join(' ')).toContain(note.id)
		})
	})
})

describe('composeBeforeWrite', () => {
	type Args = Parameters<TLBeforeWriteHook<NoteRecord, null>>[0]
	const session = { sessionId: 's', isReadonly: false, meta: null }
	const get = () => undefined
	const note = Note.create({ text: 'hi' })
	const create = { session, get, type: 'create', prev: null, next: note } as Args
	const update = { session, get, type: 'update', prev: note, next: { ...note, text: 'x' } } as Args

	it('passes a single hook through unchanged', () => {
		const hook = () => undefined
		expect(composeBeforeWrite<R, null>({ note: hook }).note).toBe(hook)
	})

	it('runs hooks for a type in argument order, each seeing the record the previous returned', () => {
		const seen: string[] = []
		const hooks = composeBeforeWrite<R, null>(
			{ note: ({ next }) => ({ ...next!, text: next!.text + '-a' }) },
			{ doc: () => null },
			{
				note: ({ next }) => {
					seen.push(next!.text)
					return { ...next!, text: next!.text + '-b' }
				},
			}
		)
		expect(hooks.note!(create)).toEqual({ ...note, text: 'hi-a-b' })
		expect(hooks.note!(update)).toEqual({ ...note, text: 'x-a-b' })
		expect(seen).toEqual(['hi-a', 'x-a'])
	})

	it('returns nothing when no hook changed the record', () => {
		const hooks = composeBeforeWrite<R, null>(
			{ note: () => undefined },
			{ note: ({ next }) => next }
		)
		expect(hooks.note!(create)).toBeUndefined()
	})

	it.each([
		['keeping prev', ({ prev }: Args) => prev],
		['returning null', () => null],
	])('stops at the first hook %s', (_, first) => {
		const later = vi.fn()
		const hooks = composeBeforeWrite<R, null>({ note: first }, { note: later })
		expect(hooks.note!(update)).toBe(first(update))
		expect(later).not.toHaveBeenCalled()
	})
})

describe('canWrite', () => {
	const storedNote = (storage: InMemorySyncStorage<R>, id: string) =>
		storage.getObjectsSnapshot().find((d) => d.state.id === id)?.state as NoteRecord | undefined

	function roomWith(hooks: any) {
		const note = Note.create({ text: 'seeded' })
		const { room, storage } = makeRoom({
			objectTypes: ['note'],
			beforeWrite: hooks,
			snapshot: {
				documents: [{ state: note, lastChangedClock: 0 }],
				clock: 0,
				documentClock: 0,
				schema: schema.serialize(),
			},
		})
		const socket = connectSession(room, 'alice', { meta: { userId: 'u' } })
		return { room, storage, note, socket }
	}

	it('keeps the stored record when a check returns false, on create, update and delete', () => {
		const { room, storage, note, socket } = roomWith(canWrite<R, undefined>({ note: () => false }))
		const created = Note.create({ text: 'new' })

		push(room, 'alice', { [created.id]: [RecordOpType.Put, created] }, 1)
		push(room, 'alice', { [note.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, 'x'] }] }, 2)
		push(room, 'alice', { [note.id]: [RecordOpType.Remove] }, 3)

		expect(storedIds(storage)).toEqual([note.id])
		expect(storedNote(storage, note.id)?.text).toBe('seeded')
		expect(lastPushResult(socket)).toMatchObject({ action: 'discard' })
	})

	it('applies the write as sent when a check returns true', () => {
		const { room, storage, note } = roomWith(canWrite<R, undefined>({ note: () => true }))

		push(room, 'alice', { [note.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, 'x'] }] })

		expect(storedNote(storage, note.id)?.text).toBe('x')
	})

	it('composes with a stamping hook, and the later check sees the stamped record', () => {
		const seen: string[] = []
		const { room, storage, note } = roomWith(
			composeBeforeWrite<R, undefined>(
				{ note: ({ next }) => (next ? { ...next, text: next.text + '-stamped' } : undefined) },
				canWrite<R, undefined>({
					note: ({ next }) => {
						seen.push(next!.text)
						return true
					},
				})
			)
		)

		push(room, 'alice', { [note.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, 'x'] }] })

		expect(seen).toEqual(['x-stamped'])
		expect(storedNote(storage, note.id)?.text).toBe('x-stamped')
	})
})

describe('beforeRead', () => {
	// alice is the owner and sees everything; bob cannot see secret docs; carol gets titles masked
	const readHooks = {
		doc: ({ session, record }: { session: { meta: any }; record: DocRecord }) => {
			if (session.meta.role === 'owner') return undefined
			if (record.title.startsWith('secret')) return null
			if (session.meta.role === 'masked') return { ...record, title: '***' }
			return undefined
		},
	}

	const plain = Doc.create({ title: 'plain' })
	const secret = Doc.create({ title: 'secret plan' })

	function roomWith(beforeRead: any = readHooks, log?: any) {
		const { room, storage } = makeRoom({
			beforeRead,
			log,
			snapshot: {
				documents: [
					{ state: plain, lastChangedClock: 0 },
					{ state: secret, lastChangedClock: 0 },
				],
				clock: 0,
				documentClock: 0,
				schema: schema.serialize(),
			},
		})
		return { room, storage }
	}

	const connectDiff = (socket: MockSocket) =>
		(socket.__messages.find((m: any) => m.type === 'connect') as any).diff
	// later data messages wait for a debounce timer, so flush them first
	const patches = (room: TLSyncRoom<any, any>, sessionId: string, socket: MockSocket) => {
		room._flushDataMessages(sessionId)
		return sentDataMessages(socket)
			.filter((m) => m.type === 'patch')
			.map((m) => m.diff)
	}

	describe('on connect', () => {
		it('sends each session what its hooks allow', () => {
			const { room } = roomWith()
			const alice = connectSession(room, 'alice', { meta: { role: 'owner' }, clear: false })
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' }, clear: false })
			const carol = connectSession(room, 'carol', { meta: { role: 'masked' }, clear: false })

			expect(connectDiff(alice)).toEqual({
				[plain.id]: [RecordOpType.Put, plain],
				[secret.id]: [RecordOpType.Put, secret],
			})
			expect(connectDiff(bob)).toEqual({ [plain.id]: [RecordOpType.Put, plain] })
			expect(connectDiff(carol)).toEqual({
				[plain.id]: [RecordOpType.Put, { ...plain, title: '***' }],
			})
		})

		it('always sends a full view, even to a client that reconnects', () => {
			const { room, storage } = roomWith()
			const socket = makeSocket()
			room.handleNewSession({
				sessionId: 'bob',
				socket,
				meta: { role: 'viewer' } as any,
				isReadonly: false,
			})
			room.handleMessage('bob', {
				type: 'connect',
				connectRequestId: 'c',
				lastServerClock: storage.getClock(),
				protocolVersion: getTlsyncProtocolVersion(),
				schema: room.serializedSchema,
			} satisfies TLConnectRequest)

			const connect = socket.__messages.find((m: any) => m.type === 'connect') as any
			expect(connect.hydrationType).toBe('wipe_all')
			expect(connect.diff).toEqual({ [plain.id]: [RecordOpType.Put, plain] })
		})
	})

	describe('on broadcast', () => {
		it('keeps patches for a client that holds the stored record', () => {
			const { room } = roomWith()
			connectSession(room, 'alice', { meta: { role: 'owner' } })
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })

			push(room, 'alice', {
				[plain.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'other'] }],
			})

			expect(patches(room, 'bob', bob)).toEqual([
				{ [plain.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'other'] }] },
			])
		})

		it('sends nothing for a hidden record, a whole record when it shows, and one remove when it hides', () => {
			const { room } = roomWith()
			connectSession(room, 'alice', { meta: { role: 'owner' } })
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })
			const title = (t: string) =>
				({ [secret.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, t] }] }) as any

			push(room, 'alice', title('secret v2'), 1)
			expect(patches(room, 'bob', bob)).toEqual([])

			push(room, 'alice', title('public'), 2)
			push(room, 'alice', title('secret again'), 3)
			push(room, 'alice', title('secret v4'), 4)
			push(room, 'alice', { [secret.id]: [RecordOpType.Remove] }, 5)

			expect(patches(room, 'bob', bob)).toEqual([
				{ [secret.id]: [RecordOpType.Put, { ...secret, title: 'public' }] },
				{ [secret.id]: [RecordOpType.Remove] },
			])
		})

		it('sends a changed copy only when it differs from the one the client holds', () => {
			// keeps the first letter, so some title changes change the copy and some do not
			const { room } = roomWith({
				doc: ({ record }: { record: DocRecord }) => ({ ...record, title: record.title[0] + '***' }),
			})
			connectSession(room, 'alice', { meta: { role: 'owner' } })
			const carol = connectSession(room, 'carol', { meta: { role: 'masked' } })
			const title = (t: string) =>
				({ [plain.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, t] }] }) as any

			push(room, 'alice', title('other'), 1)
			push(room, 'alice', title('oops'), 2)
			push(room, 'alice', title('xyz'), 3)

			expect(patches(room, 'carol', carol)).toEqual([
				{ [plain.id]: [RecordOpType.Put, { ...plain, title: 'o***' }] },
				{ [plain.id]: [RecordOpType.Put, { ...plain, title: 'x***' }] },
			])
		})

		it('sends nothing, not even a remove, for a new record the client may not see', () => {
			const { room } = roomWith()
			connectSession(room, 'alice', { meta: { role: 'owner' } })
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })
			const created = Doc.create({ title: 'secret new' })

			push(room, 'alice', { [created.id]: [RecordOpType.Put, created] }, 1)
			push(room, 'alice', { [created.id]: [RecordOpType.Remove] }, 2)

			expect(patches(room, 'bob', bob)).toEqual([])
		})

		it('sends server writes through the hooks too', async () => {
			const { room, storage } = roomWith()
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })
			const hidden = Doc.create({ title: 'secret new' })
			const shown = Doc.create({ title: 'plain new' })

			storage.transaction((txn) => {
				txn.set(hidden.id, hidden)
				txn.set(shown.id, shown)
			})
			// the room hears about storage writes on a microtask
			await new Promise((r) => setTimeout(r, 0))

			expect(patches(room, 'bob', bob)).toEqual([{ [shown.id]: [RecordOpType.Put, shown] }])
		})

		it('leaves types without a hook on the shared path', () => {
			const { room } = roomWith({})
			connectSession(room, 'alice', { meta: { role: 'owner' } })
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })

			push(room, 'alice', { [secret.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'x'] }] })

			expect(patches(room, 'bob', bob)).toEqual([
				{ [secret.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'x'] }] },
			])
		})

		it('sends whole records to a resumed session, which may hold anything', () => {
			const { room } = roomWith()
			connectSession(room, 'alice', { meta: { role: 'owner' } })
			const bob = makeSocket()
			room.handleResumedSession({
				sessionId: 'bob',
				socket: bob,
				meta: { role: 'viewer' } as any,
				isReadonly: false,
				serializedSchema: room.serializedSchema,
				presenceId: null,
				presenceRecord: null,
				requiresLegacyRejection: false,
				supportsStringAppend: true,
			})

			push(
				room,
				'alice',
				{ [plain.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'other'] }] },
				1
			)
			push(
				room,
				'alice',
				{ [secret.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'secret 2'] }] },
				2
			)

			expect(patches(room, 'bob', bob)).toEqual([
				{ [plain.id]: [RecordOpType.Put, { ...plain, title: 'other' }] },
				{ [secret.id]: [RecordOpType.Remove] },
			])
		})
	})

	describe('push results', () => {
		it('discards a create that the pushing client may not see', () => {
			const { room, storage } = roomWith()
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })
			const created = Doc.create({ title: 'secret mine' })

			push(room, 'bob', { [created.id]: [RecordOpType.Put, created] })

			expect(storedIds(storage)).toContain(created.id)
			// a discard undoes the create on the client, so it needs no remove
			expect(lastPushResult(bob)).toMatchObject({ action: 'discard' })
		})

		it('discards an edit that does not change the copy the pushing client holds', () => {
			const { room, storage } = roomWith()
			const carol = connectSession(room, 'carol', { meta: { role: 'masked' } })

			push(room, 'carol', {
				[plain.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'mine'] }],
			})

			expect(storage.getSnapshot().documents.find((d) => d.state.id === plain.id)?.state).toEqual({
				...plain,
				title: 'mine',
			})
			// a discard puts the client back on the copy it holds
			expect(lastPushResult(carol)).toMatchObject({ action: 'discard' })
		})

		it('corrects the pushing client to a changed copy that differs from the one it holds', () => {
			const { room } = roomWith({
				doc: ({ record }: { record: DocRecord }) => ({ ...record, title: record.title[0] + '***' }),
			})
			const carol = connectSession(room, 'carol', { meta: { role: 'masked' } })

			push(room, 'carol', {
				[plain.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'zebra'] }],
			})

			expect(lastPushResult(carol)).toMatchObject({
				action: { rebaseWithDiff: { [plain.id]: [RecordOpType.Put, { ...plain, title: 'z***' }] } },
			})
		})

		it('commits a push that the client sees as stored', () => {
			const { room } = roomWith()
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })

			push(room, 'bob', { [plain.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'other'] }] })

			expect(lastPushResult(bob)).toMatchObject({ action: 'commit' })
		})
	})

	describe('hook results', () => {
		it.each([
			[
				'throws',
				() => {
					throw new Error('boom')
				},
			],
			['changes the id', ({ record }: any) => ({ ...record, id: 'doc:other' })],
			['changes the typeName', ({ record }: any) => ({ ...record, typeName: 'note' })],
		])('sends nothing when the hook %s', (_, hook) => {
			const log = { error: vi.fn(), warn: vi.fn() }
			const { room } = roomWith({ doc: hook }, log)
			const bob = connectSession(room, 'bob', { meta: { role: 'viewer' }, clear: false })

			expect(connectDiff(bob)).toEqual({})
			expect(log.error).toHaveBeenCalled()
		})

		it('refuses a presence hook at construction', () => {
			expect(() => roomWith({ presence: () => undefined })).toThrow(/presence/)
		})
	})
})

describe('composeBeforeRead', () => {
	it('runs hooks in order, passing each the record the hook before it returned', () => {
		const { doc } = composeBeforeRead<R, undefined>(
			{ doc: ({ record }) => ({ ...record, title: record.title + ' a' }) },
			{ doc: ({ record }) => ({ ...record, title: record.title + ' b' }) }
		) as any
		const record = Doc.create({ title: 'x' })

		expect(doc({ session: {}, record, get: () => undefined }).title).toBe('x a b')
	})

	it('stops at the first hook that returns null', () => {
		const later = vi.fn()
		const { doc } = composeBeforeRead<R, undefined>({ doc: () => null }, { doc: later }) as any

		expect(
			doc({ session: {}, record: Doc.create({ title: 'x' }), get: () => undefined })
		).toBeNull()
		expect(later).not.toHaveBeenCalled()
	})

	it('returns nothing when no hook changed the record', () => {
		const { doc } = composeBeforeRead<R, undefined>(
			{ doc: () => undefined },
			{ doc: () => undefined }
		) as any

		expect(
			doc({ session: {}, record: Doc.create({ title: 'x' }), get: () => undefined })
		).toBeUndefined()
	})
})

describe('canRead', () => {
	const plain = Doc.create({ title: 'plain' })
	const secret = Doc.create({ title: 'secret plan' })
	const notSecret = canRead<R, any>({
		doc: ({ session, record }) =>
			session.meta.role === 'owner' || !record.title.startsWith('secret'),
	})

	function roomWith(beforeRead: any, log?: any) {
		const { room } = makeRoom({
			beforeRead,
			log,
			snapshot: {
				documents: [
					{ state: plain, lastChangedClock: 0 },
					{ state: secret, lastChangedClock: 0 },
				],
				clock: 0,
				documentClock: 0,
				schema: schema.serialize(),
			},
		})
		return room
	}
	const connectDiff = (socket: MockSocket) =>
		(socket.__messages.find((m: any) => m.type === 'connect') as any).diff

	it('sends the stored record when a check returns true, and nothing when it returns false', () => {
		const room = roomWith(notSecret)
		const alice = connectSession(room, 'alice', { meta: { role: 'owner' }, clear: false })
		const bob = connectSession(room, 'bob', { meta: { role: 'viewer' }, clear: false })

		expect(connectDiff(alice)).toEqual({
			[plain.id]: [RecordOpType.Put, plain],
			[secret.id]: [RecordOpType.Put, secret],
		})
		expect(connectDiff(bob)).toEqual({ [plain.id]: [RecordOpType.Put, plain] })
	})

	it('removes a record from a client that holds it when the check turns false', () => {
		const room = roomWith(notSecret)
		connectSession(room, 'alice', { meta: { role: 'owner' } })
		const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })

		push(room, 'alice', {
			[plain.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, 'secret now'] }],
		})
		room._flushDataMessages('bob')

		expect(
			sentDataMessages(bob)
				.filter((m) => m.type === 'patch')
				.map((m) => m.diff)
		).toEqual([{ [plain.id]: [RecordOpType.Remove] }])
	})

	it('sends nothing while a record is hidden, then the whole record when the check turns true', () => {
		const room = roomWith(notSecret)
		connectSession(room, 'alice', { meta: { role: 'owner' } })
		const bob = connectSession(room, 'bob', { meta: { role: 'viewer' } })
		const title = (t: string) =>
			({ [secret.id]: [RecordOpType.Patch, { title: [ValueOpType.Put, t] }] }) as any

		push(room, 'alice', title('secret v2'), 1)
		push(room, 'alice', title('public'), 2)
		room._flushDataMessages('bob')

		expect(
			sentDataMessages(bob)
				.filter((m) => m.type === 'patch')
				.map((m) => m.diff)
		).toEqual([{ [secret.id]: [RecordOpType.Put, { ...secret, title: 'public' }] }])
	})

	it('hides the record when a check returns a truthy value that is not true', () => {
		const room = roomWith(canRead<R, any>({ doc: () => 'yes' as any }))
		const bob = connectSession(room, 'bob', { meta: { role: 'viewer' }, clear: false })

		expect(connectDiff(bob)).toEqual({})
	})

	it('hides the record when an async check returns a Promise', () => {
		const room = roomWith(canRead<R, any>({ doc: (async () => true) as any }))
		const bob = connectSession(room, 'bob', { meta: { role: 'viewer' }, clear: false })

		expect(connectDiff(bob)).toEqual({})
	})

	it('hides the record when a check throws', () => {
		const log = { error: vi.fn() }
		const room = roomWith(
			canRead<R, any>({
				doc: () => {
					throw new Error('boom')
				},
			}),
			log
		)
		const bob = connectSession(room, 'bob', { meta: { role: 'viewer' }, clear: false })

		expect(connectDiff(bob)).toEqual({})
		expect(log.error).toHaveBeenCalled()
	})

	it('composes with a masking hook, which never sees a hidden record', () => {
		const masked: string[] = []
		const room = roomWith(
			composeBeforeRead<R, any>(notSecret, {
				doc: ({ record }) => {
					masked.push(record.title)
					return { ...record, title: '***' }
				},
			})
		)
		const bob = connectSession(room, 'bob', { meta: { role: 'viewer' }, clear: false })

		expect(connectDiff(bob)).toEqual({
			[plain.id]: [RecordOpType.Put, { ...plain, title: '***' }],
		})
		expect(masked).toEqual(['plain'])
	})

	it('skips types with no check', () => {
		expect(Object.keys(canRead<R, any>({ doc: undefined, note: () => true }))).toEqual(['note'])
	})
})
