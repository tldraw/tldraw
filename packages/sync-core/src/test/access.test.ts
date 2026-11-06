import { atom, computed } from '@tldraw/state'
import { Store } from '@tldraw/store'
import {
	AccessEntry,
	DocumentRecordType,
	InstancePresenceRecordType,
	PageRecordType,
	SessionAccess,
	TLDOCUMENT_ID,
	TLRecord,
	TL_ACCESS_ROOT,
	accessSchemaRecords,
	createAccessEntry,
	createTLAccessModel,
	createTLSchema,
} from '@tldraw/tlschema'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecordOpType, ValueOpType } from '../lib/diff'
import { getTlsyncProtocolVersion } from '../lib/protocol'
import { SessionStateSnapshot, TLSocketRoom } from '../lib/TLSocketRoom'
import { TLSyncClient } from '../lib/TLSyncClient'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

// End to end: a TLSyncRoom with an access model, and raw TLSyncClients. The clients run no write
// guard, so every check here is the server's own: a client that skips the UI (or is hostile)
// cannot get past it.

const schema = createTLSchema({
	shapes: { box: { props: { w: { validate: (v: unknown) => v as number } } } },
	bindings: { link: { props: {} } },
	records: accessSchemaRecords,
})

const model = createTLAccessModel<TLRecord>({
	roles: { student: ['viewer', 'comment', 'create'], teacher: ['admin'] },
	entries: [
		{
			resource: TL_ACCESS_ROOT,
			subject: { type: 'relation', relation: 'owner' },
			effect: 'allow',
			verbs: ['update', 'delete'],
		},
	],
})

let index = 0
const box = (id: string, parentId: string, ownerId: string | null): any => ({
	id: `shape:${id}`,
	typeName: 'shape',
	type: 'box',
	x: 0,
	y: 0,
	rotation: 0,
	index: `a${++index}`,
	parentId,
	isLocked: false,
	opacity: 1,
	props: { w: 10 },
	meta: ownerId ? { ownerId } : {},
})

const entry = (e: Omit<AccessEntry, 'verbs'> & { verbs: string[]; id?: string }) =>
	createAccessEntry({ ...e, id: e.id ? (`access:${e.id}` as any) : undefined }) as any

// document
// ├── page:a ── shape:tess (tess), shape:bob (bob), shape:card (block: only ann reads it)
// ├── page:team (block: only group "team") ── shape:secret (tess)
// └── binding:l  (from shape:tess to shape:secret: hidden from anyone who cannot see the secret)
function seed() {
	index = 0
	return [
		DocumentRecordType.create({ id: TLDOCUMENT_ID }),
		PageRecordType.create({ id: 'page:a' as any, name: 'A', index: 'a1' as any }),
		PageRecordType.create({ id: 'page:team' as any, name: 'Team', index: 'a2' as any }),
		box('tess', 'page:a', 'tess'),
		box('bob', 'page:a', 'bob'),
		box('card', 'page:a', 'tess'),
		box('secret', 'page:team', 'tess'),
		{
			id: 'binding:l',
			typeName: 'binding',
			type: 'link',
			fromId: 'shape:tess',
			toId: 'shape:secret',
			props: {},
			meta: {},
		},
		entry({
			id: 'teamBlock',
			resource: 'page:team',
			subject: { type: 'anyone' },
			effect: 'block',
			verbs: ['admin'],
		}),
		entry({
			id: 'team',
			resource: 'page:team',
			subject: { type: 'group', id: 'team' },
			effect: 'allow',
			verbs: ['admin'],
		}),
		entry({
			id: 'cardBlock',
			resource: 'shape:card',
			subject: { type: 'anyone' },
			effect: 'block',
			verbs: ['read'],
		}),
		entry({
			id: 'cardAnn',
			resource: 'shape:card',
			subject: { type: 'user', id: 'ann' },
			effect: 'allow',
			verbs: ['read'],
		}),
		entry({
			id: 'cardDealer',
			resource: 'shape:card',
			subject: { type: 'user', id: 'tess' },
			effect: 'allow',
			verbs: ['admin'],
		}),
	] as TLRecord[]
}

const onRoot = (verbs: string[]): AccessEntry => ({
	resource: TL_ACCESS_ROOT,
	subject: { type: 'anyone' },
	effect: 'allow',
	verbs,
})
const as = (id: string, verbs: string[], groups: string[] = []): SessionAccess => ({
	actor: { id, groups },
	entries: [onRoot(verbs)],
})

