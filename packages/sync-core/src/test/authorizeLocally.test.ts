import { computed } from '@tldraw/state'
import {
	createShapeId,
	PageRecordType,
	TLFrameShape,
	TLPageId,
	TLRecord,
	TLShapeId,
	TLStore,
} from '@tldraw/tlschema'
import { IndexKey, isEqual } from '@tldraw/utils'
import { createTLSchema, createTLStore } from 'tldraw'
import { afterEach, describe, expect, it } from 'vitest'
import { TLSyncRefusal } from '../lib/protocol'
import { TLSyncClient } from '../lib/TLSyncClient'
import { perRecord, TLSyncAuthorizer, TLSyncTransform } from '../lib/TLSyncRoom'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

interface Meta {
	userId: string
	role: 'teacher' | 'student'
}

const schema = createTLSchema()

const pageA = PageRecordType.createId('a')
const pageB = PageRecordType.createId('b')

// A student writes only on their own page, and never inside a locked frame. Both are judged on
// the board before the push and after it, so a frame unlocked in the same push still counts.
const rule: TLSyncAuthorizer<TLRecord, Meta> = perRecord(
	({ record }, { session, before, after }) => {
		if (session.meta.role === 'teacher') return null
		if (record.typeName === 'page') return 'pages are the teacher’s'
		if (record.typeName !== 'shape') return null
		for (const get of [before, after]) {
			const self = get(record.id) as TLFrameShape | undefined
			if (!self) continue
			let parent = get(self.parentId)
			for (let depth = 0; parent?.typeName === 'shape'; depth++) {
				if (depth > 20) return 'parent cycle'
				if (parent.meta.locked) return 'frame is locked'
				parent = get(parent.parentId)
			}
			if (parent?.typeName !== 'page') return 'dangling parent'
			if (parent.meta.ownerId !== session.meta.userId) return 'not your page'
		}
		return null
	}
)

function page(id: TLPageId, ownerId: string): TLRecord {
	return PageRecordType.create({ id, name: ownerId, index: 'a1' as IndexKey, meta: { ownerId } })
}

function frame(id: TLShapeId, parentId: TLPageId | TLShapeId, locked = false): TLFrameShape {
	return schema.types.shape.create({
		id,
		type: 'frame',
		parentId,
		index: 'a1' as IndexKey,
		meta: locked ? { locked } : {},
		props: { w: 100, h: 100, name: '', color: 'black' },
	}) as TLFrameShape
}

const lockedOnA = createShapeId('locked-on-a')
const openOnA = createShapeId('open-on-a')
const inLocked = createShapeId('in-locked')
const inOpen = createShapeId('in-open')
const onB = createShapeId('on-b')

const board = () => [
	page(pageA, 'A'),
	page(pageB, 'B'),
	frame(lockedOnA, pageA, true),
	frame(openOnA, pageA),
	frame(inLocked, lockedOnA),
	frame(inOpen, openOnA),
	frame(onB, pageB),
]

const teacher: Meta = { userId: 'T', role: 'teacher' }
const studentA: Meta = { userId: 'A', role: 'student' }
const studentB: Meta = { userId: 'B', role: 'student' }

const disposables: Array<() => void> = []
afterEach(() => {
	for (const dispose of disposables) dispose()
	disposables.length = 0
})

interface Peer {
	store: TLStore
	pair: TestSocketPair<TLRecord>
	refusedLocally: TLSyncRefusal[]
	refusedByServer: TLSyncRefusal[]
}

