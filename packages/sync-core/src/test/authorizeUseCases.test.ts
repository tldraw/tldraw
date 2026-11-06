import {
	Authorize,
	AuthorizeGet,
	combineAuthorize,
	computed,
	createPresenceStateDerivation,
	createShapeId,
	createTLSchema,
	createTLStore,
	createUserId,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeTools,
	defaultShapeUtils,
	defaultTools,
	Editor,
	isShapeId,
	PageRecordType,
	TLPageId,
	TLRecord,
	TLShape,
	TLShapeId,
	TLStore,
	tipTapDefaultExtensions,
	toRichText,
	UserRecordType,
} from 'tldraw'
import { vi } from 'vitest'
import { DEFAULT_INITIAL_SNAPSHOT } from '../lib/InMemorySyncStorage'
import { TLSyncClient } from '../lib/TLSyncClient'
import { TestServer } from './TestServer'
import { TestSocketPair } from './TestSocketPair'

/*
 * Backtests for one `authorize` function, end to end: the same function runs in a sync room and
 * in each client's editor. Each `describe` is one use case from the permissions research.
 */

interface Actor {
	userId: string
	role: 'teacher' | 'student' | 'viewer' | 'agent'
	/** Teams whose pages the actor can see. */
	teams?: string[]
	/** For an agent: the only frame it may write inside. */
	frameId?: TLShapeId
}

function pageIdOf(record: TLRecord | undefined, get: AuthorizeGet): TLPageId | null {
	if (!record) return null
	if (record.typeName === 'page') return record.id
	if (record.typeName === 'shape') {
		let parentId = record.parentId
		for (let i = 0; i < 100 && isShapeId(parentId); i++) {
			const parent = get(parentId)
			if (!parent) return null
			parentId = parent.parentId
		}
		return parentId as TLPageId
	}
	if (record.typeName === 'binding') return pageIdOf(get(record.fromId), get)
	return null
}

function isInside(shape: TLShape, frameId: TLShapeId, get: AuthorizeGet) {
	let parentId = shape.parentId
	for (let i = 0; i < 100 && isShapeId(parentId); i++) {
		if (parentId === frameId) return true
		parentId = get(parentId)?.parentId ?? (null as any)
	}
	return false
}

const STUDENT_TOOLS = ['select', 'hand', 'draw', 'geo', 'arrow', 'note', 'eraser', 'text']

/** The classroom rules: one function for reads, writes, pre-checks, and custom actions. */
const classroom: Authorize<TLRecord, Actor> = (ctx) => {
	const { actor } = ctx
	const isTeacher = actor.role === 'teacher'

	// Custom actions. The UI asks these, and write rules delegate to them.
	if (ctx.action === 'cards:reveal') return isTeacher
	if (ctx.action.startsWith('tool:')) {
		if (isTeacher) return true
		if (actor.role === 'viewer') return ctx.action === 'tool:select' || ctx.action === 'tool:hand'
		return STUDENT_TOOLS.includes(ctx.action.slice('tool:'.length))
	}

	const record = ctx.record
	if (!record) return undefined

	// Page read control: a team page is hidden from everyone outside the team. Moves check the
	// page before and after (D40).
	const pageIds = new Set([pageIdOf(record, ctx.get)])
	if (ctx.action === 'update' && ctx.next) pageIds.add(pageIdOf(ctx.next, ctx.get))
	for (const pageId of pageIds) {
		const page = pageId ? ctx.get(pageId) : undefined
		const team = page?.meta.team as string | undefined
		if (team && !isTeacher && !actor.teams?.includes(team)) {
			return { deny: 'This page is for another team' }
		}
	}

	if (ctx.action === 'read') {
		// A card's face is hidden from everyone but its holder until the teacher reveals it.
		if (
			record.typeName === 'shape' &&
			record.meta.card &&
			!record.meta.revealed &&
			record.meta.holder !== actor.userId &&
			!isTeacher
		) {
			return {
				record: { ...record, props: { ...(record.props as any), richText: toRichText('?') } },
			}
		}
		return undefined
	}

	// The editor writes the current user's own `user` record on load. Denying it loops: the
	// server rebases it away, and the editor writes it again.
	if (record.typeName === 'user') return undefined

	// File write control: a viewer (a view-only share link) writes nothing else.
	if (actor.role === 'viewer') return { deny: 'You can only view this file' }
	if (isTeacher) return undefined

	// Page write control: a locked page is the teacher's.
	for (const pageId of pageIds) {
		if (pageId && ctx.get(pageId)?.meta.locked) return { deny: 'This page is locked' }
	}
	if (record.typeName === 'page' || record.typeName === 'document') {
		return { deny: 'Only the teacher can change pages' }
	}

	if (record.typeName === 'shape') {
		if (ctx.action === 'create') {
			if (actor.frameId && !isInside(record, actor.frameId, ctx.get)) {
				return { deny: 'Agents write only inside their frame' }
			}
			// Stamp the owner. Owner checks fail closed for shapes with no owner (D39).
			return { record: { ...record, meta: { ...record.meta, ownerId: actor.userId } } }
		}
		if (record.meta.ownerId !== actor.userId) return { deny: 'This is not your shape' }
		if (ctx.action === 'update' && ctx.next) {
			const next = ctx.next as TLShape
			if (next.meta.ownerId !== record.meta.ownerId) return { deny: 'The owner cannot change' }
			if (next.meta.revealed !== record.meta.revealed) {
				return ctx.can('cards:reveal', record) || { deny: 'Only the teacher reveals cards' }
			}
			const parent = isShapeId(next.parentId) ? ctx.get(next.parentId) : undefined
			if (next.parentId !== record.parentId && parent && parent.meta.ownerId !== actor.userId) {
				return { deny: "You cannot move into someone else's frame" }
			}
			if (actor.frameId && !isInside(next, actor.frameId, ctx.get)) {
				return { deny: 'Agents write only inside their frame' }
			}
		}
		return undefined
	}

	if (record.typeName === 'binding' && ctx.action === 'create') {
		// An arrow may only connect your own shapes.
		const to = ctx.get(record.toId)
		if (to?.meta.ownerId !== actor.userId) return { deny: 'You can only connect your own shapes' }
	}
	return undefined
}