let server: TestServer<TLRecord>
const pairs: TestSocketPair<TLRecord>[] = []
const clients: TLSyncClient<TLRecord>[] = []

function makeServer(records = seed()) {
	server = new TestServer<TLRecord>(
		schema,
		{
			documents: records.map((state) => ({ state, lastChangedClock: 0 })),
			clock: 0,
			documentClock: 0,
			schema: schema.serialize(),
		},
		{ access: model }
	)
}

function flush() {
	for (let i = 0; i < 20; i++) {
		server.flushDebouncingMessages()
		let busy = false
		for (const pair of pairs) {
			if (!pair.getNeedsFlushing()) continue
			busy = true
			pair.flushClientSentEvents()
			pair.flushServerSentEvents()
		}
		if (!busy) return
	}
	throw new Error('did not settle')
}

function join(name: string, access: SessionAccess, presence: TLRecord | null = null) {
	const pair = new TestSocketPair<TLRecord>(name, server)
	pair.access = access
	pair.connect()
	const store = new Store<TLRecord, any>({ schema, props: {} })
	const accessUpdates: SessionAccess[] = []
	let connectedWith: SessionAccess | null = null
	const client = new TLSyncClient<TLRecord>({
		store,
		socket: pair.clientSocket,
		presence: computed('presence', () => presence),
		onLoad: () => {},
		onSyncError: (reason) => {
			throw new Error(`sync error: ${reason}`)
		},
		onAfterConnect: (_, { access }) => (connectedWith = access),
		onAccessChange: (a) => accessUpdates.push(a),
	})
	pairs.push(pair)
	clients.push(client)
	flush()
	const ids = () =>
		store
			.allRecords()
			.filter((r) => store.scopedTypes.document.has(r.typeName))
			.map((r) => r.id)
			.sort()
	return { pair, store, client, ids, accessUpdates, connectedWith: () => connectedWith }
}

const serverRecord = (id: string) => server.storage.transaction((txn) => txn.get(id)).result as any

afterEach(() => {
	for (const client of clients.splice(0)) client.close()
	pairs.splice(0)
})

