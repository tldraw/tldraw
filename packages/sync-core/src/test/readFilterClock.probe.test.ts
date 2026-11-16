import { computed } from '@tldraw/state'
import { BaseRecord, RecordId, Store, StoreSchema, createRecordType } from '@tldraw/store'
import { afterEach, describe, expect, it } from 'vitest'
import { NetworkDiff, RecordOpType } from '../lib/diff'
import { TLSocketClientSentEvent, TLSocketServerSentEvent } from '../lib/protocol'
import { TLSyncClient } from '../lib/TLSyncClient'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

// Probe for D16 (permissions v1): what breaks when the room filters records that advance the
// document clock, and which fix works. Main has no read check, so this file filters at the room
// socket, after the room picks what to send. That is where a per-record read check would run.
//
// 'naive' mode: drop puts and patches for hidden records, pass removes, keep the clock. This is
// the smallest read check that a room could add.
// 'tracked' mode: the proposed fix. The room tracks which filtered records each session holds,
// forces a full filtered snapshot on connect (option B), and sends a put or remove when the
// visibility of a record changes (option A).

interface Note extends BaseRecord<'note', RecordId<Note>> {
	text: string
	private: boolean
}
const NoteType = createRecordType<Note>('note', {
	scope: 'document',
	validator: { validate: (v) => v as Note },
})
interface Box extends BaseRecord<'box', RecordId<Box>> {
	x: number
}
const BoxType = createRecordType<Box>('box', {
	scope: 'document',
	validator: { validate: (v) => v as Box },
})
type R = Note | Box
const schema = StoreSchema.create<R>({ note: NoteType, box: BoxType })

const noteId = NoteType.createId('n1')
const boxId = BoxType.createId('b1')

type Mode = 'naive' | 'tracked'

// App-owned permission state (D7): who may see private notes. Changing it changes no record.
const seesPrivate = new Set<string>()
const canSee = (sessionId: string, record: R) =>
	record.typeName !== 'note' || !record.private || seesPrivate.has(sessionId)

interface User {
	id: string
	pair: TestSocketPair<R>
	store: Store<R>
	client: TLSyncClient<R>
	held: Set<string>
	rawSend(msg: TLSocketServerSentEvent<R>): void
	received: TLSocketServerSentEvent<R>[]
}

const disposables: (() => void)[] = []
afterEach(() => {
	while (disposables.length) disposables.pop()!()
	seesPrivate.clear()
})

function stored(server: TestServer<R>, id: string): R | undefined {
	return server.storage.transaction((txn) => txn.get(id)).result
}

function filterDiff(
	server: TestServer<R>,
	user: User,
	mode: Mode,
	diff: NetworkDiff<R>
): NetworkDiff<R> {
	const out: NetworkDiff<R> = {}
	for (const [id, op] of Object.entries(diff)) {
		const record = stored(server, id)
		const isFiltered = id.startsWith('note:')
		if (!isFiltered) {
			out[id] = op
			continue
		}
		if (mode === 'naive') {
			if (op[0] === RecordOpType.Remove) out[id] = op
			else if (record && canSee(user.id, record)) out[id] = op
			continue
		}
		// tracked
		const visible = record !== undefined && canSee(user.id, record)
		if (op[0] === RecordOpType.Remove || !visible) {
			if (user.held.has(id)) {
				out[id] = [RecordOpType.Remove]
				user.held.delete(id)
			}
			continue
		}
		// a patch only applies to a record the client holds
		out[id] = user.held.has(id) ? op : [RecordOpType.Put, record!]
		user.held.add(id)
	}
	return out
}

function installFilter(server: TestServer<R>, user: User, mode: Mode) {
	const send = user.pair.roomSocket.sendMessage
	user.rawSend = send
	user.pair.roomSocket.sendMessage = (msg) => {
		if (msg.type === 'connect') {
			if (mode === 'tracked') user.held.clear()
			msg = { ...msg, diff: filterDiff(server, user, mode, msg.diff) }
		} else if (msg.type === 'data') {
			const data = msg.data
				.map((m) => {
					if (m.type === 'patch') return { ...m, diff: filterDiff(server, user, mode, m.diff) }
					if (typeof m.action === 'object') {
						return {
							...m,
							action: { rebaseWithDiff: filterDiff(server, user, mode, m.action.rebaseWithDiff) },
						}
					}
					return m
				})
				// tracked: an empty patch would tell the client when a hidden change happened
				.filter((m) => mode === 'naive' || m.type !== 'patch' || Object.keys(m.diff).length > 0)
			if (data.length === 0) return
			msg = { ...msg, data }
		}
		user.received.push(msg)
		send(msg)
	}
}

