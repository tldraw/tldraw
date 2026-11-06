/**
 * Backtests for rules-as-data access in the sync room. Each block is one use case from the
 * permissions research, run end to end: real TLSyncClients with real stores, connected to a
 * TLSyncRoom that enforces a rule set from `@tldraw/rules`.
 */
import {
	pollPluginRules,
	composeRules,
	useCaseRules,
	type TLRuleUser,
	type TLRulesDefinition,
} from '@tldraw/rules'
import { Atom, atom } from '@tldraw/state'
import { Store, StoreSchema, createRecordType } from '@tldraw/store'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { TLRoomAccess } from '../lib/RoomRules'
import { TLSyncClient } from '../lib/TLSyncClient'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

// A minimal tldraw-shaped schema: the rules read typeName, parentId, meta, and props, so the
// records need nothing else. Validators pass everything through.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any
const passthrough = { validate: (v: unknown) => v as R }
const docType = (name: string) =>
	createRecordType<R>(name, { scope: 'document', validator: passthrough })
const schema = StoreSchema.create<R>({
	document: docType('document'),
	page: docType('page'),
	shape: docType('shape'),
	binding: docType('binding'),
	comment: docType('comment'),
	'comment-thread': docType('comment-thread'),
	'comment-reaction': docType('comment-reaction'),
	instance_presence: createRecordType<R>('instance_presence', {
		scope: 'presence',
		validator: passthrough,
	}),
})

const doc = (meta: Record<string, unknown> = {}): R => ({
	id: 'document:document',
	typeName: 'document',
	meta,
})
const page = (id: string, meta: Record<string, unknown> = {}): R => ({
	id: `page:${id}`,
	typeName: 'page',
	name: id,
	meta,
})
const shape = (id: string, extra: Record<string, any> = {}): R => ({
	id: `shape:${id}`,
	typeName: 'shape',
	type: 'geo',
	parentId: 'page:main',
	x: 0,
	y: 0,
	rotation: 0,
	props: {},
	meta: {},
	...extra,
})

const disposables: (() => void)[] = []
afterEach(() => {
	while (disposables.length) disposables.pop()!()
})

function makeRoom(rules: TLRulesDefinition, records: R[]) {
	const server = new TestServer<R>(
		schema,
		{
			documents: records.map((state) => ({ state, lastChangedClock: 0 })),
			clock: 1,
			documentClock: 1,
			schema: schema.serialize(),
		},
		{ rules }
	)
	disposables.push(() => server.room.close())
	let n = 0
	const clients: Client[] = []

	function flush() {
		for (let i = 0; i < 20; i++) {
			server.flushDebouncingMessages()
			const busy = clients.filter((c) => c.socket.getNeedsFlushing())
			if (!busy.length) return
			for (const c of busy) {
				c.socket.flushClientSentEvents()
				c.socket.flushServerSentEvents()
			}
		}
	}

	function connect(user: TLRuleUser, presencePageId?: string): Client {
		const id = `session-${++n}`
		const socket = new TestSocketPair<R>(id, server)
		socket.connectOpts = { user }
		socket.connect()
		const store = new Store<R>({ schema, props: {} })
		const access = atom<TLRoomAccess | null>('access', null)
		const presence = atom<R | null>(
			'presence',
			presencePageId
				? {
						id: `instance_presence:${id}`,
						typeName: 'instance_presence',
						currentPageId: presencePageId,
						userName: String(user.id),
					}
				: null
		)
		const client = new TLSyncClient<R>({
			store,
			socket: socket.clientSocket,
			presence,
			presenceMode: atom('presence mode', 'full' as const),
			onLoad: () => {},
			onSyncError: (reason) => {
				throw new Error(`unexpected sync error: ${reason}`)
			},
			onAccessChange: (a) => access.set(a),
		})
		disposables.push(() => client.close())
		const c = { id, socket, store, client, access, presence, user }
		clients.push(c)
		flush()
		return c
	}

	const ids = (c: Client, typeName?: string): string[] =>
		c.store
			.allRecords()
			.filter((r) => !typeName || r.typeName === typeName)
			.map((r) => r.id)
			.sort()

	const stored = (id: string): R =>
		server.storage.getSnapshot().documents.find((d) => d.state.id === id)?.state

	return { server, connect, flush, ids, stored }
}
interface Client {
	id: string
	socket: TestSocketPair<R>
	store: Store<R>
	client: TLSyncClient<R>
	access: Atom<TLRoomAccess | null>
	presence: Atom<R | null>
	user: TLRuleUser
}

