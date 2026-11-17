import { atom } from '@tldraw/state'
import { BaseRecord, RecordId, Store, StoreSchema, createRecordType } from '@tldraw/store'
import type { TLAuthorize, TLRecordChange, TLWriteRefusal } from '@tldraw/tlschema'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TLSyncClient } from '../lib/TLSyncClient'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

interface Doc extends BaseRecord<'doc', RecordId<Doc>> {
	owner: string
	parentId: RecordId<Doc> | null
}
const DocType = createRecordType<Doc>('doc', {
	scope: 'document',
	validator: { validate: (value) => value as Doc },
})

interface Presence extends BaseRecord<'presence', RecordId<Presence>> {
	name: string
	x: number
}
const PresenceType = createRecordType<Presence>('presence', {
	scope: 'presence',
	validator: { validate: (value) => value as Presence },
})

type R = Doc | Presence
const schema = StoreSchema.create<R>({ doc: DocType, presence: PresenceType })

const disposables: Array<() => void> = []
afterEach(() => {
	while (disposables.length) disposables.pop()!()
})

function makeRoom(authorize: TLAuthorize<R>, documents: Doc[] = []) {
	return new TestServer<R>(
		schema,
		{
			documents: documents.map((state) => ({ state, lastChangedClock: 0 })),
			clock: 0,
			documentClock: 0,
			schema: schema.serialize(),
		},
		{ authorize }
	)
}

function connectClient(
	server: TestServer<R>,
	id: string,
	name = id,
	onPushRefused?: (refusal: TLWriteRefusal) => void
) {
	const socketPair = new TestSocketPair<R>(id, server)
	socketPair.connect()
	const store = new Store<R>({ schema, props: {} })
	const presence = atom<Presence | null>('presence', PresenceType.create({ name, x: 0 }))
	const refusals: TLWriteRefusal[] = []
	const connected: { userId?: string | null } = {}
	const client = new TLSyncClient<R>({
		store,
		socket: socketPair.clientSocket,
		presence,
		presenceMode: atom('presenceMode', 'full' as const),
		onLoad: () => {},
		onSyncError: (reason) => {
			throw new Error(`unexpected sync error: ${reason}`)
		},
		onAfterConnect: (_, { userId }) => {
			connected.userId = userId
		},
		onPushRefused: onPushRefused ?? ((refusal) => refusals.push(refusal)),
	})
	disposables.push(() => client.close())
	return { socketPair, store, presence, refusals, connected }
}

function flush(server: TestServer<R>, ...pairs: TestSocketPair<R>[]) {
	for (let i = 0; i < 20; i++) {
		server.flushDebouncingMessages()
		if (!pairs.some((p) => p.getNeedsFlushing())) return
		for (const p of pairs) {
			p.flushClientSentEvents()
			server.flushDebouncingMessages()
			p.flushServerSentEvents()
		}
	}
}

const docId = (name: string) => DocType.createId(name)

function getDoc(server: TestServer<R>, id: string) {
	return server.storage.getSnapshot().documents.find((d) => d.state.id === id)?.state
}

describe('identity', () => {
	it('sends the session user id in the connect reply', () => {
		const server = makeRoom({})
		const alice = connectClient(server, 'alice')
		flush(server, alice.socketPair)
		expect(alice.connected.userId).toBe('alice')
	})
})

