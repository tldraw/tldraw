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

function makeRoom(authorize: TLAuthorize<R, undefined>, documents: Doc[] = []) {
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

function connectClient(server: TestServer<R>, id: string, name = id) {
	const socketPair = new TestSocketPair<R>(id, server)
	socketPair.connect()
	const store = new Store<R>({ schema, props: {} })
	const presence = atom<Presence | null>('presence', PresenceType.create({ name, x: 0 }))
	const refusals: TLWriteRefusal[] = []
	const client = new TLSyncClient<R>({
		store,
		socket: socketPair.clientSocket,
		presence,
		presenceMode: atom('presenceMode', 'full' as const),
		onLoad: () => {},
		onSyncError: (reason) => {
			throw new Error(`unexpected sync error: ${reason}`)
		},
		onPushRefused: (refusal) => refusals.push(refusal),
	})
	disposables.push(() => client.close())
	return { socketPair, store, presence, refusals }
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

	it('stores an allowed push and gives the hook the net changes and before/after lookups', () => {
		const parent = DocType.create({ id: docId('parent'), owner: 'alice', parentId: null })
		const seen: Array<{
			changes: TLRecordChange<R>[]
			parentBefore: unknown
			childAfter: unknown
			sessionId: string
		}> = []
		const server = makeRoom(
			{
				write: (changes, { before, after, session }) => {
					seen.push({
						changes,
						parentBefore: before.get(parent.id),
						childAfter: after.get(docId('child')),
						sessionId: session.sessionId,
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
			sessionId: 'alice',
		})
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
			// bob sees alice's presence only when it is not hidden
			read: (record, session) =>
				!(session.sessionId === 'bob' && (record as Presence).name === 'alice' && hidden.get()),
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