function wrapClientMessages(server: TestServer<R>, user: User, mode: Mode) {
	const handle = user.pair.didReceiveFromClient!
	user.pair.didReceiveFromClient = (msg: TLSocketClientSentEvent<R>) => {
		if (mode === 'tracked' && msg.type === 'connect') {
			// option B: ignore the client's clock, so the room sends a full snapshot (wipe_all)
			msg = { ...msg, lastServerClock: -1 }
		}
		if (mode === 'tracked' && msg.type === 'push' && msg.diff) {
			for (const [id, op] of Object.entries(msg.diff)) {
				if (op[0] === RecordOpType.Remove) user.held.delete(id)
				else user.held.add(id)
			}
		}
		handle(msg)
	}
}

function makeRoom(records: R[]) {
	const server = new TestServer<R>(schema, {
		documents: records.map((state) => ({ state, lastChangedClock: 1 })),
		clock: 1,
		documentClock: 1,
		schema: schema.serialize(),
	})
	disposables.push(() => server.room.close())
	return server
}

function join(server: TestServer<R>, id: string, mode: Mode): User {
	const pair = new TestSocketPair<R>(id, server)
	const store = new Store<R>({ schema, props: {} })
	const user = { id, pair, store, held: new Set<string>(), received: [] } as unknown as User
	installFilter(server, user, mode)
	pair.connect()
	wrapClientMessages(server, user, mode)
	user.client = new TLSyncClient<R>({
		store,
		socket: pair.clientSocket,
		presence: computed('presence', () => null),
		onLoad: () => {},
		onSyncError: (reason) => {
			throw new Error(`sync error: ${reason}`)
		},
	})
	disposables.push(() => user.client.close())
	flush(user)
	return user
}

function reconnect(server: TestServer<R>, user: User, mode: Mode) {
	user.pair.disconnect()
	user.pair.connect()
	wrapClientMessages(server, user, mode)
	flush(user)
}

function flush(...users: User[]) {
	let again = true
	while (again) {
		again = false
		for (const u of users) {
			u.pair.server.flushDebouncingMessages()
			if (!u.pair.getNeedsFlushing()) continue
			again = true
			u.pair.flushClientSentEvents()
			u.pair.flushServerSentEvents()
		}
	}
}

// app-side refresh after a permission change (option A)
function refreshVisibility(server: TestServer<R>, user: User) {
	const diff: NetworkDiff<R> = {}
	const all = server.storage.transaction((txn) => [...txn.values()]).result
	for (const record of all) {
		if (record.typeName !== 'note') continue
		const visible = canSee(user.id, record)
		if (visible && !user.held.has(record.id)) {
			diff[record.id] = [RecordOpType.Put, record]
			user.held.add(record.id)
		} else if (!visible && user.held.has(record.id)) {
			diff[record.id] = [RecordOpType.Remove]
			user.held.delete(record.id)
		}
	}
	if (Object.keys(diff).length === 0) return
	user.rawSend({
		type: 'data',
		data: [{ type: 'patch', diff, serverClock: server.storage.getClock() }],
	})
	flush(user)
}

const privateNote: Note = {
	id: noteId,
	typeName: 'note',
	text: 'secret',
	private: true,
}
const box: Box = { id: boxId, typeName: 'box', x: 0 }