describe('authorize.write in the room', () => {
	it('refuses the whole push, stores none of it, and tells the client why', () => {
		const server = makeRoom({
			write: (changes) =>
				changes.some(
					(c) => (c.next ?? c.prev).typeName === 'doc' && (c.next as Doc)?.owner === 'bob'
				)
					? { reason: 'not-yours' }
					: null,
		})
		const alice = connectClient(server, 'alice')
		flush(server, alice.socketPair)

		alice.store.put([
			DocType.create({ id: docId('a'), owner: 'alice', parentId: null }),
			DocType.create({ id: docId('b'), owner: 'bob', parentId: null }),
		])
		flush(server, alice.socketPair)

		expect(server.storage.getSnapshot().documents.map((d) => d.state.id)).toEqual([])
		expect(alice.store.get(docId('a'))).toBeUndefined()
		expect(alice.store.get(docId('b'))).toBeUndefined()
		expect(alice.refusals).toEqual([{ reason: 'not-yours' }])
	})

	it('keeps the connection when onPushRefused throws', () => {
		const server = makeRoom({ write: () => ({ reason: 'no' }) })
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const alice = connectClient(server, 'alice', 'alice', () => {
			throw new Error('host bug')
		})
		flush(server, alice.socketPair)
		alice.store.put([DocType.create({ id: docId('a'), owner: 'alice', parentId: null })])
		flush(server, alice.socketPair)
		error.mockRestore()
		expect(alice.store.get(docId('a'))).toBeUndefined()
		expect(alice.socketPair.isConnected).toBe(true)
	})

	it('stores an allowed push and gives the hook the net changes and before/after lookups', () => {
		const parent = DocType.create({ id: docId('parent'), owner: 'alice', parentId: null })
		const seen: Array<{
			changes: TLRecordChange<R>[]
			parentBefore: unknown
			childAfter: unknown
			userId: string | null
		}> = []
		const server = makeRoom(
			{
				write: (changes, { before, after, userId }) => {
					seen.push({
						changes,
						parentBefore: before.get(parent.id),
						childAfter: after.get(docId('child')),
						userId,
					})
					return null
				},
			},
			[parent]
		)
		const alice = connectClient(server, 'alice')
		flush(server, alice.socketPair)

		alice.store.put([DocType.create({ id: docId('child'), owner: 'alice', parentId: parent.id })])
		alice.store.update(parent.id, (p) => ({ ...p, owner: 'carol' }))
		flush(server, alice.socketPair)

		expect(getDoc(server, docId('child'))).toMatchObject({ parentId: parent.id })
		expect(alice.refusals).toEqual([])
		// each push is judged on its own
		const types = seen.flatMap((s) => s.changes.map((c) => `${c.type}:${c.id}`))
		expect(types).toEqual(['create:doc:child', 'update:doc:parent'])
		expect(seen[0]).toMatchObject({
			parentBefore: parent,
			childAfter: { id: docId('child'), parentId: parent.id },
			userId: 'alice',
		})
	})

	it('gives the hook ctx.can, which is authorize.can for the session user', () => {
		const server = makeRoom({
			can: (_permission, _data, { userId }) => userId === 'alice',
			write: (_changes, ctx) => (ctx.can('tl:shape:create') ? null : { reason: 'cannot' }),
		})
		const alice = connectClient(server, 'alice')
		const bob = connectClient(server, 'bob')
		flush(server, alice.socketPair, bob.socketPair)

		alice.store.put([DocType.create({ id: docId('a'), owner: 'alice', parentId: null })])
		bob.store.put([DocType.create({ id: docId('b'), owner: 'bob', parentId: null })])
		flush(server, alice.socketPair, bob.socketPair)

		expect(getDoc(server, docId('a'))).toBeDefined()
		expect(getDoc(server, docId('b'))).toBeUndefined()
		expect(bob.refusals).toEqual([{ reason: 'cannot' }])
	})

	it('allows everything through ctx.can when there is no can hook', () => {
		const server = makeRoom({
			write: (_changes, ctx) => (ctx.can('tl:shape:create') ? null : { reason: 'cannot' }),
		})
		const alice = connectClient(server, 'alice')
		flush(server, alice.socketPair)
		alice.store.put([DocType.create({ id: docId('a'), owner: 'alice', parentId: null })])
		flush(server, alice.socketPair)
		expect(getDoc(server, docId('a'))).toBeDefined()
	})

	it('refuses the push when the hook throws', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const server = makeRoom({
			write: () => {
				throw new Error('boom')
			},
		})
		const alice = connectClient(server, 'alice')
		flush(server, alice.socketPair)
		alice.store.put([DocType.create({ id: docId('a'), owner: 'alice', parentId: null })])
		flush(server, alice.socketPair)
		error.mockRestore()

		expect(getDoc(server, docId('a'))).toBeUndefined()
		expect(alice.refusals).toEqual([{ reason: 'error' }])
	})

	it('does not judge presence', () => {
		const write = vi.fn(() => ({ reason: 'never' }))
		const server = makeRoom({ write })
		const alice = connectClient(server, 'alice')
		const bob = connectClient(server, 'bob')
		flush(server, alice.socketPair, bob.socketPair)

		expect(write).not.toHaveBeenCalled()
		expect(
			bob.store.query
				.records('presence')
				.get()
				.map((p) => p.name)
		).toEqual(['alice'])
	})
})