describe('the client gets the rules and its user facts', () => {
	it('at connect, and again on a live change', () => {
		const room = makeRoom(useCaseRules.shareLinks, [doc(), page('main')])
		const c = room.connect({ id: 'ann', access: 'view' })
		expect(c.access.get()).toEqual({
			rules: useCaseRules.shareLinks,
			user: { id: 'ann', access: 'view' },
		})
		room.server.room.updateSessionUser(c.id, { id: 'ann', access: 'edit' })
		room.flush()
		expect(c.access.get()?.user).toEqual({ id: 'ann', access: 'edit' })
	})
})

describe('share links: view, comment, edit', () => {
	const records = [doc(), page('main'), shape('a')]

	it('a viewer cannot write; the write is rolled back on the client', () => {
		const room = makeRoom(useCaseRules.shareLinks, records)
		const viewer = room.connect({ id: 'v', access: 'view' })
		viewer.store.put([{ ...(viewer.store.get('shape:a' as any) as R), x: 100 }])
		room.flush()
		expect(room.stored('shape:a')!.x).toBe(0)
		expect((viewer.store.get('shape:a' as any) as R).x).toBe(0)
	})

	it('a commenter can comment, as themselves, but not edit the canvas', () => {
		const room = makeRoom(useCaseRules.shareLinks, records)
		const commenter = room.connect({ id: 'cara', access: 'comment' })
		commenter.store.put([
			{
				id: 'comment:1',
				typeName: 'comment',
				threadId: 't',
				authorId: 'forged',
				isDeleted: false,
				createdAt: 1,
			},
		])
		room.flush()
		expect(room.stored('comment:1')).toMatchObject({ authorId: 'cara' })
		commenter.store.put([{ ...(commenter.store.get('shape:a' as any) as R), x: 5 }])
		room.flush()
		expect(room.stored('shape:a')!.x).toBe(0)
	})

	it('an anonymous editor can edit the canvas but cannot comment (no id to stamp)', () => {
		const room = makeRoom(useCaseRules.shareLinks, records)
		const anon = room.connect({ id: null, access: 'edit' })
		anon.store.put([{ ...(anon.store.get('shape:a' as any) as R), x: 5 }])
		anon.store.put([
			{
				id: 'comment:2',
				typeName: 'comment',
				threadId: 't',
				authorId: 'x',
				isDeleted: false,
				createdAt: 1,
			},
		])
		room.flush()
		expect(room.stored('shape:a')!.x).toBe(5)
		expect(room.stored('comment:2')).toBeUndefined()
	})

	it('file-level read control: with no access, the room sends no records', () => {
		const room = makeRoom(useCaseRules.shareLinks, records)
		const none = room.connect({ id: 'n', access: 'none' })
		expect(room.ids(none)).toEqual([])
		room.server.room.updateSessionUser(none.id, { id: 'n', access: 'view' })
		room.flush()
		expect(room.ids(none)).toEqual(['document:document', 'page:main', 'shape:a'])
		room.server.room.updateSessionUser(none.id, { id: 'n', access: 'none' })
		room.flush()
		expect(room.ids(none)).toEqual([])
	})

	it('upgrading a link from view to edit applies live, with no reconnect', () => {
		const room = makeRoom(useCaseRules.shareLinks, records)
		const c = room.connect({ id: 'v', access: 'view' })
		room.server.room.updateSessionUser(c.id, { id: 'v', access: 'edit' })
		c.store.put([{ ...(c.store.get('shape:a' as any) as R), x: 7 }])
		room.flush()
		expect(room.stored('shape:a')!.x).toBe(7)
	})
})