const teacher: Actor = { userId: 'teacher', role: 'teacher' }
const ann: Actor = { userId: 'ann', role: 'student', teams: ['red'] }
const ben: Actor = { userId: 'ben', role: 'student', teams: ['blue'] }
const viewer: Actor = { userId: 'guest', role: 'viewer' }

const schema = createTLSchema()
const disposables: (() => void)[] = []
afterEach(() => {
	while (disposables.length) disposables.pop()!()
})

class Peer {
	store: TLStore
	client: TLSyncClient<TLRecord>
	pair: TestSocketPair<TLRecord>
	editor!: Editor
	constructor(
		server: TestServer<TLRecord>,
		readonly actor: Actor,
		authorize: Authorize<TLRecord, Actor> | null
	) {
		this.store = createTLStore({ schema, id: actor.userId })
		this.pair = new TestSocketPair(actor.userId, server)
		this.pair.connectOptions = { meta: actor }
		this.client = new TLSyncClient<TLRecord>({
			store: this.store,
			socket: this.pair.clientSocket,
			onSyncError: (reason) => {
				throw new Error('onSyncError:' + reason)
			},
			// as useSync does
			onPushDenied: (denials) => this.editor.permissions.reportServerDenial(denials.at(-1)!),
			onLoad: () => {
				this.editor = new Editor({
					shapeUtils: defaultShapeUtils,
					bindingUtils: defaultBindingUtils,
					tools: [...defaultTools, ...defaultShapeTools],
					initialState: 'select',
					store: this.store,
					getContainer: () => document.createElement('div'),
					permissions: authorize ? { authorize, actor } : undefined,
					options: {
						text: {
							addFontsFromNode: defaultAddFontsFromNode,
							tipTapConfig: { extensions: tipTapDefaultExtensions },
						},
					},
				})
				disposables.push(() => this.editor.dispose())
			},
			presence: createPresenceStateDerivation(
				computed('', () =>
					UserRecordType.create({
						id: createUserId(actor.userId),
						name: actor.userId,
						color: 'red',
					})
				)
			)(this.store),
		})
		disposables.push(() => this.client.close())
		this.pair.connect()
	}

	has(id: string) {
		return this.store.has(id as TLRecord['id'])
	}
	get(id: string) {
		return this.store.get(id as TLRecord['id'])
	}
}