describe('authorize.read in the room', () => {
	it('hides presence records, and sends or removes them when visibility changes', () => {
		// the hook reads app state that the room doesn't track, so a change shows on the next update
		const hidden = atom('hidden', true)
		const server = makeRoom({
			// bob sees alice's presence only when `can` allows it, through ctx.can
			can: (_permission, _data, { userId }) => userId !== 'bob' || !hidden.get(),
			read: (record, { can }) => (record as Presence).name !== 'alice' || can('tl:shape:create'),
		})
		const alice = connectClient(server, 'alice')
		const bob = connectClient(server, 'bob')
		flush(server, alice.socketPair, bob.socketPair)

		const names = (c: typeof bob) =>
			c.store.query
				.records('presence')
				.get()
				.map((p) => p.name)
		expect(names(bob)).toEqual([])
		expect(names(alice)).toEqual(['bob'])

		// a hidden record becomes visible on its next change
		hidden.set(false)
		const move = () => alice.presence.update((p) => ({ ...p!, x: p!.x + 1 }))
		move()
		flush(server, alice.socketPair, bob.socketPair)
		expect(names(bob)).toEqual(['alice'])

		// and a visible one that becomes hidden is removed
		hidden.set(true)
		move()
		flush(server, alice.socketPair, bob.socketPair)
		expect(names(bob)).toEqual([])
	})
})

describe('authorize.write for server writes', () => {
	const ownerOnly: TLAuthorize<R> = {
		write: (changes, { userId }) =>
			changes.some((c) => ((c.prev ?? c.next) as Doc).owner !== userId)
				? { reason: 'not-yours' }
				: null,
	}
	const storedIds = (server: TestServer<R>) =>
		server.storage.getSnapshot().documents.map((d) => d.state.id)

	it('refuses a transaction as a user and stores none of it', () => {
		const bobs = DocType.create({ id: docId('bobs'), owner: 'bob', parentId: null })
		const server = makeRoom(ownerOnly, [bobs])

		const refusal = server.room.writeAs('alice', (txn) => {
			txn.set(docId('a'), DocType.create({ id: docId('a'), owner: 'alice', parentId: null }))
			txn.delete(bobs.id)
		})

		expect(refusal).toEqual({ reason: 'not-yours' })
		expect(storedIds(server)).toEqual([bobs.id])
	})

	it('stores an allowed transaction and sends it to connected clients', async () => {
		const server = makeRoom(ownerOnly)
		const bob = connectClient(server, 'bob')
		flush(server, bob.socketPair)

		const doc = DocType.create({ id: docId('a'), owner: 'alice', parentId: null })
		const refusal = server.room.writeAs('alice', (txn) => {
			txn.set(doc.id, doc)
			// reads see the transaction's own writes
			expect(txn.get(doc.id)).toEqual(doc)
		})
		await Promise.resolve() // storage notifies the room on a microtask
		flush(server, bob.socketPair)

		expect(refusal).toBeNull()
		expect(storedIds(server)).toEqual([doc.id])
		expect(bob.store.get(doc.id)).toEqual(doc)
	})

	it('judges a null user id as a guest', () => {
		const write = vi.fn<NonNullable<TLAuthorize<R>['write']>>(() => ({ reason: 'sign-in' }))
		const server = makeRoom({ write })

		const refusal = server.room.writeAs(null, (txn) =>
			txn.set(docId('a'), DocType.create({ id: docId('a'), owner: 'alice', parentId: null }))
		)

		expect(refusal).toEqual({ reason: 'sign-in' })
		expect(write.mock.calls[0][1].userId).toBeNull()
	})

	it('refuses the transaction when the hook throws', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		const server = makeRoom({
			write: () => {
				throw new Error('rule bug')
			},
		})

		const refusal = server.room.writeAs('alice', (txn) =>
			txn.set(docId('a'), DocType.create({ id: docId('a'), owner: 'alice', parentId: null }))
		)
		error.mockRestore()

		expect(refusal).toEqual({ reason: 'error' })
		expect(storedIds(server)).toEqual([])
	})

	it('stores the transaction when the room has no write hook', () => {
		const server = makeRoom({})

		const refusal = server.room.writeAs('alice', (txn) =>
			txn.set(docId('a'), DocType.create({ id: docId('a'), owner: 'alice', parentId: null }))
		)

		expect(refusal).toBeNull()
		expect(storedIds(server)).toEqual([docId('a')])
	})

	it('leaves storage.transaction unchecked', () => {
		const server = makeRoom({ write: () => ({ reason: 'no' }) })

		server.storage.transaction((txn) =>
			txn.set(docId('a'), DocType.create({ id: docId('a'), owner: 'alice', parentId: null }))
		)

		expect(storedIds(server)).toEqual([docId('a')])
	})
})