describe('read: each session gets only what it may read', () => {
	it('hides a private page, its shapes, a binding into it, a hidden card, and other people’s entries', () => {
		makeServer()
		const bob = join('bob', as('bob', ['editor']))
		// entries on what bob cannot read stay hidden too: he needs none of them to run the model
		expect(bob.ids()).toEqual(['document:document', 'page:a', 'shape:bob', 'shape:tess'])
		const ann = join('ann', as('ann', ['editor'], ['team']))
		expect(ann.ids()).toEqual([
			'access:cardAnn',
			'access:cardBlock',
			'access:team',
			'access:teamBlock',
			'binding:l',
			'document:document',
			'page:a',
			'page:team',
			'shape:bob',
			'shape:card',
			'shape:secret',
			'shape:tess',
		])
		expect(bob.connectedWith()).toEqual(as('bob', ['editor']))
	})

	it('reveal: deleting a block sends the record; adding it back removes it', () => {
		makeServer()
		const bob = join('bob', as('bob', ['viewer']))
		const tess = join('tess', as('tess', ['teacher'], ['team']))
		expect(bob.store.get('shape:card' as any)).toBeUndefined()

		tess.store.remove(['access:cardBlock' as any])
		flush()
		expect(bob.store.get('shape:card' as any)).toMatchObject({ id: 'shape:card' })

		tess.store.put([
			entry({
				id: 'cardBlock2',
				resource: 'shape:card',
				subject: { type: 'anyone' },
				effect: 'block',
				verbs: ['read'],
			}),
		])
		flush()
		expect(bob.store.get('shape:card' as any)).toBeUndefined()
	})

	it('share: an allow entry for one user sends the page and its shapes; deleting it removes them', () => {
		makeServer()
		const bob = join('bob', as('bob', ['editor']))
		const tess = join('tess', as('tess', ['teacher'], ['team']))
		expect(bob.store.get('page:team' as any)).toBeUndefined()

		tess.store.put([
			entry({
				id: 'bob',
				resource: 'page:team',
				subject: { type: 'user', id: 'bob' },
				effect: 'allow',
				verbs: ['viewer'],
			}),
		])
		flush()
		expect(tess.store.get('access:bob' as any)).toBeDefined()
		expect(bob.store.get('page:team' as any)).toMatchObject({ id: 'page:team' })
		expect(bob.store.get('shape:secret' as any)).toMatchObject({ id: 'shape:secret' })

		tess.store.remove(['access:bob' as any])
		flush()
		expect(bob.store.get('page:team' as any)).toBeUndefined()
		expect(bob.store.get('shape:secret' as any)).toBeUndefined()
	})

	it('presence names only the shapes you may read', async () => {
		makeServer()
		const tessPresence = atom<TLRecord>(
			'tess presence',
			InstancePresenceRecordType.create({
				id: InstancePresenceRecordType.createId('tess'),
				userId: 'user:tess' as any,
				userName: 'Tess',
				currentPageId: 'page:a' as any,
				selectedShapeIds: ['shape:card', 'shape:tess'] as any,
			})
		)
		// tess joins with a presence that selects the hidden card
		{
			const pair = new TestSocketPair<TLRecord>('tess', server)
			pair.access = as('tess', ['teacher'], ['team'])
			pair.connect()
			const store = new Store<TLRecord, any>({ schema, props: {} })
			clients.push(
				new TLSyncClient<TLRecord>({
					store,
					socket: pair.clientSocket,
					presence: computed('presence', () => tessPresence.get()),
					presenceMode: atom('presence mode', 'full' as const),
					onLoad: () => {},
					onSyncError: (reason) => {
						throw new Error(`sync error: ${reason}`)
					},
					onAccessChange: () => {},
				})
			)
			pairs.push(pair)
			flush()
		}
		const bob = join('bob', as('bob', ['viewer']))
		const ann = join('ann', as('ann', ['viewer']))
		flush()
		const presenceIn = (store: Store<TLRecord, any>) =>
			store.allRecords().find((r) => r.typeName === 'instance_presence') as any
		// bob may not read the card; ann holds it
		expect(presenceIn(bob.store).selectedShapeIds).toEqual(['shape:tess'])
		expect(presenceIn(ann.store).selectedShapeIds).toEqual(['shape:card', 'shape:tess'])
		// and on later presence updates
		tessPresence.update((p: any) => ({ ...p, selectedShapeIds: ['shape:card'] }))
		// presence pushes are frame-throttled
		await new Promise((resolve) => setTimeout(resolve, 100))
		flush()
		expect(presenceIn(ann.store).selectedShapeIds).toEqual(['shape:card'])
		expect(presenceIn(bob.store).selectedShapeIds).toEqual([])
		// the card is shown to bob: tess's selection is sent to him again, now with the card
		const showBob = entry({
			id: 'cardBob',
			resource: 'shape:card',
			subject: { type: 'user', id: 'bob' },
			effect: 'allow',
			verbs: ['read'],
		})
		server.storage.transaction((txn) => txn.set(showBob.id, showBob))
		await new Promise((resolve) => setTimeout(resolve, 0))
		flush()
		expect(bob.store.get('shape:card' as any)).toBeDefined()
		expect(presenceIn(bob.store).selectedShapeIds).toEqual(['shape:card'])
	})

	it('a custom relation that looks at another record: a change there updates what each person sees', async () => {
		// "members" of page:a may read the team page
		const withMembers = createTLAccessModel<TLRecord>({
			relations: {
				member: (actor, _leaf, view) =>
					((view.get('page:a') as any)?.meta?.members ?? []).includes(actor.id),
			},
			entries: [
				{
					resource: 'page:team',
					subject: { type: 'relation', relation: 'member' },
					effect: 'allow',
					verbs: ['admin'],
				},
			],
		})
		server = new TestServer<TLRecord>(
			schema,
			{
				documents: seed().map((state) => ({ state, lastChangedClock: 0 })),
				clock: 0,
				documentClock: 0,
				schema: schema.serialize(),
			},
			{ access: withMembers }
		)
		const bob = join('bob', as('bob', ['viewer']))
		expect(bob.store.get('page:team' as any)).toBeUndefined()
		server.storage.transaction((txn) =>
			txn.set('page:a', { ...(txn.get('page:a') as any), meta: { members: ['bob'] } })
		)
		await new Promise((resolve) => setTimeout(resolve, 0))
		flush()
		expect(bob.store.get('page:team' as any)).toBeDefined()
	})

	it('a shape moved into a page you cannot read disappears for you', () => {
		makeServer()
		const bob = join('bob', as('bob', ['viewer']))
		const tess = join('tess', as('tess', ['teacher'], ['team']))
		tess.store.update('shape:tess' as any, (s) => ({ ...s, parentId: 'page:team' as any }))
		flush()
		expect(bob.store.get('shape:tess' as any)).toBeUndefined()
		tess.store.update('shape:tess' as any, (s) => ({ ...s, parentId: 'page:a' as any }))
		flush()
		expect(bob.store.get('shape:tess' as any)).toMatchObject({ parentId: 'page:a' })
	})

	it('a server-side delete of a page takes its shapes too, since nothing above them is readable', async () => {
		// a second page bob may read, so his store stays usable without page:a
		makeServer([
			...seed(),
			PageRecordType.create({ id: 'page:b' as any, name: 'B', index: 'a3' as any }),
		])
		const bob = join('bob', as('bob', ['viewer']))
		expect(bob.store.get('shape:bob' as any)).toBeDefined()
		server.storage.transaction((txn) => txn.delete('page:a'))
		await new Promise((resolve) => setTimeout(resolve, 0))
		flush()
		expect(bob.store.get('shape:bob' as any)).toBeUndefined()
		expect(server.room.sessions.get('bob')!.visible!.has('shape:bob')).toBe(false)
	})

	it('a change checks only what it can affect: its subtree and the records that alsoRead it', async () => {
		makeServer()
		const bob = join('bob', as('bob', ['viewer']))
		const read = vi.spyOn(model, 'reader')
		const decide = vi.spyOn(model, 'decide')
		server.storage.transaction((txn) =>
			txn.set('shape:bob', { ...(txn.get('shape:bob') as any), x: 3 })
		)
		await new Promise((resolve) => setTimeout(resolve, 0))
		flush()
		expect(bob.store.get('shape:bob' as any)).toMatchObject({ x: 3 })
		// shape:bob, then page:a and the root once each: not every record in the room
		expect(decide.mock.calls.filter(([, verb]) => verb === 'read').length).toBeLessThanOrEqual(3)
		read.mockRestore()
		decide.mockRestore()
	})
})

