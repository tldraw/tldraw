import { atom, computed } from '@tldraw/state'
import {
	PolicyActor,
	PolicyContext,
	RecordPolicy,
	Store,
	UnknownRecord,
	createPolicyActor,
	isOwnedBy,
} from '@tldraw/store'
import {
	DocumentRecordType,
	InstancePresenceRecordType,
	TLDOCUMENT_ID,
	PageRecordType,
	TLPageId,
	TLParentId,
	TLPolicies,
	TLShape,
	TLShapeId,
	commentSchemaRecords,
	createBindingId,
	createComment,
	createCommentReaction,
	createCommentThread,
	createShapeId,
	createTLSchema,
	mayUpdate,
	toRichText,
} from '@tldraw/tlschema'
import { IndexKey, getIndexAbove } from '@tldraw/utils'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { RecordOpType } from '../lib/diff'
import { TLPushRequest } from '../lib/protocol'
import { TLSyncClient } from '../lib/TLSyncClient'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

// Backtests of the use cases for per-record-type policies, from end to end: a real client store
// and sync client on each side, a real room in the middle. Each client runs the same policies as
// the server, through `store.setActor`.

// ---- actors ----

const actions = {
	viewer: [],
	commenter: ['comments:write'],
	editor: ['document:write', 'comments:write'],
	moderator: ['comments:write', 'comments:manage'],
	teacher: ['document:write', 'comments:write', 'board:lock'],
	student: ['shapes:create', 'comments:write'],
}
const actor = (id: string | null, role: keyof typeof actions) =>
	createPolicyActor({ id, actions: actions[role] })

// sync-core has no validation library: these stand in for `T.number` and `T.object(...)`.
const num = {
	validate: (v: unknown) => {
		if (typeof v !== 'number') throw new Error('expected a number')
		return v
	},
}
const anyRecord = { validate: (v: any) => v }

// ---- plugin types: a vote record with its own policy, and one that forgot its policy ----

const votePolicy: RecordPolicy<any> = {
	create: ({ can, actor, next }) => can('votes:cast') && isOwnedBy(actor, next.userId),
	update: () => false,
	delete: ({ actor, prev }) => isOwnedBy(actor, prev.userId),
}
const voteRecord = {
	scope: 'document' as const,
	validator: anyRecord,
	policy: votePolicy,
}
const forgottenRecord = {
	scope: 'document' as const,
	validator: anyRecord,
}

// A board settings record with a custom action: only `board:lock` may lock the board.
const boardRecord = {
	scope: 'document' as const,
	validator: anyRecord,
	policy: {
		update: (ctx) =>
			ctx.prev.locked === ctx.next.locked
				? ctx.base()
				: ctx.authorize({ verb: 'action', action: 'lock', record: ctx.prev }),
		actions: { lock: ({ can }) => can('board:lock') },
	} satisfies RecordPolicy<any>,
}
const BOARD_ID = 'board:main' as any

// ---- host policies ----

function pageOf(shape: TLShape, get: PolicyContext['get']): TLPageId | null {
	let parentId: TLParentId | undefined = shape.parentId
	for (let i = 0; i < 100 && parentId; i++) {
		if (parentId.startsWith('page:')) return parentId as TLPageId
		parentId = (get(parentId) as TLShape | undefined)?.parentId
	}
	return null
}

function isInside(shape: TLShape, ancestorId: TLShapeId, get: PolicyContext['get']) {
	let parentId: TLParentId | undefined = shape.parentId
	for (let i = 0; i < 100 && parentId; i++) {
		if (parentId === ancestorId) return true
		parentId = (get(parentId) as TLShape | undefined)?.parentId
	}
	return false
}

// A parent the actor may put a shape in: a page, or a shape they may update.
const mayParent = (ctx: PolicyContext, parentId: TLParentId) =>
	parentId.startsWith('page:') || mayUpdate(ctx, ctx.get(parentId))

const boardLocked = (ctx: PolicyContext) => (ctx.get(BOARD_ID) as any)?.locked === true

// Classroom: students add shapes and change only their own. Teachers change anything. When the
// board is locked, students change nothing.
const classroom: TLPolicies = {
	shape: {
		create: (ctx) =>
			ctx.base() ||
			(ctx.can('shapes:create') &&
				!boardLocked(ctx) &&
				isOwnedBy(ctx.actor, ctx.next.meta.ownerId) &&
				mayParent(ctx, ctx.next.parentId)),
		update: (ctx) =>
			ctx.base() ||
			(ctx.can('shapes:create') &&
				!boardLocked(ctx) &&
				isOwnedBy(ctx.actor, ctx.prev.meta.ownerId) &&
				ctx.next.meta.ownerId === ctx.prev.meta.ownerId &&
				(ctx.next.parentId === ctx.prev.parentId || mayParent(ctx, ctx.next.parentId))),
		delete: (ctx) =>
			ctx.base() ||
			(ctx.can('shapes:create') &&
				!boardLocked(ctx) &&
				isOwnedBy(ctx.actor, ctx.prev.meta.ownerId)),
	},
}