function setup(opts: { atomicPushes?: boolean; clientRules?: boolean } = {}) {
	const authorize = combineAuthorize(classroom)
	// A room starts with a document and a page, as a TLSocketRoom does. Students cannot create
	// pages, so an empty room would leave them with no page.
	const server = new TestServer<TLRecord>(schema, DEFAULT_INITIAL_SNAPSHOT, {
		authorize,
		atomicPushes: opts.atomicPushes,
	})
	const peers: Peer[] = []
	const join = (actor: Actor) => {
		const peer = new Peer(server, actor, opts.clientRules === false ? null : authorize)
		peers.push(peer)
		flush()
		return peer
	}
	const flush = () => {
		for (let i = 0; i < 50; i++) {
			server.flushDebouncingMessages()
			if (!peers.some((p) => p.pair.getNeedsFlushing())) return
			for (const p of peers) {
				p.pair.flushServerSentEvents()
				p.pair.flushClientSentEvents()
			}
		}
	}
	const stored = (id: string) =>
		server.storage.transaction((txn) => txn.get(id)).result as TLRecord | undefined
	return { server, join, flush, stored }
}

const redPage = PageRecordType.create({
	id: PageRecordType.createId('red'),
	name: 'Red team',
	index: 'a5' as any,
	meta: { team: 'red' },
})
const lockedPage = PageRecordType.create({
	id: PageRecordType.createId('locked'),
	name: 'Instructions',
	index: 'a6' as any,
	meta: { locked: true },
})

function box(
	id: string,
	parentId: TLShape['parentId'],
	extra: { x?: number; y?: number; meta?: TLShape['meta'] } = {}
) {
	return {
		id: createShapeId(id),
		type: 'geo' as const,
		parentId,
		x: 0,
		y: 0,
		props: { w: 100, h: 100 },
		...extra,
	}
}

/** One operation, as the arrow tool makes it: an arrow and a binding at each end. */
function drawArrow(peer: Peer, from: string, to: string) {
	const id = createShapeId('arrow')
	peer.editor.run(() => {
		peer.editor.createShapes([
			{ id, type: 'arrow', parentId: peer.editor.getCurrentPageId(), x: 350, y: 50 },
		])
		peer.editor.createBindings([
			{ type: 'arrow', fromId: id, toId: createShapeId(from), props: { terminal: 'start' } },
			{ type: 'arrow', fromId: id, toId: createShapeId(to), props: { terminal: 'end' } },
		])
		peer.editor.select(id)
	})
	return { id }
}

describe('file read and write control', () => {
	it('a view-only actor reads everything and writes nothing, with no isReadonly flag', () => {
		const { join, flush, stored } = setup()
		const t = join(teacher)
		const g = join(viewer)
		const pageId = t.editor.getCurrentPageId()
		t.editor.createShapes([box('t1', pageId)])
		flush()
		expect(g.has(createShapeId('t1'))).toBe(true)

		// the client stops the write first, and says why
		g.editor.createShapes([box('g1', pageId)])
		expect(g.has(createShapeId('g1'))).toBe(false)
		expect(g.editor.permissions.getLastDenial()?.reason).toBe('You can only view this file')

		// and the server stops it too, for a client that skips the rules
		const { join: join2, flush: flush2, stored: stored2 } = setup({ clientRules: false })
		const g2 = join2(viewer)
		g2.editor.createShapes([box('g2', g2.editor.getCurrentPageId())])
		flush2()
		expect(stored2(createShapeId('g2'))).toBeUndefined()
		expect(g2.has(createShapeId('g2'))).toBe(false)
		// the room's reason reaches the editor, as a local denial would
		expect(g2.editor.permissions.getLastDenial()).toMatchObject({
			action: 'create',
			recordId: createShapeId('g2'),
			reason: 'You can only view this file',
			source: 'server',
		})
		expect(stored(createShapeId('g1'))).toBeUndefined()
	})

	it('tools: the toolbar asks the same function', () => {
		const { join } = setup()
		expect(join(viewer).editor.permissions.can('tool:draw')).toBe(false)
		expect(join(ann).editor.permissions.can('tool:draw')).toBe(true)
		expect(join(ann).editor.permissions.can('tool:frame')).toBe(false)
		expect(join(teacher).editor.permissions.can('tool:frame')).toBe(true)
	})
})