describe('write: the server checks each push as a whole', () => {
	it('rejects the whole push when one record is denied, and the client rolls back', () => {
		makeServer()
		const bob = join('bob', as('bob', ['student']))
		bob.store.put([
			{ ...serverRecord('shape:bob'), x: 100 },
			{ ...serverRecord('shape:tess'), x: 100 },
		])
		flush()
		expect(serverRecord('shape:bob').x).toBe(0)
		expect(serverRecord('shape:tess').x).toBe(0)
		expect(bob.store.get('shape:bob' as any)!).toMatchObject({ x: 0 })
		expect(bob.store.get('shape:tess' as any)!).toMatchObject({ x: 0 })

		bob.store.put([{ ...serverRecord('shape:bob'), x: 100 }])
		flush()
		expect(serverRecord('shape:bob').x).toBe(100)
	})

	it('stamps the owner on create, whatever the client sent, and keeps it on update', () => {
		makeServer()
		const bob = join('bob', as('bob', ['student']))
		bob.store.put([box('forged', 'page:a', 'tess')])
		flush()
		expect(serverRecord('shape:forged').meta).toEqual({ ownerId: 'bob' })
		expect((bob.store.get('shape:forged' as any) as any).meta).toEqual({ ownerId: 'bob' })

		bob.store.update('shape:forged' as any, (s) => ({ ...s, meta: { ownerId: 'tess' } }))
		flush()
		expect(serverRecord('shape:forged').meta).toEqual({ ownerId: 'bob' })
	})

	it('cannot write a record it cannot read, even by guessing its id', () => {
		makeServer()
		const bob = join('bob', as('bob', ['admin']))
		bob.store.put([{ ...box('secret', 'page:team', 'bob') }])
		flush()
		expect(serverRecord('shape:secret').meta).toEqual({ ownerId: 'tess' })
	})

	it('entry writes need manage, and an allow cannot give more than the writer has', () => {
		makeServer()
		const bob = join('bob', as('bob', ['editor']))
		bob.store.put([
			entry({
				id: 'mine',
				resource: 'page:a',
				subject: { type: 'user', id: 'bob' },
				effect: 'allow',
				verbs: ['admin'],
			}),
		])
		flush()
		expect(serverRecord('access:mine')).toBeUndefined()
		expect(bob.store.get('access:mine' as any)).toBeUndefined()
	})
})