function setup(
	room: {
		authorize?: TLSyncAuthorizer<TLRecord, Meta>
		transform?: TLSyncTransform<TLRecord, Meta>
	} = {}
) {
	const authorize = room.authorize ?? rule
	const server = new TestServer<TLRecord>(
		schema,
		{
			clock: 0,
			documentClock: 0,
			schema: schema.serialize(),
			documents: board().map((state) => ({ state, lastChangedClock: 0 })),
		},
		{ authorize, transform: room.transform }
	)
	const peers: Peer[] = []

	function join(
		id: string,
		meta: Meta,
		opts: { authorize?: false; undo?: 'transaction' | 'record'; transform?: boolean } = {}
	): Peer {
		const store = createTLStore({ schema, id })
		const pair = new TestSocketPair<TLRecord>(id, server)
		pair.connect = () => server.connect(pair, { meta })
		const peer: Peer = { store, pair, refusedLocally: [], refusedByServer: [] }
		const client = new TLSyncClient<TLRecord>({
			store,
			socket: pair.clientSocket,
			presence: computed('presence', () => null),
			onLoad: () => {},
			onSyncError: (reason) => {
				throw new Error('onSyncError: ' + reason)
			},
			onPushRefused: (refusal) => peer.refusedByServer.push(refusal),
			authorize:
				opts.authorize === false
					? undefined
					: {
							rule: authorize,
							transform: opts.transform === false ? undefined : room.transform,
							meta,
							undo: opts.undo,
							onRefusedLocally: (refusal) => peer.refusedLocally.push(refusal),
						},
		})
		disposables.push(() => client.close())
		peers.push(peer)
		pair.connect()
		settle()
		return peer
	}

	function settle() {
		for (let i = 0; i < 1000; i++) {
			server.flushDebouncingMessages()
			const busy = peers.filter((p) => p.pair.getNeedsFlushing())
			if (busy.length === 0) return
			for (const p of busy) {
				p.pair.flushClientSentEvents()
				p.pair.flushServerSentEvents()
			}
		}
		throw new Error('did not settle')
	}

	const onServer = (id: string) =>
		server.storage.getSnapshot().documents.find((d) => d.state.id === id)?.state as
			| TLFrameShape
			| undefined

	return { server, join, settle, onServer }
}

const move = (store: TLStore, id: TLShapeId, x: number) =>
	store.put([{ ...(store.get(id) as TLFrameShape), x }])
const xOf = (store: TLStore, id: TLShapeId) => (store.get(id) as TLFrameShape).x
const setLocked = (store: TLStore, id: TLShapeId, locked: boolean) =>
	store.put([{ ...(store.get(id) as TLFrameShape), meta: { locked } }])