describe('classroom: own shapes, own frame, student tools, lesson lock', () => {
	const frame = (id: string, assignee: string) =>
		shape(id, { type: 'frame', meta: { assignee, ownerId: 'teacher' } })
	const records = [doc(), page('main'), frame('ann-frame', 'ann'), frame('bob-frame', 'bob')]
	const ann = { id: 'ann', role: 'student' }
	const teacher = { id: 'teacher', role: 'teacher' }

	it('stamps the owner on create, from the user facts, not the client', () => {
		const room = makeRoom(useCaseRules.classroom, records)
		const c = room.connect(ann)
		c.store.put([
			shape('s1', { type: 'draw', parentId: 'shape:ann-frame', meta: { ownerId: 'bob' } }),
		])
		room.flush()
		expect(room.stored('shape:s1')!.meta).toEqual({ ownerId: 'ann' })
		// the client agrees with the server after the rebase
		expect((c.store.get('shape:s1' as any) as R).meta).toEqual({ ownerId: 'ann' })
	})

	it('a student cannot draw outside their frame, or with a teacher tool', () => {
		const room = makeRoom(useCaseRules.classroom, records)
		const c = room.connect(ann)
		c.store.put([shape('s2', { type: 'draw', parentId: 'shape:bob-frame' })])
		room.flush()
		c.store.put([shape('s3', { type: 'frame', parentId: 'shape:ann-frame' })])
		room.flush()
		expect(room.stored('shape:s2')).toBeUndefined()
		expect(room.stored('shape:s3')).toBeUndefined()
		expect(c.store.get('shape:s2' as any)).toBeUndefined()
	})

	// Review finding 6: area rules must check where the shape goes, not only where it was.
	it('a student cannot move their own shape into another student’s frame', () => {
		const room = makeRoom(useCaseRules.classroom, [
			...records,
			shape('mine', { type: 'draw', parentId: 'shape:ann-frame', meta: { ownerId: 'ann' } }),
		])
		const c = room.connect(ann)
		c.store.put([{ ...(c.store.get('shape:mine' as any) as R), parentId: 'shape:bob-frame' }])
		room.flush()
		expect(room.stored('shape:mine')!.parentId).toBe('shape:ann-frame')
	})

	it('a student cannot change another student’s shape; the teacher can', () => {
		const bobs = shape('bobs', {
			type: 'draw',
			parentId: 'shape:bob-frame',
			meta: { ownerId: 'bob' },
		})
		const room = makeRoom(useCaseRules.classroom, [...records, bobs])
		const a = room.connect(ann)
		a.store.put([{ ...bobs, x: 50 }])
		room.flush()
		expect(room.stored('shape:bobs')!.x).toBe(0)
		const t = room.connect(teacher)
		t.store.put([{ ...bobs, x: 60 }])
		room.flush()
		expect(room.stored('shape:bobs')!.x).toBe(60)
	})

	it('locking the lesson is one document field, and it stops every student at once', () => {
		const room = makeRoom(useCaseRules.classroom, records)
		const t = room.connect(teacher)
		const a = room.connect(ann)
		t.store.put([doc({ locked: true })])
		room.flush()
		a.store.put([shape('late', { type: 'draw', parentId: 'shape:ann-frame' })])
		room.flush()
		expect(room.stored('shape:late')).toBeUndefined()
	})

	// Review finding 7: per-record skipping leaves half-applied changes.
	it('atomic pushes: one denied record rejects the whole push', () => {
		const room = makeRoom(useCaseRules.classroom, records)
		const a = room.connect(ann)
		a.store.put([
			shape('ok', { type: 'draw', parentId: 'shape:ann-frame' }),
			shape('bad', { type: 'draw', parentId: 'shape:bob-frame' }),
		])
		room.flush()
		expect(room.stored('shape:ok')).toBeUndefined()
		expect(room.stored('shape:bad')).toBeUndefined()
		expect(a.store.get('shape:ok' as any)).toBeUndefined()
	})

	it('per-record pushes keep the allowed half, as authorizeRecord does today', () => {
		const room = makeRoom({ ...useCaseRules.classroom, pushes: 'per-record' }, records)
		const a = room.connect(ann)
		a.store.put([
			shape('ok', { type: 'draw', parentId: 'shape:ann-frame' }),
			shape('bad', { type: 'draw', parentId: 'shape:bob-frame' }),
		])
		room.flush()
		expect(room.stored('shape:ok')).toBeDefined()
		expect(room.stored('shape:bad')).toBeUndefined()
	})

	it('an arrow may bind to someone else’s shape, because the binding follows the arrow', () => {
		const bobs = shape('bobs', {
			type: 'geo',
			parentId: 'shape:bob-frame',
			meta: { ownerId: 'bob' },
		})
		const room = makeRoom(useCaseRules.classroom, [...records, bobs])
		const a = room.connect(ann)
		a.store.put([
			shape('arrow', { type: 'arrow', parentId: 'shape:ann-frame' }),
			{
				id: 'binding:1',
				typeName: 'binding',
				type: 'arrow',
				fromId: 'shape:arrow',
				toId: 'shape:bobs',
				props: {},
				meta: {},
			},
		])
		room.flush()
		expect(room.stored('binding:1')).toBeDefined()
		// but not from an arrow that is not theirs
		a.store.put([
			{
				id: 'binding:2',
				typeName: 'binding',
				type: 'arrow',
				fromId: 'shape:bobs',
				toId: 'shape:arrow',
				props: {},
				meta: {},
			},
		])
		room.flush()
		expect(room.stored('binding:2')).toBeUndefined()
	})
})