// Private pages: a page with `meta.private` is hidden from everyone without `pages:read-private`,
// and so is every shape, binding, and comment thread on it. Only `document:write` changes a page.
const privatePages: TLPolicies = {
	page: {
		read: (ctx) => !ctx.record.meta.private || ctx.can('pages:read-private'),
	},
	shape: {
		read: (ctx) => {
			const pageId = pageOf(ctx.record, ctx.get)
			const page = pageId && ctx.get(pageId)
			return !page || ctx.authorize({ verb: 'read', record: page })
		},
	},
	binding: {
		read: (ctx) => {
			const from = ctx.get(ctx.record.fromId)
			const to = ctx.get(ctx.record.toId)
			return (
				(!from || ctx.authorize({ verb: 'read', record: from })) &&
				(!to || ctx.authorize({ verb: 'read', record: to }))
			)
		},
	},
}

// Page-level edit access: `pages:write:<pageId>` lets an actor change shapes on that page only.
const perPageEdit: TLPolicies = {
	shape: {
		create: (ctx) => ctx.base() || ctx.can(`pages:write:${pageOf(ctx.next, ctx.get)}`),
		update: (ctx) =>
			ctx.base() ||
			(ctx.can(`pages:write:${pageOf(ctx.prev, ctx.get)}`) &&
				ctx.can(`pages:write:${pageOf(ctx.next, ctx.get)}`)),
		delete: (ctx) => ctx.base() || ctx.can(`pages:write:${pageOf(ctx.prev, ctx.get)}`),
	},
}

// An agent may create and change shapes only inside frame X.
const FRAME_X = createShapeId('frame-x')
const agentArea: TLPolicies = {
	shape: {
		create: (ctx) => ctx.base() || (ctx.can('agent') && isInside(ctx.next, FRAME_X, ctx.get)),
		update: (ctx) =>
			ctx.base() ||
			(ctx.can('agent') &&
				isInside(ctx.prev, FRAME_X, ctx.get) &&
				isInside(ctx.next, FRAME_X, ctx.get)),
		delete: (ctx) => ctx.base() || (ctx.can('agent') && isInside(ctx.prev, FRAME_X, ctx.get)),
	},
}

// ---- schema and harness ----

function makeSchema(policies: TLPolicies = {}) {
	return createTLSchema({
		shapes: {
			box: { props: { w: num, h: num } },
			arrow: { props: {} },
		},
		bindings: { link: { props: {} } },
		records: {
			...commentSchemaRecords,
			vote: voteRecord,
			forgotten: forgottenRecord,
			board: boardRecord,
		},
		policies,
	})
}

const PAGE_1 = PageRecordType.createId('one')
const PAGE_2 = PageRecordType.createId('two')

function page(id: TLPageId, meta: object = {}) {
	return PageRecordType.create({ id, name: id, index: 'a1' as IndexKey, meta: meta as any })
}

let shapeIndex: IndexKey = 'a1' as IndexKey
function box(
	id: string,
	ownerId: string | null,
	parentId: TLParentId = PAGE_1,
	type: 'box' | 'arrow' = 'box'
): TLShape {
	return {
		id: createShapeId(id),
		typeName: 'shape',
		type,
		x: 0,
		y: 0,
		rotation: 0,
		index: (shapeIndex = getIndexAbove(shapeIndex)),
		parentId,
		isLocked: false,
		opacity: 1,
		props: type === 'box' ? { w: 10, h: 10 } : {},
		meta: ownerId ? { ownerId } : {},
	} as any
}

function link(id: string, fromId: TLShapeId, toId: TLShapeId) {
	return {
		id: createBindingId(id),
		typeName: 'binding',
		type: 'link',
		fromId,
		toId,
		props: {},
		meta: {},
	} as any
}

// Each use case runs twice: with the client guard (the normal setup), and with clients that skip it
// (an old or modified client), so that the server alone must enforce every rule.
let withClientGuard = true

interface Client {
	id: string
	pair: TestSocketPair<any>
	store: Store<any>
	sync: TLSyncClient<any>
	denied: string[]
	errors: string[]
	received: any[]
	setActor(actor: PolicyActor | null): void
}

const disposables: Array<() => void> = []
afterEach(() => {
	while (disposables.length) disposables.pop()!()
})

function setup(opts: { policies?: TLPolicies; seed?: object[] } = {}) {
	const schema = makeSchema(opts.policies)
	const actors = new Map<string, PolicyActor | null>()
	const warn = vi.fn()
	const server = new TestServer<any>(
		schema,
		{
			// A real room always has the document record. Without it, the client's integrity check
			// would create one, and the policies would deny that for a viewer.
			documents: [
				DocumentRecordType.create({ id: TLDOCUMENT_ID }),
				...((opts.seed ?? []) as UnknownRecord[]),
			].map((state) => ({
				state,
				lastChangedClock: 0,
			})),
			clock: 0,
			documentClock: 0,
			schema: schema.serialize(),
		},
		{
			getActor: ({ sessionId }) => actors.get(sessionId) ?? null,
			log: { warn, error: vi.fn() },
		}
	)
	const clients: Client[] = []

	function deliver() {
		for (let i = 0; i < 6; i++) {
			for (const c of clients) c.pair.flushClientSentEvents()
			server.flushDebouncingMessages()
			for (const c of clients) c.pair.flushServerSentEvents()
		}
	}

	function client(
		id: string,
		who: PolicyActor | null,
		{ guard = withClientGuard, presence = null as UnknownRecord | null } = {}
	): Client {
		actors.set(id, who)
		const pair = new TestSocketPair<any>(id, server)
		const received: any[] = []
		const send = pair.roomSocket.sendMessage
		pair.roomSocket.sendMessage = (msg) => {
			received.push(structuredClone(msg))
			send(msg)
		}
		pair.connect()
		const store = new Store<any>({ schema, props: {} })
		if (guard) store.setActor(who)
		const denied: string[] = []
		store.addPolicyDeniedListener((requests) =>
			denied.push(...requests.map((r) => `${r.verb} ${(r as any).next?.id ?? (r as any).prev?.id}`))
		)
		const errors: string[] = []
		const sync = new TLSyncClient<any>({
			store,
			socket: pair.clientSocket,
			presence: computed('p', () => presence as any),
			onLoad: () => {},
			onSyncError: (reason) => errors.push(reason),
		})
		disposables.push(() => sync.close())
		const c = {
			id,
			pair,
			store,
			sync,
			denied,
			errors,
			received,
			setActor: (a: PolicyActor | null) => actors.set(id, a),
		}
		clients.push(c)
		deliver()
		return c
	}

	const pushes = (c: Client) =>
		c.pair.clientSentEventQueue.filter((m): m is TLPushRequest<any> => m.type === 'push')

	return {
		server,
		schema,
		client,
		deliver,
		pushes,
		warn,
		stored: (id: string) => server.storage.documents.get(id)?.state,
	}
}