describe('authorize on the client', () => {
	it('undoes a write the room would refuse, and sends nothing', () => {
		const { join, settle, onServer } = setup()
		const a = join('a', studentA)

		move(a.store, onB, 50)
		settle()

		expect(xOf(a.store, onB)).toBe(0)
		expect(onServer(onB)?.x).toBe(0)
		expect(a.refusedLocally).toMatchObject([{ reason: 'not your page', ids: [onB] }])
		expect(a.refusedByServer).toEqual([])
	})

	it('without it, the room refuses the same write', () => {
		const { join, settle } = setup()
		const a = join('a', studentA, { authorize: false })

		move(a.store, onB, 50)
		settle()

		expect(xOf(a.store, onB)).toBe(0)
		expect(a.refusedByServer).toMatchObject([{ reason: 'not your page' }])
	})

	it('allows unlocking a frame and then moving into it as separate pushes', () => {
		const { join, settle, onServer } = setup()
		const a = join('a', studentA)

		setLocked(a.store, lockedOnA, false)
		settle()
		move(a.store, inLocked, 50)
		settle()

		expect(onServer(inLocked)?.x).toBe(50)
		expect(a.refusedLocally).toEqual([])
		expect(a.refusedByServer).toEqual([])
	})

	it('refuses unlocking and moving in one transaction, as the room judges that push', () => {
		const { join, settle, onServer } = setup()
		const a = join('a', studentA)

		a.store.atomic(() => {
			setLocked(a.store, lockedOnA, false)
			move(a.store, inLocked, 50)
		})
		settle()

		expect((a.store.get(lockedOnA) as TLFrameShape).meta.locked).toBe(true)
		expect(onServer(lockedOnA)?.meta.locked).toBe(true)
		expect(a.refusedLocally).toMatchObject([{ reason: 'frame is locked' }])
		expect(a.refusedByServer).toEqual([])
	})

	it('judges offline transactions as the one push they will be replayed in', () => {
		const { join, settle, onServer } = setup()
		const a = join('a', studentA)

		a.pair.disconnect()
		setLocked(a.store, lockedOnA, false)
		// fine on its own, but replayed in one push with the unlock, the room reads the frame locked
		move(a.store, inLocked, 50)
		expect(xOf(a.store, inLocked)).toBe(0)

		a.pair.connect()
		settle()

		expect(onServer(lockedOnA)?.meta.locked).toBe(false)
		expect(onServer(inLocked)?.x).toBe(0)
		expect(a.refusedLocally).toMatchObject([{ reason: 'frame is locked' }])
		expect(a.refusedByServer).toEqual([])
	})

	it("with undo 'record', undoes only the refused records of a transaction", () => {
		const { join, settle, onServer } = setup()
		const a = join('a', studentA, { undo: 'record' })

		a.store.atomic(() => {
			move(a.store, inOpen, 50)
			move(a.store, onB, 50)
		})
		settle()

		expect(onServer(inOpen)?.x).toBe(50)
		expect(onServer(onB)?.x).toBe(0)
		expect(xOf(a.store, onB)).toBe(0)
		expect(a.refusedLocally).toMatchObject([{ ids: [onB] }])
		expect(a.refusedByServer).toEqual([])
	})

	it('rechecks offline changes against the board it reconnects to', () => {
		const { join, settle, onServer } = setup()
		const a = join('a', studentA, { undo: 'record' })
		const t = join('t', teacher)

		a.pair.disconnect()
		move(a.store, inOpen, 50)
		move(a.store, openOnA, 70)
		setLocked(t.store, openOnA, true)
		settle()

		a.pair.connect()
		settle()

		// the frame itself isn't inside a locked frame, so its move survives
		expect(onServer(openOnA)?.x).toBe(70)
		expect(onServer(inOpen)?.x).toBe(0)
		expect(xOf(a.store, inOpen)).toBe(0)
		expect(a.refusedLocally).toMatchObject([{ reason: 'frame is locked', ids: [inOpen] }])
		expect(a.refusedByServer).toEqual([])
	})

	it('forgets a transaction that rolled back', () => {
		const { join, settle, onServer } = setup()
		const a = join('a', studentA)

		expect(() =>
			a.store.atomic(() => {
				move(a.store, onB, 50)
				throw new Error('rolled back')
			})
		).toThrow()
		move(a.store, inOpen, 50)
		settle()

		expect(onServer(inOpen)?.x).toBe(50)
		expect(a.refusedLocally).toEqual([])
	})

	it("judges creates as the room's transform stamps them", () => {
		const stamped: TLSyncAuthorizer<TLRecord, Meta> = (args) =>
			args.changes.some(
				(c) => c.type === 'create' && c.next.meta.author !== args.session.meta.userId
			)
				? { reason: 'unstamped' }
				: rule(args)
		const room = {
			authorize: stamped,
			transform: ({ record, session }: { record: TLRecord; session: { meta: Meta } }) =>
				({ ...record, meta: { ...record.meta, author: session.meta.userId } }) as TLRecord,
		}
		const { join, settle, onServer } = setup(room)
		const a = join('a', studentA)
		const b = join('b', studentB, { transform: false })

		const fromA = createShapeId('from-a')
		const fromB = createShapeId('from-b')
		a.store.put([frame(fromA, pageA)])
		b.store.put([frame(fromB, pageB)])
		settle()

		expect(onServer(fromA)?.meta.author).toBe('A')
		// without the transform the client refuses what the room would allow
		expect(b.refusedLocally).toMatchObject([{ reason: 'unstamped' }])
	})
})