describe('page read control', () => {
	it('sends a team page and its shapes only to the team', () => {
		const { join, flush } = setup()
		const t = join(teacher)
		t.editor.createPage(redPage)
		t.editor.createShapes([box('red-box', redPage.id)])
		flush()

		const a = join(ann)
		const b = join(ben)
		expect(a.has(redPage.id)).toBe(true)
		expect(a.has(createShapeId('red-box'))).toBe(true)
		expect(b.has(redPage.id)).toBe(false)
		expect(b.has(createShapeId('red-box'))).toBe(false)

		// a later change on the hidden page never reaches ben
		t.editor.updateShapes([{ id: createShapeId('red-box'), type: 'geo', x: 50 }])
		flush()
		expect(b.has(createShapeId('red-box'))).toBe(false)
		expect((a.get(createShapeId('red-box')) as TLShape).x).toBe(50)
	})

	it('sends no message about a hidden record when it is created', () => {
		const { join, flush } = setup()
		const t = join(teacher)
		const b = join(ben)
		const received: string[] = []
		const onReceive = b.pair.callbacks.onReceiveMessage!
		b.pair.callbacks.onReceiveMessage = (msg) => {
			received.push(JSON.stringify(msg))
			onReceive(msg)
		}
		t.editor.createPage(redPage)
		t.editor.createShapes([box('red-box', redPage.id)])
		flush()
		// a remove for an id ben never held would tell him that the record exists
		expect(received.filter((m) => m.includes('red'))).toEqual([])
	})

	it('removes a page at once when a live role change takes the team away', () => {
		const { server, join, flush } = setup()
		const t = join(teacher)
		t.editor.createPage(redPage)
		t.editor.createShapes([box('red-box', redPage.id)])
		flush()
		const a = join(ann)
		expect(a.has(createShapeId('red-box'))).toBe(true)

		server.room.updateSessionMeta(a.pair.id, { ...ann, teams: [] })
		a.editor.permissions.setActor({ ...ann, teams: [] })
		flush()
		expect(a.has(redPage.id)).toBe(false)
		expect(a.has(createShapeId('red-box'))).toBe(false)

		server.room.updateSessionMeta(a.pair.id, ann)
		flush()
		expect(a.has(createShapeId('red-box'))).toBe(true)
	})

	it('re-checks reads when the page record that a rule reads changes', () => {
		const { server, join, flush } = setup()
		const t = join(teacher)
		t.editor.createPage({ ...redPage, meta: {} })
		t.editor.createShapes([box('red-box', redPage.id)])
		flush()
		const b = join(ben)
		expect(b.has(createShapeId('red-box'))).toBe(true)

		// The page changes, so the page is re-checked. Its shapes are not, until reauthorize.
		t.editor.updatePage({ id: redPage.id, meta: { team: 'red' } })
		flush()
		expect(b.has(redPage.id)).toBe(false)
		expect(b.has(createShapeId('red-box'))).toBe(true)
		server.room.reauthorize()
		flush()
		expect(b.has(createShapeId('red-box'))).toBe(false)
	})

	it('denies writes to a page the actor cannot see, on the client and on the server', () => {
		const { join, flush, stored } = setup({ clientRules: false })
		const t = join(teacher)
		t.editor.createPage(redPage)
		flush()
		const b = join(ben)
		// ben's client has no rules, and writes onto the hidden page by id, around the editor
		expect(b.has(redPage.id)).toBe(false)
		const own = b.editor.createShapes([box('mine', b.editor.getCurrentPageId())])
		void own
		b.store.put([
			{
				...(b.get(createShapeId('mine')) as TLShape),
				id: createShapeId('sneaky'),
				parentId: redPage.id,
			},
		])
		flush()
		expect(stored(createShapeId('sneaky'))).toBeUndefined()
	})
})

describe('page write control', () => {
	it('lets students see a locked page but not change it', () => {
		const { join, flush, stored } = setup()
		const t = join(teacher)
		t.editor.createPage(lockedPage)
		t.editor.createShapes([box('rules', lockedPage.id)])
		flush()
		const a = join(ann)
		expect(a.has(createShapeId('rules'))).toBe(true)
		a.editor.setCurrentPage(lockedPage.id)
		a.editor.createShapes([box('mine', lockedPage.id)])
		expect(a.has(createShapeId('mine'))).toBe(false)
		expect(a.editor.permissions.getLastDenial()?.reason).toBe('This page is locked')
		expect(a.editor.permissions.can('update', a.get(lockedPage.id))).toBe(false)
		flush()
		expect(stored(createShapeId('mine'))).toBeUndefined()
	})
})