describe('team pages: the room never sends what you cannot read', () => {
	const records = [
		doc(),
		page('main'),
		page('secret', { team: 'red' }),
		shape('public'),
		shape('plan', { parentId: 'page:secret' }),
		shape('child', { parentId: 'shape:plan' }),
	]

	it('an outsider does not receive the page, its shapes, or nested shapes', () => {
		const room = makeRoom(useCaseRules.teamPages, records)
		const out = room.connect({ id: 'o', teams: [] })
		const red = room.connect({ id: 'r', teams: ['red'] })
		expect(room.ids(out, 'page')).toEqual(['page:main'])
		expect(room.ids(out, 'shape')).toEqual(['shape:public'])
		expect(room.ids(red, 'shape')).toEqual(['shape:child', 'shape:plan', 'shape:public'])
	})

	it('a shape moved off the team page appears for everyone; moved back, it disappears', () => {
		const room = makeRoom(useCaseRules.teamPages, records)
		const out = room.connect({ id: 'o', teams: [] })
		const red = room.connect({ id: 'r', teams: ['red'] })
		red.store.put([{ ...(red.store.get('shape:plan' as any) as R), parentId: 'page:main' }])
		room.flush()
		// the child moves with its parent: its rule read the plan, so the index rechecks it
		expect(room.ids(out, 'shape')).toEqual(['shape:child', 'shape:plan', 'shape:public'])
		red.store.put([{ ...(red.store.get('shape:plan' as any) as R), parentId: 'page:secret' }])
		room.flush()
		expect(room.ids(out, 'shape')).toEqual(['shape:public'])
	})

	it('a page change rechecks only the records whose rules read that page', () => {
		const many = [...records, ...Array.from({ length: 50 }, (_, i) => shape(`other-${i}`))]
		const room = makeRoom(useCaseRules.teamPages, many)
		const out = room.connect({ id: 'o', teams: [] })
		const red = room.connect({ id: 'r', teams: ['red'] })
		const spy = vi.spyOn((room.server.room as any).roomRules, 'show')
		red.store.put([{ ...(red.store.get('page:secret' as any) as R), meta: { team: null } }])
		room.flush()
		expect(room.ids(out, 'shape')).toContain('shape:child')
		const checked = new Set(spy.mock.calls.map((call) => (call[1] as R).id))
		// the page, its shape, and the nested shape; not the 51 shapes on the other page
		expect([...checked].sort()).toEqual(['page:secret', 'shape:child', 'shape:plan'])
	})

	it('joining the team sends the page live; leaving removes it', () => {
		const room = makeRoom(useCaseRules.teamPages, records)
		const c = room.connect({ id: 'o', teams: [] })
		room.server.room.updateSessionUser(c.id, { id: 'o', teams: ['red'] })
		room.flush()
		expect(room.ids(c, 'page')).toEqual(['page:main', 'page:secret'])
		room.server.room.updateSessionUser(c.id, { id: 'o', teams: [] })
		room.flush()
		expect(room.ids(c, 'page')).toEqual(['page:main'])
		expect(room.ids(c, 'shape')).toEqual(['shape:public'])
	})

	it('hides the cursors of people on a hidden page', () => {
		const room = makeRoom(useCaseRules.teamPages, records)
		const out = room.connect({ id: 'o', teams: [] })
		room.connect({ id: 'r', teams: ['red'] }, 'page:secret')
		room.connect({ id: 'p', teams: [] }, 'page:main')
		room.flush()
		const cursors = out.store.allRecords().filter((r) => r.typeName === 'instance_presence')
		expect(cursors.map((p) => p.currentPageId)).toEqual(['page:main'])
	})

	it('a forged write to a record you cannot see is denied', () => {
		const room = makeRoom(useCaseRules.teamPages, records)
		const out = room.connect({ id: 'o', teams: [] })
		out.store.put([shape('plan', { parentId: 'page:main', x: 999 })])
		room.flush()
		expect(room.stored('shape:plan')).toMatchObject({ parentId: 'page:secret', x: 0 })
	})
})