describe('live access changes', () => {
	it('the teacher calls on a student: new access, new records, new rights, with no reconnect', () => {
		makeServer()
		const bob = join('bob', as('bob', ['viewer']))
		bob.store.put([{ ...serverRecord('shape:tess'), x: 5 }])
		flush()
		expect(serverRecord('shape:tess').x).toBe(0)

		server.room.updateSessionAccess('bob', as('bob', ['editor'], ['team']))
		flush()
		expect(bob.accessUpdates).toEqual([as('bob', ['editor'], ['team'])])
		expect(bob.store.get('shape:secret' as any)).toBeDefined()
		bob.store.put([{ ...serverRecord('shape:tess'), x: 5 }])
		flush()
		expect(serverRecord('shape:tess').x).toBe(5)

		server.room.updateSessionAccess('bob', as('bob', ['viewer']))
		flush()
		expect(bob.store.get('shape:secret' as any)).toBeUndefined()
		bob.store.put([{ ...serverRecord('shape:tess'), x: 9 }])
		flush()
		expect(serverRecord('shape:tess').x).toBe(5)
	})
})

describe('protocol', () => {
	it('a room with a model rejects protocol 8 clients, which cannot read access messages', () => {
		makeServer()
		const pair = new TestSocketPair<TLRecord>('old', server)
		pair.access = as('old', ['viewer'])
		pair.connect()
		server.room.handleMessage('old', {
			type: 'connect',
			connectRequestId: 'x',
			lastServerClock: 0,
			protocolVersion: getTlsyncProtocolVersion() - 1,
			schema: schema.serialize(),
		})
		expect(server.room.sessions.get('old')).toBeUndefined()
	})

	it('needs access for every session', () => {
		makeServer()
		const pair = new TestSocketPair<TLRecord>('nobody', server)
		expect(() => pair.connect()).toThrow(/needs `access`/)
	})
})

describe('hibernation', () => {
	const socket = () =>
		({
			send: vi.fn(),
			close: vi.fn(),
			readyState: 1,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}) as any
	const snapshots = new Map<string, SessionStateSnapshot>()
	const makeRoom = () =>
		new TLSocketRoom<TLRecord>({
			schema,
			access: model,
			initialSnapshot: {
				documents: seed().map((state) => ({ state, lastChangedClock: 0 })),
				clock: 0,
				documentClock: 0,
				schema: schema.serialize(),
			},
			onSessionSnapshot: (id, snapshot) => snapshots.set(id, snapshot),
		})
	const connect = (room: TLSocketRoom<TLRecord>, sessionId: string, access: SessionAccess) => {
		room.handleSocketConnect({ sessionId, socket: socket(), access })
		room.handleSocketMessage(
			sessionId,
			JSON.stringify({
				type: 'connect',
				connectRequestId: 'c',
				lastServerClock: 0,
				protocolVersion: getTlsyncProtocolVersion(),
				schema: schema.serialize(),
			})
		)
	}

	it('a download for one person holds only what they may read', () => {
		const room = makeRoom()
		const ids = (access: SessionAccess) =>
			room
				.getSnapshotFor(access)
				.documents.map((d) => d.state.id)
				.filter((id) => id.startsWith('shape:') || id.startsWith('page:'))
				.sort()
		expect(ids(as('bob', ['viewer']))).toEqual(['page:a', 'shape:bob', 'shape:tess'])
		expect(ids(as('ann', ['viewer']))).toEqual(['page:a', 'shape:bob', 'shape:card', 'shape:tess'])
	})

	it('a snapshot without access (saved before the model) does not resume: the client connects again', () => {
		const room = makeRoom()
		connect(room, 'bob', as('bob', ['viewer']))
		const { access: _, ...old } = room.getSessionSnapshot('bob')!
		const next = makeRoom()
		const s = socket()
		next.handleSocketResume({ sessionId: 'bob', socket: s, snapshot: old })
		expect(s.close).toHaveBeenCalled()
		expect(next.getSessions()).toEqual([])
	})

	it('a changed grant is saved at once, so a resume does not bring back the old one', () => {
		const room = makeRoom()
		connect(room, 'bob', as('bob', ['editor']))
		room.updateSessionAccess('bob', as('bob', ['viewer']))
		const next = makeRoom()
		next.handleSocketResume({ sessionId: 'bob', socket: socket(), snapshot: snapshots.get('bob')! })
		next.handleSocketMessage(
			'bob',
			JSON.stringify({
				type: 'push',
				clientClock: 1,
				diff: { 'shape:tess': [RecordOpType.Patch, { x: [ValueOpType.Put, 5] }] },
			})
		)
		expect((next.getRecord('shape:tess') as any).x).toBe(0)
	})
})