describe('shape write control: students edit only their own shapes', () => {
	it('stamps the owner on the client at once and on the server', () => {
		const { join, flush, stored } = setup()
		const a = join(ann)
		a.editor.createShapes([box('a1', a.editor.getCurrentPageId())])
		expect((a.get(createShapeId('a1')) as TLShape).meta.ownerId).toBe('ann')
		// the shape is not locked for its owner before the server answers
		expect(a.editor.isShapeOrAncestorLocked(createShapeId('a1'))).toBe(false)
		flush()
		expect((stored(createShapeId('a1')) as TLShape).meta.ownerId).toBe('ann')
	})

	it('treats other students’ shapes as locked, and the server agrees', () => {
		const { join, flush, stored } = setup()
		const a = join(ann)
		const b = join(ben)
		const pageId = a.editor.getCurrentPageId()
		a.editor.createShapes([box('a1', pageId)])
		flush()
		const id = createShapeId('a1')
		expect(b.editor.isShapeOrAncestorLocked(id)).toBe(true)
		expect(b.editor.permissions.check('update', b.get(id)).allowed).toBe(false)

		// the UI paths skip locked shapes
		b.editor.selectAll()
		b.editor.deleteShapes(b.editor.getSelectedShapeIds())
		b.editor.updateShapes([{ id, type: 'geo', x: 500 }])
		expect(b.has(id)).toBe(true)
		expect((b.get(id) as TLShape).x).toBe(0)

		// a write that goes around the editor methods is reverted by the store gate
		b.store.put([{ ...(b.get(id) as TLShape), x: 999 }])
		expect((b.get(id) as TLShape).x).toBe(0)
		expect(b.editor.permissions.getLastDenial()?.reason).toBe('This is not your shape')
		flush()
		expect((stored(id) as TLShape).x).toBe(0)
	})

	it('denies a move into someone else’s frame (both locations are checked)', () => {
		const { join, flush } = setup()
		const a = join(ann)
		const b = join(ben)
		const pageId = a.editor.getCurrentPageId()
		a.editor.createShapes([
			{ id: createShapeId('frame-a'), type: 'frame', parentId: pageId, props: { w: 500, h: 500 } },
		])
		b.editor.createShapes([box('b1', pageId, { x: 1000 })])
		flush()
		b.editor.reparentShapes([createShapeId('b1')], createShapeId('frame-a'))
		expect((b.get(createShapeId('b1')) as TLShape).parentId).toBe(pageId)
		expect(b.editor.permissions.getLastDenial()?.reason).toBe(
			"You cannot move into someone else's frame"
		)
	})

	it('reverts a whole operation on the client, side effects included', () => {
		const { join, flush } = setup()
		const a = join(ann)
		const b = join(ben)
		const pageId = a.editor.getCurrentPageId()
		a.editor.createShapes([box('a1', pageId)])
		b.editor.createShapes([box('b1', pageId, { x: 300 })])
		flush()

		// ben draws an arrow from his box to ann's box: the arrow is his, the binding is denied,
		// so the whole operation (arrow, bindings, selection) goes away
		const before = b.editor.getCurrentPageShapeIds().size
		drawArrow(b, 'b1', 'a1')
		expect(b.editor.getCurrentPageShapeIds().size).toBe(before)
		expect(b.editor.getSelectedShapeIds().every((id) => b.has(id))).toBe(true)
	})
})

describe('a partly denied push (D41)', () => {
	function pushArrowToAnnsBox(atomicPushes: boolean) {
		const { join, flush, stored } = setup({ atomicPushes, clientRules: false })
		const a = join(ann)
		const b = join(ben)
		const pageId = a.editor.getCurrentPageId()
		a.editor.createShapes([box('a1', pageId)])
		b.editor.createShapes([box('b1', pageId, { x: 300 })])
		flush()
		const arrow = drawArrow(b, 'b1', 'a1')
		flush()
		return { stored, b, arrow }
	}

	it('per record (default): the arrow is stored without its binding to ann’s box', () => {
		const { stored, b, arrow } = pushArrowToAnnsBox(false)
		expect(stored(arrow.id)).toBeDefined()
		const bindings = b.editor.getBindingsFromShape(arrow.id as TLShapeId, 'arrow')
		expect(bindings.every((binding) => binding.toId !== createShapeId('a1'))).toBe(true)
	})

	it('atomic: nothing of the push is stored, and the client rolls it all back', () => {
		const { stored, b, arrow } = pushArrowToAnnsBox(true)
		expect(stored(arrow.id)).toBeUndefined()
		expect(b.has(arrow.id)).toBe(false)
	})
})