describe('reveal: cards and hidden frames', () => {
	const face = (text: string) => ({
		type: 'doc',
		content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
	})
	const FACE_DOWN = face('🂠')
	const records = [
		doc(),
		page('main'),
		shape('ann-card', { props: { richText: face('A♠') }, meta: { holder: 'ann' } }),
		shape('bob-card', { props: { richText: face('2♣') }, meta: { holder: 'bob' } }),
		shape('box', { type: 'frame', meta: { hidden: true } }),
		shape('answer', { parentId: 'shape:box' }),
	]
	const dealer = { id: 'd', role: 'dealer' }
	const text = (c: Client, id: string) => (c.store.get(id as any) as R).props.richText

	it('everyone sees every card, but only its holder sees its face', () => {
		const room = makeRoom(useCaseRules.reveal, records)
		const ann = room.connect({ id: 'ann', role: 'player' })
		const d = room.connect(dealer)
		expect(room.ids(ann, 'shape')).toEqual(['shape:ann-card', 'shape:bob-card'])
		expect(text(ann, 'shape:ann-card')).toEqual(face('A♠'))
		expect(text(ann, 'shape:bob-card')).toEqual(FACE_DOWN)
		expect(room.ids(d, 'shape')).toHaveLength(4)
		expect(text(d, 'shape:bob-card')).toEqual(face('2♣'))
	})

	it('nobody but the dealer gets the records inside a hidden frame', () => {
		const room = makeRoom(useCaseRules.reveal, records)
		const ann = room.connect({ id: 'ann', role: 'player' })
		expect(room.ids(ann, 'shape')).not.toContain('shape:answer')
		expect(room.ids(ann, 'shape')).not.toContain('shape:box')
	})

	it('a change to a hidden face never reaches the players who cannot read it', () => {
		const room = makeRoom(useCaseRules.reveal, records)
		const ann = room.connect({ id: 'ann', role: 'player' })
		const d = room.connect(dealer)
		const sent: unknown[] = []
		const send = ann.socket.roomSocket.sendMessage
		ann.socket.roomSocket.sendMessage = (msg) => {
			sent.push(msg)
			send(msg)
		}
		d.store.put([
			{ ...(d.store.get('shape:bob-card' as any) as R), props: { richText: face('K♥') } },
		])
		room.flush()
		expect(room.stored('shape:bob-card').props.richText).toEqual(face('K♥'))
		expect(text(ann, 'shape:bob-card')).toEqual(FACE_DOWN)
		expect(JSON.stringify(sent)).not.toContain('K♥')
	})

	it('moving a face-down card keeps its real face on the server; changing the face is denied', () => {
		const room = makeRoom(useCaseRules.reveal, records)
		const bob = room.connect({ id: 'bob', role: 'player' })
		const ann = room.connect({ id: 'ann', role: 'player' })
		// a full put of the face-down record, as a client sends after a drag: the face is kept
		bob.store.put([{ ...(bob.store.get('shape:bob-card' as any) as R), x: 30 }])
		room.flush()
		expect(room.stored('shape:bob-card')).toMatchObject({ x: 30, props: { richText: face('2♣') } })
		expect(text(ann, 'shape:bob-card')).toEqual(FACE_DOWN)
		expect((ann.store.get('shape:bob-card' as any) as R).x).toBe(30)
		// a forged face from someone who cannot read it
		const forged = {
			...(ann.store.get('shape:bob-card' as any) as R),
			props: { richText: face('A♠') },
		}
		ann.store.put([forged])
		room.flush()
		expect(room.stored('shape:bob-card').props.richText).toEqual(face('2♣'))
	})

	it('revealing sends the faces and the hidden frame to everyone, live', () => {
		const room = makeRoom(useCaseRules.reveal, records)
		const ann = room.connect({ id: 'ann', role: 'player' })
		const d = room.connect(dealer)
		d.store.put([
			{ ...(d.store.get('shape:box' as any) as R), meta: { hidden: false } },
			{ ...(d.store.get('shape:bob-card' as any) as R), meta: { holder: 'bob', revealed: true } },
		])
		room.flush()
		expect(room.ids(ann, 'shape')).toEqual([
			'shape:ann-card',
			'shape:answer',
			'shape:bob-card',
			'shape:box',
		])
		expect(text(ann, 'shape:bob-card')).toEqual(face('2♣'))
	})

	it('a drag changes nothing the read rules read, so the room runs no read rule for it', () => {
		const room = makeRoom(useCaseRules.reveal, records)
		const ann = room.connect({ id: 'ann', role: 'player' })
		room.connect({ id: 'bob', role: 'player' })
		const rules = (room.server.room as any).roomRules
		const spy = vi.spyOn(rules, 'show')
		ann.store.put([{ ...(ann.store.get('shape:ann-card' as any) as R), x: 40 }])
		room.flush()
		expect(room.stored('shape:ann-card')!.x).toBe(40)
		expect(spy).not.toHaveBeenCalled()
	})
})