const ids = (store: Store<any>, typeName: string) =>
	store
		.allRecords()
		.filter((r) => r.typeName === typeName)
		.map((r) => r.id)
		.sort()

for (const guard of [true, false]) {
	describe(guard ? 'client and server' : 'server only', () => {
		beforeAll(() => {
			withClientGuard = guard
		})
		afterAll(() => {
			withClientGuard = true
		})

		describe('share link tiers', () => {
			const seed = [page(PAGE_1), box('a', 'owner')]

			it('a viewer changes nothing, locally or on the server', () => {
				const { client, deliver, stored, pushes } = setup({ seed })
				const viewer = client('viewer', actor('v', 'viewer'))
				viewer.store.update(createShapeId('a'), (s: any) => ({ ...s, x: 100 }))
				if (withClientGuard) expect(viewer.store.get(createShapeId('a'))!.x).toBe(0)
				if (withClientGuard) expect(viewer.denied).toEqual([`update ${createShapeId('a')}`])
				deliver()
				if (withClientGuard) expect(pushes(viewer)).toHaveLength(0)
				expect((stored(createShapeId('a')) as any).x).toBe(0)
			})

			it('a commenter comments but does not edit the canvas', () => {
				const { client, deliver, stored } = setup({ seed })
				const c = client('commenter', actor('cara', 'commenter'))
				const thread = createCommentThread({
					pageId: PAGE_1,
					anchor: { type: 'page' },
					createdBy: 'cara',
				})
				const comment = createComment({
					threadId: thread.id,
					pageId: PAGE_1,
					authorId: 'cara',
					body: toRichText('hi'),
				})
				c.store.put([thread, comment])
				c.store.put([box('b', 'cara')])
				deliver()
				expect(stored(thread.id)).toBeDefined()
				expect(stored(comment.id)).toBeDefined()
				expect(stored(createShapeId('b'))).toBeUndefined()
				if (withClientGuard) expect(c.denied).toEqual([`create ${createShapeId('b')}`])
			})

			it('an editor edits the canvas', () => {
				const { client, deliver, stored } = setup({ seed })
				const e = client('editor', actor('ed', 'editor'))
				e.store.put([box('b', 'ed')])
				deliver()
				expect(stored(createShapeId('b'))).toBeDefined()
			})

			it('a read-only token narrows an editor to reads', () => {
				const { client, deliver, stored } = setup({ seed })
				const editor = actor('ed', 'editor')
				const token: PolicyActor = {
					id: editor.id,
					can: (a) => a === 'document:read' && editor.can(a),
				}
				const mcp = client('mcp', token)
				mcp.store.put([box('b', 'ed')])
				deliver()
				expect(stored(createShapeId('b'))).toBeUndefined()
			})
		})

		describe('classroom: students change only their own shapes', () => {
			const area = box('area', 'teacher')
			const seed = [
				page(PAGE_1),
				area,
				box('teacher-box', 'teacher'),
				{ id: BOARD_ID, typeName: 'board', locked: false },
			]

			it('a student adds a shape and moves it, but cannot move the teacher’s shape', () => {
				const { client, deliver, stored } = setup({ policies: classroom, seed })
				const sam = client('sam', actor('sam', 'student'))
				sam.store.put([box('sam-box', 'sam')])
				sam.store.update(createShapeId('sam-box'), (s: any) => ({ ...s, x: 50 }))
				sam.store.update(createShapeId('teacher-box'), (s: any) => ({ ...s, x: 50 }))
				deliver()
				expect((stored(createShapeId('sam-box')) as any).x).toBe(50)
				expect((stored(createShapeId('teacher-box')) as any).x).toBe(0)
			})

			it('a student cannot claim a shape by changing its owner', () => {
				const { client, deliver, stored } = setup({ policies: classroom, seed })
				const sam = client('sam', actor('sam', 'student'))
				sam.store.put([box('sam-box', 'sam')])
				sam.store.update(createShapeId('sam-box'), (s: any) => ({ ...s, meta: { ownerId: 'ann' } }))
				deliver()
				expect((stored(createShapeId('sam-box')) as any).meta.ownerId).toBe('sam')
			})

			it('a student cannot create a shape in someone else’s name, or as an anonymous actor', () => {
				const { client, deliver, stored } = setup({ policies: classroom, seed })
				const sam = client('sam', actor('sam', 'student'))
				sam.store.put([box('forged', 'ann'), box('unowned', null)])
				const anon = client('anon', actor(null, 'student'))
				anon.store.put([box('anon', null)])
				deliver()
				expect(stored(createShapeId('forged'))).toBeUndefined()
				expect(stored(createShapeId('unowned'))).toBeUndefined()
				expect(stored(createShapeId('anon'))).toBeUndefined()
			})

			it('a student cannot move their shape into the teacher’s area (prev and next are checked)', () => {
				const { client, deliver, stored } = setup({ policies: classroom, seed })
				const sam = client('sam', actor('sam', 'student'))
				sam.store.put([box('sam-box', 'sam')])
				sam.store.update(createShapeId('sam-box'), (s: any) => ({ ...s, parentId: area.id }))
				deliver()
				expect((stored(createShapeId('sam-box')) as any).parentId).toBe(PAGE_1)
			})

			it('a student binds their own arrow to the teacher’s shape, not the teacher’s arrow to theirs', () => {
				const { client, deliver, stored } = setup({
					policies: classroom,
					seed: [...seed, box('teacher-arrow', 'teacher', PAGE_1, 'arrow')],
				})
				const sam = client('sam', actor('sam', 'student'))
				const arrow = box('sam-arrow', 'sam', PAGE_1, 'arrow')
				const ok = link('ok', arrow.id, createShapeId('teacher-box'))
				sam.store.put([arrow, ok])
				sam.store.put([link('bad', createShapeId('teacher-arrow'), arrow.id)])
				deliver()
				expect(stored(ok.id)).toBeDefined()
				expect(stored(createBindingId('bad'))).toBeUndefined()
			})

			it('only the teacher locks the board (a custom action), and a locked board stops students', () => {
				const { client, deliver, stored } = setup({ policies: classroom, seed })
				const sam = client('sam', actor('sam', 'student'))
				const teacher = client('teacher', actor('teacher', 'teacher'))
				sam.store.update(BOARD_ID, (b: any) => ({ ...b, locked: true }))
				deliver()
				expect((stored(BOARD_ID) as any).locked).toBe(false)
				teacher.store.update(BOARD_ID, (b: any) => ({ ...b, locked: true }))
				deliver()
				expect((stored(BOARD_ID) as any).locked).toBe(true)
				sam.store.put([box('late', 'sam')])
				deliver()
				expect(stored(createShapeId('late'))).toBeUndefined()
				if (withClientGuard) expect(sam.denied).toContain(`create ${createShapeId('late')}`)
			})
		})

		describe('one transaction commits all or nothing', () => {
			const seed = [
				page(PAGE_1),
				box('teacher-box', 'teacher'),
				box('teacher-arrow', 'teacher', PAGE_1, 'arrow'),
			]

			it('the client reverts the whole operation, so it never sends a push the server rejects', () => {
				const { client, deliver, stored, pushes } = setup({ policies: classroom, seed })
				const sam = client('sam', actor('sam', 'student'))
				const before = pushes(sam).length
				sam.store.put([
					box('sam-box', 'sam'),
					link('bad', createShapeId('teacher-arrow'), createShapeId('sam-box')),
				])
				if (withClientGuard) expect(sam.store.get(createShapeId('sam-box'))).toBeUndefined()
				if (withClientGuard) expect(sam.denied).toEqual([`create ${createBindingId('bad')}`])
				deliver()
				if (withClientGuard) expect(pushes(sam).length).toBe(before)
				expect(stored(createShapeId('sam-box'))).toBeUndefined()
			})

			it('the server discards a whole push with one denied change (a client without the guard)', () => {
				const { client, deliver, stored, warn } = setup({ policies: classroom, seed })
				const sam = client('sam', actor('sam', 'student'), { guard: false })
				const other = client('other', actor('teacher', 'teacher'))
				sam.store.put([
					box('sam-box', 'sam'),
					link('bad', createShapeId('teacher-arrow'), createShapeId('sam-box')),
				])
				expect(sam.store.get(createShapeId('sam-box'))).toBeDefined()
				deliver()
				expect(stored(createShapeId('sam-box'))).toBeUndefined()
				expect(stored(createBindingId('bad'))).toBeUndefined()
				// the client rolls back to the server's state, and the other client never sees it
				expect(sam.store.get(createShapeId('sam-box'))).toBeUndefined()
				expect(other.store.get(createShapeId('sam-box'))).toBeUndefined()
				expect(warn).toHaveBeenCalledWith(
					'policy denied push',
					`create ${createBindingId('bad')}`,
					'session:',
					'sam'
				)
			})

			it('rules see the end state of the push: a binding to a shape created in the same push', () => {
				const { client, deliver, stored } = setup({ policies: classroom, seed })
				const sam = client('sam', actor('sam', 'student'), { guard: false })
				const arrow = box('sam-arrow', 'sam', PAGE_1, 'arrow')
				const target = box('sam-box', 'sam')
				// the binding comes first in the push, before the shapes it points to
				sam.pair.didReceiveFromClient!({
					type: 'push',
					clientClock: 99,
					diff: {
						[createBindingId('l')]: [RecordOpType.Put, link('l', arrow.id, target.id)],
						[arrow.id]: [RecordOpType.Put, arrow],
						[target.id]: [RecordOpType.Put, target],
					},
				} as any)
				deliver()
				expect(stored(createBindingId('l'))).toBeDefined()
			})
		})

		describe('comments', () => {
			const thread = createCommentThread({
				pageId: PAGE_1,
				anchor: { type: 'page' },
				createdBy: 'ann',
			})
			const annComment = createComment({
				threadId: thread.id,
				pageId: PAGE_1,
				authorId: 'ann',
				body: toRichText('a'),
			})
			const seed = [page(PAGE_1), thread, annComment]

			it('a commenter adds their own comment, never one in someone else’s name', () => {
				const { client, deliver, stored } = setup({ seed })
				const bob = client('bob', actor('bob', 'commenter'))
				const own = createComment({
					threadId: thread.id,
					pageId: PAGE_1,
					authorId: 'bob',
					body: toRichText('b'),
				})
				const forged = createComment({
					threadId: thread.id,
					pageId: PAGE_1,
					authorId: 'ann',
					body: toRichText('c'),
				})
				bob.store.put([own])
				bob.store.put([forged])
				deliver()
				expect(stored(own.id)).toBeDefined()
				expect(stored(forged.id)).toBeUndefined()
			})

			it('a commenter cannot edit or delete someone else’s comment', () => {
				const { client, deliver, stored } = setup({ seed })
				const bob = client('bob', actor('bob', 'commenter'))
				bob.store.update(annComment.id, (c: any) => ({ ...c, body: toRichText('hacked') }))
				bob.store.update(annComment.id, (c: any) => ({ ...c, isDeleted: true }))
				deliver()
				expect(stored(annComment.id)).toEqual(annComment)
			})

			it('a moderator deletes any comment but edits only their own', () => {
				const { client, deliver, stored } = setup({ seed })
				const mod = client('mod', actor('mo', 'moderator'))
				mod.store.update(annComment.id, (c: any) => ({ ...c, body: toRichText('edited') }))
				deliver()
				expect((stored(annComment.id) as any).body).toEqual(annComment.body)
				mod.store.update(annComment.id, (c: any) => ({ ...c, isDeleted: true }))
				deliver()
				expect((stored(annComment.id) as any).isDeleted).toBe(true)
			})

			it('a soft delete cannot carry an edit, cannot be undone, and clients never hard-delete', () => {
				const { client, deliver, stored } = setup({ seed })
				const ann = client('ann', actor('ann', 'commenter'))
				ann.store.update(annComment.id, (c: any) => ({
					...c,
					isDeleted: true,
					body: toRichText('x'),
				}))
				deliver()
				expect((stored(annComment.id) as any).isDeleted).toBe(false)
				ann.store.remove([annComment.id])
				deliver()
				expect(stored(annComment.id)).toBeDefined()
				ann.store.update(annComment.id, (c: any) => ({ ...c, isDeleted: true }))
				ann.store.update(annComment.id, (c: any) => ({ ...c, isDeleted: false }))
				deliver()
				expect((stored(annComment.id) as any).isDeleted).toBe(true)
			})

			it('anyone who may comment resolves a thread, but only in their own name', () => {
				const { client, deliver, stored } = setup({ seed })
				const bob = client('bob', actor('bob', 'commenter'))
				bob.store.update(thread.id, (t: any) => ({ ...t, resolved: { at: 1, by: 'ann' } }))
				deliver()
				expect((stored(thread.id) as any).resolved).toBe(null)
				bob.store.update(thread.id, (t: any) => ({ ...t, resolved: { at: 1, by: 'bob' } }))
				deliver()
				expect((stored(thread.id) as any).resolved).toEqual({ at: 1, by: 'bob' })
			})

			it('reactions: own, canonical id, deleted only by the reactor', () => {
				const { client, deliver, stored } = setup({ seed })
				const bob = client('bob', actor('bob', 'commenter'))
				const own = createCommentReaction({
					commentId: annComment.id,
					threadId: thread.id,
					pageId: PAGE_1,
					userId: 'bob',
					emoji: '👍',
				})
				const forged = { ...own, id: 'comment-reaction:forged' }
				bob.store.put([own])
				bob.store.put([forged])
				deliver()
				expect(stored(own.id)).toBeDefined()
				expect(stored(forged.id)).toBeUndefined()
			})

			it('the UI asks the same rules through actions', () => {
				const { schema } = setup({ seed })
				const get = () => undefined
				const mod = actor('mo', 'moderator')
				const bob = actor('bob', 'commenter')
				const ask = (who: PolicyActor, action: string) =>
					schema.authorize(who, { verb: 'action', action, record: annComment as any }, get)
				expect([
					ask(mod, 'edit'),
					ask(mod, 'delete'),
					ask(bob, 'edit'),
					ask(bob, 'delete'),
				]).toEqual([false, true, false, false])
				expect(
					schema.authorize(bob, { verb: 'action', action: 'resolve', record: thread as any }, get)
				).toBe(true)
			})
		})

		describe('plugin types and actions', () => {
			it('a plugin type brings its own policy', () => {
				const { client, deliver, stored } = setup({ seed: [page(PAGE_1)] })
				const voter = client('voter', createPolicyActor({ id: 'vi', actions: ['votes:cast'] }))
				voter.store.put([{ id: 'vote:1', typeName: 'vote', userId: 'vi', choice: 'a' }])
				voter.store.put([{ id: 'vote:2', typeName: 'vote', userId: 'someone', choice: 'a' }])
				deliver()
				expect(stored('vote:1')).toBeDefined()
				expect(stored('vote:2')).toBeUndefined()
			})

			it('a plugin type that forgot its policy needs document:write (fail closed)', () => {
				const { client, deliver, stored } = setup({ seed: [page(PAGE_1)] })
				const c = client('commenter', actor('cara', 'commenter'))
				c.store.put([{ id: 'forgotten:1', typeName: 'forgotten', text: 'x' }])
				const e = client('editor', actor('ed', 'editor'))
				e.store.put([{ id: 'forgotten:2', typeName: 'forgotten', text: 'x' }])
				deliver()
				expect(stored('forgotten:1')).toBeUndefined()
				expect(stored('forgotten:2')).toBeDefined()
			})

			it('a shape type (ShapeUtil.policy) narrows the shape policy for its own shapes', () => {
				const schema = createTLSchema({
					shapes: {
						box: { props: { w: num, h: num } },
						// a sticker: anyone with stickers:add adds one, nobody moves it after
						sticker: {
							props: {},
							policy: {
								create: (ctx) => ctx.can('stickers:add') || ctx.base(),
								update: (ctx) =>
									ctx.base() && ctx.prev.x === ctx.next.x && ctx.prev.y === ctx.next.y,
							} satisfies RecordPolicy<TLShape>,
						},
					},
					bindings: {},
				})
				const get = () => undefined
				const sticker = { ...box('s', null), type: 'sticker', props: {} } as unknown as TLShape
				const kid = createPolicyActor({ id: 'kid', actions: ['stickers:add'] })
				const ed = actor('ed', 'editor')
				expect(schema.authorize(kid, { verb: 'create', next: sticker }, get)).toBe(true)
				expect(schema.authorize(kid, { verb: 'create', next: box('b', null) }, get)).toBe(false)
				expect(
					schema.authorize(ed, { verb: 'update', prev: sticker, next: { ...sticker, x: 5 } }, get)
				).toBe(false)
				expect(
					schema.authorize(
						ed,
						{ verb: 'update', prev: sticker, next: { ...sticker, opacity: 0.5 } },
						get
					)
				).toBe(true)
			})
		})

		describe('an agent may write only inside frame X', () => {
			const frame = box('frame-x', 'teacher')
			const seed = [page(PAGE_1), frame, box('outside', 'teacher')]
			const agent = createPolicyActor({ id: 'agent', actions: ['agent'] })

			it('creates and moves inside, never outside, and never moves a shape out', () => {
				const { client, deliver, stored } = setup({ policies: agentArea, seed })
				const a = client('agent', agent)
				a.store.put([box('in', 'agent', FRAME_X)])
				a.store.put([box('out', 'agent', PAGE_1)])
				a.store.update(createShapeId('outside'), (s: any) => ({ ...s, x: 9 }))
				deliver()
				a.store.update(createShapeId('in'), (s: any) => ({ ...s, parentId: PAGE_1 }))
				deliver()
				expect((stored(createShapeId('in')) as any).parentId).toBe(FRAME_X)
				expect(stored(createShapeId('out'))).toBeUndefined()
				expect((stored(createShapeId('outside')) as any).x).toBe(0)
			})
		})

		describe('page access', () => {
			it('edit access on one page only', () => {
				const seed = [page(PAGE_1), page(PAGE_2), box('p1', 'x', PAGE_1), box('p2', 'x', PAGE_2)]
				const { client, deliver, stored } = setup({ policies: perPageEdit, seed })
				const c = client('c', createPolicyActor({ id: 'c', actions: [`pages:write:${PAGE_1}`] }))
				c.store.update(createShapeId('p1'), (s: any) => ({ ...s, x: 1 }))
				c.store.update(createShapeId('p2'), (s: any) => ({ ...s, x: 1 }))
				c.store.update(createShapeId('p1'), (s: any) => ({ ...s, parentId: PAGE_2 }))
				deliver()
				expect((stored(createShapeId('p1')) as any).x).toBe(1)
				expect((stored(createShapeId('p1')) as any).parentId).toBe(PAGE_1)
				expect((stored(createShapeId('p2')) as any).x).toBe(0)
			})

			it('edit shapes, but not pages', () => {
				const seed = [page(PAGE_1)]
				const policies: TLPolicies = {
					page: {
						create: (ctx) => ctx.can('pages:manage'),
						update: (ctx) => ctx.can('pages:manage'),
						delete: (ctx) => ctx.can('pages:manage'),
					},
				}
				const { client, deliver, stored } = setup({ policies, seed })
				const c = client('c', actor('c', 'editor'))
				c.store.put([box('b', 'c')])
				c.store.update(PAGE_1, (p: any) => ({ ...p, name: 'renamed' }))
				deliver()
				expect(stored(createShapeId('b'))).toBeDefined()
				expect((stored(PAGE_1) as any).name).toBe(PAGE_1)
			})
		})

		describe('read control', () => {
			const seed = () => [
				page(PAGE_1),
				page(PAGE_2, { private: true }),
				box('public', 'teacher', PAGE_1),
				box('secret', 'teacher', PAGE_2),
				box('secret-child', 'teacher', createShapeId('secret')),
				link('cross', createShapeId('public'), createShapeId('secret')),
			]
			const teacher = createPolicyActor({
				id: 'teacher',
				actions: ['document:write', 'pages:read-private'],
			})
			const student = actor('sam', 'student')

			it('a session receives only the pages, shapes, and bindings it may read', () => {
				const { client } = setup({ policies: privatePages, seed: seed() })
				const t = client('teacher', teacher)
				const s = client('sam', student)
				expect(ids(t.store, 'page')).toEqual([PAGE_2, PAGE_1].sort())
				expect(ids(s.store, 'page')).toEqual([PAGE_1])
				expect(ids(s.store, 'shape')).toEqual([createShapeId('public')])
				expect(ids(s.store, 'binding')).toEqual([])
				expect(ids(t.store, 'shape')).toHaveLength(3)
			})

			it('records appear and disappear when the rule’s inputs change, not only the record', () => {
				const { client, deliver } = setup({ policies: privatePages, seed: seed() })
				const t = client('teacher', teacher)
				const s = client('sam', student)
				t.store.update(PAGE_2, (p: any) => ({ ...p, meta: {} }))
				deliver()
				expect(ids(s.store, 'page')).toEqual([PAGE_2, PAGE_1].sort())
				expect(ids(s.store, 'shape')).toHaveLength(3)
				expect(ids(s.store, 'binding')).toEqual([createBindingId('cross')])
				t.store.update(PAGE_2, (p: any) => ({ ...p, meta: { private: true } }))
				deliver()
				expect(ids(s.store, 'page')).toEqual([PAGE_1])
				expect(ids(s.store, 'shape')).toEqual([createShapeId('public')])
				expect(ids(s.store, 'binding')).toEqual([])
			})

			it('a change to a hidden record sends nothing to the session that cannot read it', () => {
				const { client, deliver } = setup({ policies: privatePages, seed: seed() })
				const t = client('teacher', teacher)
				const s = client('sam', student)
				t.store.update(createShapeId('secret'), (r: any) => ({ ...r, x: 42 }))
				deliver()
				expect(t.store.get(createShapeId('secret'))!.x).toBe(42)
				expect(JSON.stringify(s.received)).not.toContain('shape:secret')
				expect(JSON.stringify(t.received)).toContain('shape:secret')
			})

			it('moving a shape to a private page removes it for the student', () => {
				const { client, deliver } = setup({ policies: privatePages, seed: seed() })
				const t = client('teacher', teacher)
				const s = client('sam', student)
				t.store.update(createShapeId('public'), (r: any) => ({ ...r, parentId: PAGE_2 }))
				deliver()
				expect(ids(s.store, 'shape')).toEqual([])
			})
		})

		describe('live access changes', () => {
			it('a revoked editor’s next push is denied without a reconnect', () => {
				const { client, deliver, stored } = setup({ seed: [page(PAGE_1)] })
				const ed = client('ed', actor('ed', 'editor'), { guard: false })
				ed.store.put([box('one', 'ed')])
				deliver()
				ed.setActor(actor('ed', 'viewer'))
				ed.store.put([box('two', 'ed')])
				deliver()
				expect(stored(createShapeId('one'))).toBeDefined()
				expect(stored(createShapeId('two'))).toBeUndefined()
			})
		})
	})
}