describe('authorize on the client, fuzzed', () => {
	function run(seed: number, authorize: false | undefined) {
		let state = seed
		const random = () => {
			// mulberry32
			state = (state + 0x6d2b79f5) | 0
			let t = Math.imul(state ^ (state >>> 15), 1 | state)
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296
		}
		const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)]

		const { join, settle, server } = setup()
		const peers = [
			join('t', teacher, { authorize }),
			join('a', studentA, { authorize, undo: random() < 0.5 ? 'record' : 'transaction' }),
			join('b', studentB, { authorize, undo: random() < 0.5 ? 'record' : 'transaction' }),
		]
		let created = 0

		const mutate = (store: TLStore) => {
			const shapes = store.query.records('shape').get() as TLFrameShape[]
			const parents: (TLPageId | TLShapeId)[] = [pageA, pageB, ...shapes.map((s) => s.id)]
			const shape = pick(shapes)
			const r = random()
			if (!shape || r < 0.2) {
				const id = createShapeId(`s${seed}-${created++}`)
				store.put([frame(id, pick(parents))])
			} else if (r < 0.45) {
				move(store, shape.id, Math.round(random() * 100))
			} else if (r < 0.65) {
				setLocked(store, shape.id, !shape.meta.locked)
			} else if (r < 0.8) {
				const parentId = pick(parents)
				if (parentId !== shape.id) store.put([{ ...shape, parentId }])
			} else if (r < 0.95) {
				if (!shapes.some((s) => s.parentId === shape.id)) store.remove([shape.id])
			} else {
				const p = store.get(pick([pageA, pageB]))!
				store.put([{ ...p, name: p.name + '!' }])
			}
		}

		for (let step = 0; step < 60; step++) {
			const peer = pick(peers)
			if (peer.pair.isConnected && random() < 0.15) peer.pair.disconnect()
			else if (!peer.pair.isConnected && random() < 0.5) peer.pair.connect()
			for (let i = 1 + Math.floor(random() * 3); i > 0; i--) {
				const n = 1 + Math.floor(random() * 3)
				peer.store.atomic(() => {
					for (let j = 0; j < n; j++) mutate(peer.store)
				})
			}
			settle()
		}
		// one at a time: two offline writers replaying at once can race, and only the room can settle that
		for (const peer of peers) {
			if (peer.pair.isConnected) continue
			peer.pair.connect()
			settle()
		}

		const docs = (store: TLStore) =>
			Object.fromEntries(Object.values(store.serialize('document')).map((r) => [r.id, r] as const))
		const onServer = Object.fromEntries(
			server.storage.getSnapshot().documents.map((d) => [d.state.id, d.state] as const)
		)
		return {
			refusedByServer: peers.flatMap((p) => p.refusedByServer),
			refusedLocally: peers.flatMap((p) => p.refusedLocally),
			diverged: peers.flatMap((p) => {
				const local = docs(p.store)
				const ids = new Set([...Object.keys(local), ...Object.keys(onServer)])
				return [...ids].filter((id) => !isEqual(local[id], onServer[id]))
			}),
		}
	}

	it('never sends a push the room refuses, and converges', () => {
		let refusedLocally = 0
		for (let seed = 1; seed <= 100; seed++) {
			const result = run(seed, undefined)
			expect(result.refusedByServer, `seed ${seed}`).toEqual([])
			expect(result.diverged, `seed ${seed}`).toEqual([])
			refusedLocally += result.refusedLocally.length
		}
		expect(refusedLocally).toBeGreaterThan(0)
	})

	it('without it, the same runs are refused by the room', () => {
		let refusedByServer = 0
		for (let seed = 1; seed <= 25; seed++)
			refusedByServer += run(seed, false).refusedByServer.length
		expect(refusedByServer).toBeGreaterThan(0)
	})
})