describe('naive filter (drop hidden puts and patches, keep the clock)', () => {
	const mode = 'naive'

	it('1. gain access while online: the note never arrives, live or on reconnect', () => {
		const server = makeRoom([privateNote, box])
		const bob = join(server, 'bob', mode)
		expect(bob.store.get(noteId)).toBeUndefined()

		seesPrivate.add('bob')
		// unrelated change advances the clock
		const alice = join(server, 'alice', mode)
		alice.store.put([{ ...box, x: 10 }])
		flush(alice, bob)
		expect(bob.store.get(boxId)).toMatchObject({ x: 10 })
		expect(bob.store.get(noteId)).toBeUndefined()

		reconnect(server, bob, mode)
		expect(bob.store.get(noteId)).toBeUndefined()
	})

	it('2. gain access, then the note is edited: the edit is a patch, and the client drops a patch for a record it lacks', () => {
		const server = makeRoom([privateNote])
		seesPrivate.add('alice')
		const alice = join(server, 'alice', mode)
		const bob = join(server, 'bob', mode)
		seesPrivate.add('bob')

		alice.store.update(noteId, (n) => ({ ...n, text: 'secret v2' }))
		flush(alice, bob)
		const lastPatch = bob.received.at(-1) as any
		expect(lastPatch.data[0].diff[noteId][0]).toBe(RecordOpType.Patch)
		expect(bob.store.get(noteId)).toBeUndefined()

		// still missing after a reconnect: the clock is past the edit
		reconnect(server, bob, mode)
		expect(bob.store.get(noteId)).toBeUndefined()
	})

	it('3. hidden when created, then shown by an edit (made public): same, a patch that is dropped', () => {
		const server = makeRoom([])
		seesPrivate.add('alice')
		const alice = join(server, 'alice', mode)
		const bob = join(server, 'bob', mode)

		alice.store.put([privateNote])
		flush(alice, bob)
		expect(bob.store.get(noteId)).toBeUndefined()

		alice.store.update(noteId, (n) => ({ ...n, private: false }))
		flush(alice, bob)
		expect(bob.store.get(noteId)).toBeUndefined()
		reconnect(server, bob, mode)
		expect(bob.store.get(noteId)).toBeUndefined()
	})

	it('4. lose access: the client keeps a stale copy, also across a reconnect', () => {
		const server = makeRoom([privateNote])
		seesPrivate.add('alice')
		seesPrivate.add('bob')
		const alice = join(server, 'alice', mode)
		const bob = join(server, 'bob', mode)
		expect(bob.store.get(noteId)).toMatchObject({ text: 'secret' })

		seesPrivate.delete('bob')
		alice.store.update(noteId, (n) => ({ ...n, text: 'secret v2' }))
		flush(alice, bob)
		reconnect(server, bob, mode)
		expect(bob.store.get(noteId)).toMatchObject({ text: 'secret' })
	})

	it('5. a note made private by an edit: the client keeps the last public copy', () => {
		const server = makeRoom([{ ...privateNote, private: false, text: 'public' }])
		seesPrivate.add('alice')
		const alice = join(server, 'alice', mode)
		const bob = join(server, 'bob', mode)
		expect(bob.store.get(noteId)).toMatchObject({ text: 'public' })

		alice.store.update(noteId, (n) => ({ ...n, private: true, text: 'now private' }))
		flush(alice, bob)
		expect(bob.store.get(noteId)).toMatchObject({ text: 'public' })
	})

	it('6. deleting a hidden note sends its id to everyone (live and in reconnect tombstones)', () => {
		const server = makeRoom([privateNote])
		seesPrivate.add('alice')
		const alice = join(server, 'alice', mode)
		const bob = join(server, 'bob', mode)
		const carol = join(server, 'carol', mode)
		carol.pair.disconnect()

		alice.store.remove([noteId])
		flush(alice, bob)
		const live = bob.received.at(-1) as any
		expect(live.data[0].diff).toEqual({ [noteId]: [RecordOpType.Remove] })

		carol.pair.connect()
		wrapClientMessages(server, carol, mode)
		flush(carol)
		const connect = carol.received.at(-1) as any
		expect(connect.type).toBe('connect')
		expect(connect.diff[noteId]).toEqual([RecordOpType.Remove])
	})

	it('7. a hidden change still sends an empty patch with the new clock (timing leak)', () => {
		const server = makeRoom([privateNote])
		seesPrivate.add('alice')
		const alice = join(server, 'alice', mode)
		const bob = join(server, 'bob', mode)
		const before = bob.received.length

		alice.store.update(noteId, (n) => ({ ...n, text: 'v2' }))
		flush(alice, bob)
		const msg = bob.received[before] as any
		expect(msg.data[0]).toMatchObject({ type: 'patch', diff: {} })
		expect(msg.data[0].serverClock).toBeGreaterThan(1)
	})
})