describe('access changes, resume, and presence', () => {
	const seed = () => [
		page(PAGE_1),
		page(PAGE_2, { private: true }),
		box('public', 'teacher', PAGE_1),
		box('secret', 'teacher', PAGE_2),
	]
	const reader = createPolicyActor({ id: 'sam', actions: ['pages:read-private'] })
	const student = actor('sam', 'student')
	const presenceOn = (userId: string, pageId: TLPageId) =>
		InstancePresenceRecordType.create({
			id: InstancePresenceRecordType.createId(userId),
			userId: `user:${userId}` as any,
			userName: userId,
			currentPageId: pageId,
		})

	it('refreshAccess sends and removes records when a session’s read access changes', () => {
		const { server, client, deliver } = setup({ policies: privatePages, seed: seed() })
		const s = client('sam', student)
		expect(ids(s.store, 'shape')).toEqual([createShapeId('public')])

		s.setActor(reader)
		server.room.refreshAccess('sam')
		deliver()
		expect(ids(s.store, 'page')).toEqual([PAGE_2, PAGE_1].sort())
		expect(ids(s.store, 'shape')).toEqual([createShapeId('public'), createShapeId('secret')].sort())

		s.setActor(student)
		server.room.refreshAccess()
		deliver()
		expect(ids(s.store, 'page')).toEqual([PAGE_1])
		expect(ids(s.store, 'shape')).toEqual([createShapeId('public')])
	})

	it('a resumed session keeps its socket when its access is unchanged, and reconnects when it changed', () => {
		const { server, client, schema } = setup({ policies: privatePages, seed: seed() })
		client('sam', student)
		const readViewHash = server.room.getReadViewHash('sam')
		expect(readViewHash).toBeDefined()
		const resume = (sessionId: string, hash: string | undefined) => {
			const socket = { isOpen: true, sendMessage: vi.fn(), close: vi.fn() }
			server.room.handleResumedSession({
				sessionId,
				socket,
				meta: undefined,
				isReadonly: false,
				serializedSchema: schema.serialize(),
				presenceId: null,
				presenceRecord: null,
				requiresLegacyRejection: false,
				supportsStringAppend: true,
				readViewHash: hash,
			})
			return socket
		}
		expect(resume('sam', readViewHash).close).not.toHaveBeenCalled()
		// The room only knows sessions through getActor, keyed here by session id.
		server.room.sessions.delete('sam')
		const roomActors = (server.room as any).getActorOpt
		;(server.room as any).getActorOpt = () => reader
		expect(resume('sam', readViewHash).close).toHaveBeenCalled()
		// A snapshot without a hash, from before read filtering, also reconnects.
		;(server.room as any).getActorOpt = () => student
		expect(resume('ann', undefined).close).toHaveBeenCalled()
		;(server.room as any).getActorOpt = roomActors
	})

	it('a session sees another user’s presence only while it may read that user’s page', () => {
		const { client, deliver } = setup({ policies: privatePages, seed: seed() })
		const t = client(
			'teacher',
			createPolicyActor({ id: 'teacher', actions: ['document:write', 'pages:read-private'] }),
			{ presence: presenceOn('teacher', PAGE_2) }
		)
		const s = client('sam', student)
		const viewer = client('vi', reader)
		deliver()
		// The room gives each presence its own id, so compare by user.
		const presences = (c: Client) =>
			c.store
				.allRecords()
				.filter((r: any) => r.typeName === 'instance_presence')
				.map((r: any) => r.userId)
		expect(presences(viewer)).toEqual(['user:teacher'])
		expect(presences(s)).toEqual([])

		// The page becomes public: its visitors' presence follows.
		t.store.update(PAGE_2, (p: any) => ({ ...p, meta: {} }))
		deliver()
		expect(presences(s)).toEqual(['user:teacher'])
		// A session never receives its own presence.
		expect(presences(t)).toEqual([])
	})

	it('a rule that stops reading a record is no longer re-checked when that record changes', () => {
		const { server, client, deliver } = setup({ policies: privatePages, seed: seed() })
		const t = client(
			'teacher',
			createPolicyActor({ id: 'teacher', actions: ['document:write', 'pages:read-private'] })
		)
		client('sam', student)
		const view = () => (server.room.sessions.get('sam') as any).readView
		expect(view().dependents.get(PAGE_2)).toContain(createShapeId('secret'))
		t.store.update(createShapeId('secret'), (r: any) => ({ ...r, parentId: PAGE_1 }))
		deliver()
		expect(view().dependents.get(PAGE_2) ?? new Set()).not.toContain(createShapeId('secret'))
		expect(view().dependents.get(PAGE_1)).toContain(createShapeId('secret'))
	})
})