describe('agents: an area, a few shape types, no deletes', () => {
	const records = [
		doc(),
		page('main'),
		shape('zone', { type: 'frame' }),
		shape('inside', { parentId: 'shape:zone' }),
		shape('outside'),
	]
	const agent = { id: 'bot', role: 'agent', area: 'shape:zone' }

	it('reads only its frame, and cannot see people’s cursors', () => {
		const room = makeRoom(useCaseRules.agent, records)
		const a = room.connect(agent)
		room.connect({ id: 'human' }, 'page:main')
		room.flush()
		expect(room.ids(a, 'shape')).toEqual(['shape:inside', 'shape:zone'])
		expect(room.ids(a, 'instance_presence')).toEqual([])
	})

	it('writes text in its frame, and nothing else', () => {
		const room = makeRoom(useCaseRules.agent, records)
		const a = room.connect(agent)
		a.store.put([shape('note', { type: 'text', parentId: 'shape:zone' })])
		room.flush()
		a.store.put([shape('far', { type: 'text' })])
		room.flush()
		a.store.remove(['shape:note' as any])
		room.flush()
		expect(room.stored('shape:note')).toMatchObject({ meta: { ownerId: 'bot' } })
		expect(room.stored('shape:far')).toBeUndefined()
	})
})

describe('plugins bring their own rules', () => {
	it('a poll shape: anyone with edit access may vote, only for themselves', () => {
		const rules = composeRules(useCaseRules.shareLinks, pollPluginRules)
		const poll = shape('poll', {
			type: 'poll',
			meta: { ownerId: 'owner' },
			props: { votes: { ann: 0, bob: 0 } },
		})
		const room = makeRoom(rules, [doc(), page('main'), poll])
		const ann = room.connect({ id: 'ann', access: 'edit' })
		ann.store.put([{ ...poll, props: { votes: { ann: 1, bob: 0 } } }])
		room.flush()
		ann.store.put([{ ...room.stored('shape:poll')!, props: { votes: { ann: 1, bob: 5 } } }])
		room.flush()
		expect(room.stored('shape:poll')!.props.votes).toEqual({ ann: 1, bob: 0 })
	})
})

describe('rules change live', () => {
	it('replacing the rules re-filters every session', () => {
		const records = [doc(), page('main'), page('secret', { team: 'red' })]
		const room = makeRoom(useCaseRules.teamPages, records)
		const c = room.connect({ id: 'o', teams: [] })
		expect(room.ids(c, 'page')).toEqual(['page:main'])
		room.server.room.updateRules({
			...useCaseRules.teamPages,
			types: {
				...useCaseRules.teamPages.types,
				page: { ...useCaseRules.teamPages.types!.page, read: 'true' },
			},
		})
		room.flush()
		expect(room.ids(c, 'page')).toEqual(['page:main', 'page:secret'])
	})
})