describe('tracked filter (option A live + option B on connect)', () => {
	const mode = 'tracked'

	it('1. gain access while online: refreshVisibility sends the note', () => {
		const server = makeRoom([privateNote, box])
		const bob = join(server, 'bob', mode)
		expect(bob.store.get(noteId)).toBeUndefined()

		seesPrivate.add('bob')
		refreshVisibility(server, bob)
		expect(bob.store.get(noteId)).toEqual(privateNote)
	})

	it('1b. gain access while offline: the full snapshot on connect sends the note', () => {
		const server = makeRoom([privateNote, box])
		const bob = join(server, 'bob', mode)
		bob.pair.disconnect()
		seesPrivate.add('bob')
		bob.pair.connect()
		wrapClientMessages(server, bob, mode)
		flush(bob)
		expect(bob.store.get(noteId)).toEqual(privateNote)
		expect((bob.received.at(-1) as any).hydrationType).toBe('wipe_all')
	})

	it('2 and 3. a note shown by its own edit arrives as a put', () => {
		const server = makeRoom([])
		seesPrivate.add('alice')
		const alice = join(server, 'alice', mode)
		const bob = join(server, 'bob', mode)
		alice.store.put([privateNote])
		flush(alice, bob)
		alice.store.update(noteId, (n) => ({ ...n, private: false }))
		flush(alice, bob)
		expect(bob.store.get(noteId)).toEqual({ ...privateNote, private: false })
	})

	it('4. lose access while online: refreshVisibility removes the note', () => {
		const server = makeRoom([privateNote])
		seesPrivate.add('bob')
		const bob = join(server, 'bob', mode)
		seesPrivate.delete('bob')
		refreshVisibility(server, bob)
		expect(bob.store.get(noteId)).toBeUndefined()
	})

	it('4b. lose access while offline: wipe_all on connect removes the note, and offline edits to other records survive', () => {
		const server = makeRoom([privateNote, box])
		seesPrivate.add('bob')
		const bob = join(server, 'bob', mode)
		bob.pair.disconnect()
		seesPrivate.delete('bob')
		bob.store.put([{ ...box, x: 99 }])
		bob.pair.connect()
		wrapClientMessages(server, bob, mode)
		flush(bob)
		expect(bob.store.get(noteId)).toBeUndefined()
		expect(bob.store.get(boxId)).toMatchObject({ x: 99 })
		expect(stored(server, boxId)).toMatchObject({ x: 99 })
	})

	it('5. a note made private by an edit is removed from those who lose sight of it', () => {
		const server = makeRoom([{ ...privateNote, private: false, text: 'public' }])
		seesPrivate.add('alice')
		const alice = join(server, 'alice', mode)
		const bob = join(server, 'bob', mode)
		alice.store.update(noteId, (n) => ({ ...n, private: true }))
		flush(alice, bob)
		expect(bob.store.get(noteId)).toBeUndefined()
	})

	it('6. deleting a hidden note sends nothing to a session that never held it', () => {
		const server = makeRoom([privateNote])
		seesPrivate.add('alice')
		const alice = join(server, 'alice', mode)
		const bob = join(server, 'bob', mode)
		const before = bob.received.length
		alice.store.remove([noteId])
		flush(alice, bob)
		expect(bob.received.length).toBe(before)
	})

	it('7. a hidden change sends nothing, and the lagging clock is harmless', () => {
		const server = makeRoom([privateNote, box])
		seesPrivate.add('alice')
		const alice = join(server, 'alice', mode)
		const bob = join(server, 'bob', mode)
		const before = bob.received.length
		alice.store.update(noteId, (n) => ({ ...n, text: 'v2' }))
		flush(alice, bob)
		expect(bob.received.length).toBe(before)

		alice.store.put([{ ...box, x: 5 }])
		flush(alice, bob)
		expect(bob.store.get(boxId)).toMatchObject({ x: 5 })
		reconnect(server, bob, mode)
		expect(bob.store.get(boxId)).toMatchObject({ x: 5 })
		expect(bob.store.get(noteId)).toBeUndefined()
	})
})