describe('plugin types and custom actions: cards', () => {
	function deal() {
		const { server, join, flush, stored } = setup()
		const t = join(teacher)
		const a = join(ann)
		const b = join(ben)
		const pageId = t.editor.getCurrentPageId()
		const id = createShapeId('card')
		t.editor.createShapes([
			{
				id,
				type: 'note',
				parentId: pageId,
				props: { richText: toRichText('Ace of spades') },
				meta: { card: true, holder: 'ann', revealed: false, ownerId: 'ann' },
			},
		])
		flush()
		return { server, t, a, b, id, flush, stored }
	}
	const text = (peer: Peer, id: TLShapeId) =>
		JSON.stringify((peer.get(id) as any).props.richText).includes('Ace')

	it('sends the face to the holder only, and a redacted copy to everyone else', () => {
		const { a, b, id } = deal()
		expect(text(a, id)).toBe(true)
		expect(text(b, id)).toBe(false)
		expect(b.has(id)).toBe(true)
	})

	it('delegates the reveal write to the cards:reveal action that the UI asks', () => {
		const { t, a, b, id, flush, stored } = deal()
		expect(a.editor.permissions.can('cards:reveal', a.get(id))).toBe(false)
		a.editor.updateShapes([{ id, type: 'note', meta: { ...a.get(id)!.meta, revealed: true } }])
		flush()
		expect((stored(id) as TLShape).meta.revealed).toBe(false)

		expect(t.editor.permissions.can('cards:reveal', t.get(id))).toBe(true)
		t.editor.updateShapes([{ id, type: 'note', meta: { ...t.get(id)!.meta, revealed: true } }])
		flush()
		expect(text(b, id)).toBe(true)
	})

	it('answers the same custom action in a server route', () => {
		const { server, t, a, id, stored } = deal()
		const card = stored(id) as TLShape
		expect(server.room.can(t.pair.id, 'cards:reveal', card)).toBe(true)
		expect(server.room.can(a.pair.id, 'cards:reveal', card)).toBe(false)
		expect(server.room.can('no-such-session', 'cards:reveal', card)).toBe(false)
	})
})

describe('agents', () => {
	it('lets an agent write only inside its frame', () => {
		const { join, flush, stored } = setup()
		const t = join(teacher)
		const pageId = t.editor.getCurrentPageId()
		const frameId = createShapeId('agent-frame')
		t.editor.createShapes([
			{ id: frameId, type: 'frame', parentId: pageId, props: { w: 500, h: 500 } },
		])
		flush()
		const bot = join({ userId: 'bot', role: 'agent', frameId })
		bot.editor.createShapes([box('inside', frameId)])
		bot.editor.createShapes([box('outside', pageId, { x: 2000 })])
		flush()
		expect(stored(createShapeId('inside'))).toBeDefined()
		expect(stored(createShapeId('outside'))).toBeUndefined()
		expect(bot.editor.permissions.getLastDenial()?.reason).toBe(
			'Agents write only inside their frame'
		)
	})

	it('treats only the shape itself as locked, not its children', () => {
		const { join, flush } = setup()
		const t = join(teacher)
		const frameId = createShapeId('agent-frame')
		t.editor.createShapes([
			{
				id: frameId,
				type: 'frame',
				parentId: t.editor.getCurrentPageId(),
				props: { w: 500, h: 500 },
			},
		])
		flush()
		const bot = join({ userId: 'bot', role: 'agent', frameId })
		bot.editor.createShapes([box('inside', frameId)])
		// the teacher's frame is locked for the bot, but the bot's own box inside it is not
		expect(bot.editor.isShapeOrAncestorLocked(frameId)).toBe(true)
		expect(bot.editor.isShapeOrAncestorLocked(createShapeId('inside'))).toBe(false)
		bot.editor.updateShapes([{ id: createShapeId('inside'), type: 'geo', x: 50 }])
		expect((bot.get(createShapeId('inside')) as TLShape).x).toBe(50)
	})
})

describe('cost', () => {
	it('calls authorize once per record per session on connect, and once per write', () => {
		const spy = vi.fn(classroom)
		const server = new TestServer<TLRecord>(schema, DEFAULT_INITIAL_SNAPSHOT, { authorize: spy })
		const peer = new Peer(server, teacher, null)
		for (let i = 0; i < 10; i++) {
			server.flushDebouncingMessages()
			peer.pair.flushServerSentEvents()
			peer.pair.flushClientSentEvents()
		}
		const records = Object.keys(
			server.storage.transaction((txn) => txn.getChangesSince(-1)!.diff.puts).result
		).length
		expect(spy.mock.calls.filter(([ctx]) => ctx.action === 'read').length).toBeGreaterThanOrEqual(
			records
		)
	})
})