describe('review findings stay fixed', () => {
	it('a denied edit in the same push keeps the pusher’s cursor', () => {
		const room = makeRoom(useCaseRules.shareLinks, [doc(), page('main'), shape('a')])
		const viewer = room.connect({ id: 'v', access: 'view' })
		const presence = () =>
			[...(room.server.room as any).presenceStore.values()].map((p: R) => p.userName)
		// one push: a new cursor, and an edit the rules deny
		room.server.room.handleMessage(viewer.id, {
			type: 'push',
			clientClock: 100,
			diff: { 'shape:a': ['patch', { x: ['put', 100] }] },
			presence: [
				'put',
				{ typeName: 'instance_presence', currentPageId: 'page:main', userName: 'v1' },
			],
		} as any)
		expect(room.stored('shape:a').x).toBe(0)
		// the client counts its cursor as sent, so the next change is a patch on it
		room.server.room.handleMessage(viewer.id, {
			type: 'push',
			clientClock: 101,
			presence: ['patch', { userName: ['put', 'v2'] }],
		} as any)
		expect(presence()).toEqual(['v2'])
	})

	it('a reconnect after access grew sends the records the client never had', () => {
		const room = makeRoom(useCaseRules.shareLinks, [doc(), page('main'), shape('a')])
		const c = room.connect({ id: 'c', access: 'none' })
		expect(room.ids(c)).toEqual([])
		c.socket.disconnect()
		c.socket.connectOpts = { user: { id: 'c', access: 'edit' } }
		c.socket.connect()
		room.flush()
		expect(room.ids(c)).toEqual(['document:document', 'page:main', 'shape:a'])
	})

	it('checks presence writes against rules written for presence, and only those', () => {
		const rules = composeRules(useCaseRules.agent, {
			types: { instance_presence: { create: '!isAgent', update: '!isAgent' } },
		})
		const room = makeRoom(rules, [doc(), page('main')])
		const human = room.connect({ id: 'human' }, 'page:main')
		room.connect({ id: 'bot', role: 'agent', area: 'shape:none' }, 'page:main')
		room.flush()
		expect(room.ids(human, 'instance_presence')).toEqual([])
		// and `default.write` does not apply to presence: a viewer keeps a cursor
		const share = makeRoom(useCaseRules.shareLinks, [doc(), page('main')])
		const editor = share.connect({ id: 'e', access: 'edit' })
		share.connect({ id: 'v', access: 'view' }, 'page:main')
		share.flush()
		expect(share.ids(editor, 'instance_presence')).toHaveLength(1)
	})

	it('denies a write that puts a record where its writer cannot see it', () => {
		const room = makeRoom(useCaseRules.teamPages, [
			doc(),
			page('main'),
			page('secret', { team: 'red' }),
			shape('plan', { parentId: 'page:secret' }),
			shape('mine'),
		])
		const out = room.connect({ id: 'o', teams: [] })
		out.store.put([shape('graffiti', { parentId: 'page:secret' })])
		room.flush()
		out.store.put([{ ...(out.store.get('shape:mine' as any) as R), parentId: 'shape:plan' }])
		room.flush()
		expect(room.stored('shape:graffiti')).toBeUndefined()
		expect(room.stored('shape:mine').parentId).toBe('page:main')
	})

	it('skips a patch that changes a record’s typeName', () => {
		const room = makeRoom(useCaseRules.shareLinks, [doc(), page('main')])
		const c = room.connect({ id: 'cara', access: 'comment' })
		c.store.put([
			{ id: 'comment:1', typeName: 'comment', threadId: 't', isDeleted: false, createdAt: 1 },
		])
		room.flush()
		room.server.room.handleMessage(c.id, {
			type: 'push',
			clientClock: 99,
			diff: { 'comment:1': ['patch', { typeName: ['put', 'shape'] }] },
		} as any)
		expect(room.stored('comment:1').typeName).toBe('comment')
	})

	it('a parent created after its child hides the child, through the index', () => {
		const room = makeRoom(useCaseRules.reveal, [doc(), page('main')])
		const ann = room.connect({ id: 'ann', role: 'player' })
		const d = room.connect({ id: 'd', role: 'dealer' })
		d.store.put([shape('answer', { parentId: 'shape:box' })])
		room.flush()
		d.store.put([shape('box', { type: 'frame', meta: { hidden: true } })])
		room.flush()
		expect(room.ids(ann, 'shape')).toEqual([])
	})

	it('a rules room turns away a protocol 8 client, which cannot take the access message', () => {
		const room = makeRoom(useCaseRules.shareLinks, [doc()])
		const socket = new TestSocketPair<R>('old', room.server)
		socket.connectOpts = { user: { id: 'x', access: 'edit' } }
		socket.connect()
		let closed: string | undefined
		socket.callbacks.onStatusChange = (s) => {
			if (s.status === 'error') closed = s.reason
		}
		socket.callbacks.onReceiveMessage = () => {}
		room.server.room.handleMessage('old', {
			type: 'connect',
			connectRequestId: 'c',
			lastServerClock: 0,
			protocolVersion: 8,
			schema: schema.serialize(),
		})
		socket.flushServerSentEvents()
		expect(closed).toBe('CLIENT_TOO_OLD')
	})
})