describe('cost', () => {
	// One 1,000 shape push from a student, with 5 viewers connected, with and without policies.
	function run(withPolicies: boolean) {
		const shapes = Array.from({ length: 1000 }, (_, i) => box(`s${i}`, 'sam'))
		const { client, deliver, stored } = setup({
			policies: {
				...classroom,
				...privatePages,
				shape: { ...classroom.shape, ...privatePages.shape },
			},
			seed: [page(PAGE_1), page(PAGE_2, { private: true })],
		})
		const who = (id: string, role: keyof typeof actions) => (withPolicies ? actor(id, role) : null)
		const sam = client('sam', who('sam', 'student'))
		for (let i = 0; i < 5; i++) client(`viewer${i}`, who(`v${i}`, 'viewer'))
		const t0 = performance.now()
		sam.store.put(shapes)
		const local = performance.now() - t0
		const t1 = performance.now()
		deliver()
		const server = performance.now() - t1
		expect(stored(shapes[999].id)).toBeDefined()
		return { local, server }
	}

	it('stays in the same order of magnitude as no policies', () => {
		run(true) // warm up
		const base = run(false)
		const policies = run(true)
		// Generous bounds: a smoke test for accidental O(n²), not a benchmark.
		expect(policies.local).toBeLessThan(base.local * 10 + 50)
		expect(policies.server).toBeLessThan(base.server * 10 + 200)
		// eslint-disable-next-line no-console
		console.log(
			`1,000 shapes: client ${base.local.toFixed(1)} → ${policies.local.toFixed(1)} ms, ` +
				`server + 6 sessions ${base.server.toFixed(1)} → ${policies.server.toFixed(1)} ms`
		)
	})

	it('measures one small edit in a large room, with read filtering', () => {
		const shapes = Array.from({ length: 5000 }, (_, i) => box(`s${i}`, 'teacher'))
		const timeEdit = (withPolicies: boolean) => {
			const { client, deliver } = setup({
				policies: privatePages,
				seed: [page(PAGE_1), page(PAGE_2, { private: true }), ...shapes],
			})
			const t = client('teacher', withPolicies ? actor('teacher', 'editor') : null)
			for (let i = 0; i < 9; i++)
				client(`viewer${i}`, withPolicies ? actor(`v${i}`, 'viewer') : null)
			const t0 = performance.now()
			for (let i = 0; i < 10; i++) {
				t.store.update(shapes[i].id, (r: any) => ({ ...r, x: i + 1 }))
				deliver()
			}
			return (performance.now() - t0) / 10
		}
		timeEdit(true) // warm up
		const base = timeEdit(false)
		const filtered = timeEdit(true)
		expect(filtered).toBeLessThan(base * 50 + 500)
		// eslint-disable-next-line no-console
		console.log(
			`one edit, 5,000 shapes, 10 sessions: ${base.toFixed(1)} → ${filtered.toFixed(1)} ms per edit`
		)
	})
})
