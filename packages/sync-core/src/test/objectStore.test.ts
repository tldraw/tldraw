import { Authorize, BaseRecord, RecordId, StoreSchema, createRecordType } from '@tldraw/store'
import { vi, type Mock } from 'vitest'
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
		authorize?: Authorize<any, any>
		atomicPushes?: boolean
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
		authorize: opts.authorize,
		atomicPushes: opts.atomicPushes,
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

	describe('authorize', () => {
		// Like dotcom's attribution rule: stamp the note's text from the actor on create, keep it
		// immutable on update, allow deletes.
		const authorizeNote: Authorize<any, any> = (ctx) => {
			if (ctx.record?.typeName !== 'note') return undefined
			if (ctx.action === 'create') {
				const userId = ctx.actor?.userId
				if (!userId) return false
				return { record: { ...ctx.record, text: `by:${userId}` } }
			}
			if (ctx.action === 'update' && ctx.next) return ctx.next.text === ctx.record.text
			return undefined
		}

		function withNote(authorize: Authorize<any, any>, extra: any = {}) {
			return makeRoom({ objectTypes: ['note'], authorize, ...extra })
		}

		function seededWithNote(authorize: Authorize<any, any>) {
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

		it('gets the session meta as the actor', () => {
			const authorize = vi.fn((_ctx: any) => undefined)
			const { room } = withNote(authorize)
			connectSession(room, 'reader', { meta: { userId: 'u' } })

			const note = Note.create({ text: 'x' })
			push(room, 'reader', { [note.id]: [RecordOpType.Put, note] })

			const writes = authorize.mock.calls.filter(([ctx]) => ctx.action === 'create')
			expect(writes[0][0].actor).toEqual({ userId: 'u' })
		})

		it('stamps a created record from the actor, overriding the client value', () => {
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

		it('rejects a create that authorize denies', () => {
			const { room, storage } = withNote(authorizeNote)
			const socket = connectSession(room, 'anon', { meta: { userId: null } })

			const note = Note.create({ text: 'nope' })
			push(room, 'anon', { [note.id]: [RecordOpType.Put, note] })

			expect(socket.close).not.toHaveBeenCalled()
			expect(lastPushResult(socket)).toMatchObject({ action: 'discard' })
			expect(storedIds(storage)).toEqual([])
		})

		it('asks about every record type, not only the ones a rule names', () => {
			const seen: string[] = []
			const { room, storage } = withNote((ctx) => {
				if (ctx.action !== 'read') seen.push(`${ctx.action}:${ctx.record!.typeName}`)
				return undefined
			})
			connectSession(room, 'writer', { meta: { userId: 'u' } })

			const doc = Doc.create({ title: 'hi' })
			push(room, 'writer', { [doc.id]: [RecordOpType.Put, doc] })

			expect(seen).toEqual(['create:doc'])
			expect(storedIds(storage)).toEqual([doc.id])
		})

		it('never asks about presence records', () => {
			const actions: string[] = []
			const { room } = withNote((ctx) => {
				actions.push(ctx.record?.typeName ?? ctx.action)
				return undefined
			})
			connectSession(room, 'writer', { meta: { userId: 'u' } })
			expect(actions.filter((t) => t === 'presence')).toEqual([])
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

		it('allows an update when authorize abstains (patch)', () => {
			const { room, storage, note } = seededWithNote(() => undefined)
			connectSession(room, 'alice', { meta: { userId: 'u' } })

			push(room, 'alice', {
				[note.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, 'edited'] }],
			})

			expect(storedNote(storage, note.id)?.text).toBe('edited')
		})

		it('does not ask about a no-op patch', () => {
			const authorize = vi.fn((_ctx: any) => undefined)
			const { room, note } = seededWithNote(authorize)
			connectSession(room, 'alice', { meta: { userId: 'u' } })
			authorize.mockClear()

			push(room, 'alice', {
				[note.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, note.text] }],
			})

			expect(authorize.mock.calls.filter(([ctx]) => ctx.action !== 'read')).toEqual([])
		})

		it('vetoes a delete that authorize denies', () => {
			const { room, storage, note } = seededWithNote((ctx) => ctx.action !== 'delete')
			const socket = connectSession(room, 'mallory', { meta: { userId: 'm' } })

			push(room, 'mallory', { [note.id]: [RecordOpType.Remove] })

			expect(lastPushResult(socket)).toMatchObject({ action: 'discard' })
			expect(storedIds(storage)).toEqual([note.id])
		})

		it('vetoes a put that changes the typeName of an existing record', () => {
			const { room, storage, note } = seededWithNote(authorizeNote)
			const socket = connectSession(room, 'mallory', { meta: { userId: 'user-mallory' } })

			push(room, 'mallory', {
				[note.id]: [RecordOpType.Put, { id: note.id, typeName: 'doc', title: 'swapped' } as any],
			})

			expect(lastPushResult(socket)).toMatchObject({ action: 'discard' })
			expect(storedNote(storage, note.id)?.typeName).toBe('note')
		})

		// The typeName guard must not depend on `authorize`: the write gate keys off the *incoming*
		// typeName, so relabeling an existing object-lane record as a document type would otherwise
		// let an objectAccess:'read' session write through the document lane.
		it('vetoes a typeName swap even with no authorize configured', () => {
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

		it('stores the replacement record on update too', () => {
			const { room, storage, note } = seededWithNote((ctx) =>
				ctx.action === 'update' && ctx.next
					? { record: { ...ctx.next, text: 'stamped-on-update' } }
					: undefined
			)
			connectSession(room, 'alice', { meta: { userId: 'u' } })

			push(room, 'alice', { [note.id]: [RecordOpType.Put, { ...note, text: 'edited' }] })

			expect(storedNote(storage, note.id)?.text).toBe('stamped-on-update')
		})

		it('rejects the write (fail closed) when authorize throws, without crashing the push', () => {
			const { room, storage } = withNote((ctx) => {
				if (ctx.action === 'read') return undefined
				throw new Error('boom')
			})
			const socket = connectSession(room, 'alice', { meta: { userId: 'u' } })
			const note = Note.create({ text: 'x' })

			expect(() => push(room, 'alice', { [note.id]: [RecordOpType.Put, note] })).not.toThrow()
			expect(lastPushResult(socket)).toMatchObject({ action: 'discard' })
			expect(storedIds(storage)).toEqual([])
		})

		it('passes the action for create, update, and delete', () => {
			const actions: string[] = []
			const note = Note.create({ text: 'x' })
			const { room } = withNote((ctx) => {
				if (ctx.action !== 'read') actions.push(ctx.action)
				return undefined
			})
			connectSession(room, 'alice', { meta: { userId: 'u' } })

			push(room, 'alice', { [note.id]: [RecordOpType.Put, note] }, 1)
			push(room, 'alice', { [note.id]: [RecordOpType.Patch, { text: [ValueOpType.Put, 'y'] }] }, 2)
			push(room, 'alice', { [note.id]: [RecordOpType.Remove] }, 3)

			expect(actions).toEqual(['create', 'update', 'delete'])
		})

		it('logs a warning with the reason when a write is denied', () => {
			const warn = vi.fn()
			const note = Note.create({ text: 'by:user-alice' })
			const { room } = makeRoom({
				objectTypes: ['note'],
				authorize: (ctx) => (ctx.action === 'create' ? { deny: 'no notes' } : undefined),
				log: { warn },
			})
			connectSession(room, 'mallory', { meta: { userId: 'user-mallory' } })

			push(room, 'mallory', { [note.id]: [RecordOpType.Put, note] })

			expect(warn).toHaveBeenCalledTimes(1)
			expect(warn.mock.calls[0].join(' ')).toContain(note.id)
			expect(warn.mock.calls[0].join(' ')).toContain('no notes')
		})
	})
})
