import type { UnknownRecord } from '@tldraw/store'
import { defineCommand, defineCommandSet, type TLCommandActor } from '@tldraw/sync-core'
import {
	createShapeId,
	toRichText,
	type TLComment,
	type TLCommentThread,
	type TLPageId,
	type TLShape,
	type TLShapeId,
} from '@tldraw/tlschema'
import { T } from '@tldraw/validate'
import { LocalRoom } from './test/harness'
import {
	commentCommands,
	createOwnedShapesPolicy,
	createPageReadPolicy,
	getShapeOwner,
	pageCommands,
	TLDRAW_PERMISSIONS as P,
} from './tldraw-commands'

// Backtests for the command model against the use cases in the permissions research. Each
// `describe` is one use case. The room, clients, and editors are real; only the socket is local.

// ---- app-defined commands: a plugin action and an agent tool ----

const voteToggle = defineCommand<UnknownRecord, { shapeId: string }>({
	name: 'votes.toggle',
	requires: 'votes:cast',
	args: T.object({ shapeId: T.string }),
	run(ctx, { shapeId }) {
		const userId = ctx.actor.userId ?? ctx.deny('anonymous')
		const shape = ctx.get<TLShape & UnknownRecord>(shapeId)
		if (!shape || shape.typeName !== 'shape') return ctx.deny('no such shape')
		const votes = Array.isArray(shape.meta.votes) ? (shape.meta.votes as string[]) : []
		const next = votes.includes(userId) ? votes.filter((v) => v !== userId) : [...votes, userId]
		ctx.update<TLShape & UnknownRecord>(shape.id, { meta: { ...shape.meta, votes: next } })
		return { name: 'votes.toggle', args: { shapeId } }
	},
})

const agentAddNote = defineCommand<UnknownRecord, { id: string; text: string }>({
	name: 'agent.addNote',
	requires: 'agent:notes',
	args: T.object({ id: T.string, text: T.string.check((t) => t.length <= 200) }),
	run(ctx, { id, text }) {
		const area = ctx.getAll<TLShape & UnknownRecord>('shape').find((s) => s.meta.agentArea === true)
		if (!area) return ctx.deny('no agent area')
		const notes = ctx.getAll<TLShape & UnknownRecord>('shape').filter((s) => s.parentId === area.id)
		ctx.put({
			id: id as TLShapeId,
			typeName: 'shape',
			type: 'note',
			parentId: area.id,
			index: `a${notes.length + 1}` as any,
			x: 20 + notes.length * 220,
			y: 20,
			rotation: 0,
			isLocked: false,
			opacity: 1,
			meta: { ownerId: ctx.actor.userId },
			props: {
				color: 'violet',
				richText: toRichText(text),
				size: 'm',
				font: 'draw',
				align: 'middle',
				verticalAlign: 'middle',
				labelColor: 'black',
				growY: 0,
				fontSizeAdjustment: 1,
				url: '',
				scale: 1,
				textLastEditedBy: null,
			},
		} satisfies TLShape as any)
	},
})

const commands = defineCommandSet<UnknownRecord>({
	commands: [...commentCommands, ...pageCommands, voteToggle, agentAddNote],
	edit: createOwnedShapesPolicy({
		// A teacher can hand a frame to a student; the student may then draw inside it.
		canUseParent: (actor, parent) =>
			getShapeOwner(parent) === actor.userId || parent.meta.assignee === actor.userId,
	}),
	read: createPageReadPolicy(),
})

// ---- roles: a role is a list of permissions ----

const teacher: TLCommandActor = { userId: 'teacher', permissions: ['*'] }
const student = (userId: string): TLCommandActor => ({
	userId,
	permissions: [P.read, P.edit, P.writeComments, 'votes:cast'],
})
const viewer: TLCommandActor = { userId: 'viewer', permissions: [P.read] }
const commenter: TLCommandActor = { userId: 'commenter', permissions: [P.read, P.writeComments] }
const agent: TLCommandActor = { userId: 'agent', permissions: [P.read, 'agent:notes'] }

const page = 'page:page' as TLPageId

function setup() {
	const room = new LocalRoom(commands)
	const t = room.connect('t', teacher)
	const a = room.connect('a', student('alice'))
	const b = room.connect('b', student('bob'))
	room.flush()
	return { room, t, a, b }
}

function geo(editor: LocalRoom['peers'] extends Map<any, infer P> ? P : never, x: number) {
	const id = createShapeId()
	editor.getEditor().createShape({ id, type: 'geo', x, y: 0, props: { w: 100, h: 100 } })
	return id
}

describe('file write control: viewers', () => {
	it('a viewer gets a read-only editor and cannot run commands', () => {
		const { room } = setup()
		const v = room.connect('v', viewer)
		room.flush()
		expect(v.getEditor().getIsReadonly()).toBe(true)
		expect(v.run('pages.create', { id: 'page:x', name: 'X' })).toEqual({
			ok: false,
			reason: 'missing permission: pages:manage',
		})
	})

	it('the server discards raw edits from a viewer, even from a modified client', () => {
		const { room, t } = setup()
		const id = geo(t, 0)
		room.flush()
		const forger = room.forger('v2', viewer)
		room.flush()
		forger.push({ diff: { [id]: ['patch', { x: ['put', 999] }] } as any })
		room.flush()
		expect((room.room.getRecord(id) as TLShape).x).toBe(0)
		expect(forger.lastResult().action).toBe('discard')
	})
})

describe('shape write control: students edit only their own shapes', () => {
	it('the server stamps the owner; a client cannot choose it', () => {
		const { room, a } = setup()
		const forger = room.forger('a2', student('alice'))
		room.flush()
		const id = createShapeId()
		const { meta: _meta, ...shape } = {
			...a.getEditor().getShapeUtil('geo').getDefaultProps(),
		} as any
		void _meta
		forger.push({
			diff: {
				[id]: [
					'put',
					{
						id,
						typeName: 'shape',
						type: 'geo',
						parentId: page,
						index: 'a5',
						x: 0,
						y: 0,
						rotation: 0,
						isLocked: false,
						opacity: 1,
						meta: { ownerId: 'bob' },
						props: shape,
					},
				],
			} as any,
		})
		room.flush()
		expect(getShapeOwner(room.room.getRecord(id) as TLShape)).toBe('alice')
	})

	it("another student's shape acts locked: the edit never applies locally", () => {
		const { room, a, b } = setup()
		const id = geo(a, 0)
		room.flush()
		expect(getShapeOwner(b.get(id)!)).toBe('alice')
		b.getEditor().updateShape({ id, type: 'geo', x: 500 })
		b.getEditor().deleteShape(id)
		expect(b.get<TLShape>(id)!.x).toBe(0)
		room.flush()
		expect((room.room.getRecord(id) as TLShape).x).toBe(0)
	})

	it('a push with one denied record is discarded whole, never half-applied', () => {
		const { room, a, b } = setup()
		const alices = geo(a, 0)
		const bobs = geo(b, 200)
		room.flush()
		const forger = room.forger('b2', student('bob'))
		room.flush()
		forger.push({
			diff: {
				[bobs]: ['patch', { x: ['put', 300] }],
				[alices]: ['patch', { x: ['put', 300] }],
			} as any,
		})
		room.flush()
		expect((room.room.getRecord(bobs) as TLShape).x).toBe(200)
		expect((room.room.getRecord(alices) as TLShape).x).toBe(0)
		expect(forger.lastResult()).toMatchObject({
			action: 'discard',
			reason: 'edit denied: update shape',
		})
	})

	it("a student cannot move their own shape into another student's frame", () => {
		const { room, a, b } = setup()
		const frame = createShapeId()
		a.getEditor().createShape({ id: frame, type: 'frame', x: 0, y: 0, props: { w: 400, h: 400 } })
		const bobs = geo(b, 600)
		room.flush()
		b.getEditor().reparentShapes([bobs], frame)
		expect(b.get<TLShape>(bobs)!.parentId).toBe(page)
		room.flush()
		expect((room.room.getRecord(bobs) as TLShape).parentId).toBe(page)
	})

	it('a student may draw inside a frame the teacher assigned to them', () => {
		const { room, t, a } = setup()
		const frame = createShapeId()
		t.getEditor().createShape({
			id: frame,
			type: 'frame',
			x: 0,
			y: 0,
			props: { w: 400, h: 400 },
			meta: { assignee: 'alice' },
		})
		room.flush()
		const id = createShapeId()
		a.getEditor().createShape({ id, type: 'geo', parentId: frame, x: 10, y: 10 })
		room.flush()
		expect((room.room.getRecord(id) as TLShape).parentId).toBe(frame)
		// but cannot edit the frame itself
		a.getEditor().updateShape({ id: frame, type: 'frame', x: 50 })
		room.flush()
		expect((room.room.getRecord(frame) as TLShape).x).toBe(0)
	})

	it('the teacher edits any shape', () => {
		const { room, t, a } = setup()
		const id = geo(a, 0)
		room.flush()
		t.getEditor().updateShape({ id, type: 'geo', x: 42 })
		room.flush()
		expect((room.room.getRecord(id) as TLShape).x).toBe(42)
		expect(a.get<TLShape>(id)!.x).toBe(42)
	})
})

describe('page write control', () => {
	it('students cannot create pages, by command or by raw edit', () => {
		const { room, a } = setup()
		expect(a.run('pages.create', { id: 'page:x', name: 'X' }).ok).toBe(false)
		a.getEditor().createPage({ id: 'page:y' as TLPageId, name: 'Y' })
		// a denied create is removed right away, so nothing is sent
		expect(a.get('page:y' as TLPageId)).toBeUndefined()
		room.flush()
		expect(room.room.getRecord('page:y')).toBeUndefined()
	})

	it('deleting a page removes its shapes, bindings, and comments in one unit', () => {
		const { room, t, a } = setup()
		t.run('pages.create', { id: 'page:two', name: 'Two' })
		room.flush()
		t.getEditor().setCurrentPage('page:two' as TLPageId)
		const shape = geo(t, 0)
		const child = createShapeId()
		a.getEditor().setCurrentPage('page:two' as TLPageId)
		room.flush()
		a.run('comments.add', {
			threadId: 'comment-thread:1',
			commentId: 'comment:1',
			pageId: 'page:two',
			anchor: { type: 'page' },
			body: toRichText('hi'),
			now: 1,
		})
		room.flush()
		void child
		expect(t.run('pages.delete', { id: 'page:two' })).toMatchObject({ ok: true })
		// optimistic: gone locally before the server answers
		expect(t.get(shape)).toBeUndefined()
		room.flush()
		for (const id of ['page:two', shape, 'comment-thread:1', 'comment:1']) {
			expect(room.room.getRecord(id)).toBeUndefined()
			expect(a.store.get(id as any)).toBeUndefined()
		}
	})
})

describe('comments: add your own, manage any', () => {
	const add = (threadId: string, commentId: string, text = 'hello') => ({
		threadId,
		commentId,
		pageId: page,
		anchor: { type: 'point', x: 0, y: 0 },
		body: toRichText(text),
		now: 1,
	})

	it('a comment-only link can comment on a read-only canvas, as itself', () => {
		const { room } = setup()
		const c = room.connect('c', commenter)
		room.flush()
		expect(c.getEditor().getIsReadonly()).toBe(true)
		expect(c.run('comments.add', add('comment-thread:c', 'comment:c')).ok).toBe(true)
		room.flush()
		expect(room.room.getRecord('comment:c')).toMatchObject({ authorId: 'commenter' })
		expect(room.room.getRecord('comment-thread:c')).toMatchObject({ createdBy: 'commenter' })
	})

	it('raw writes of comment records are denied, so authors cannot be forged', () => {
		const { room, a } = setup()
		a.run('comments.add', add('comment-thread:a', 'comment:a'))
		room.flush()
		const forger = room.forger('b2', student('bob'))
		room.flush()
		forger.push({ diff: { 'comment:a': ['patch', { body: ['put', toRichText('pwned')] }] } as any })
		room.flush()
		expect((room.room.getRecord('comment:a') as unknown as TLComment).body).toEqual(
			toRichText('hello')
		)
	})

	it('students delete only their own comments; a moderator deletes any', () => {
		const { room, t, a, b } = setup()
		a.run('comments.add', add('comment-thread:a', 'comment:a'))
		room.flush()
		expect(b.run('comments.delete', { commentId: 'comment:a' })).toEqual({
			ok: false,
			reason: 'only the author or a moderator can delete a comment',
		})
		expect(t.run('comments.delete', { commentId: 'comment:a' }).ok).toBe(true)
		room.flush()
		expect(room.room.getRecord('comment:a')).toMatchObject({ isDeleted: true })
		// the last live comment took its thread with it, in the same unit
		expect((room.room.getRecord('comment-thread:a') as unknown as TLCommentThread).isDeleted).toBe(
			true
		)
	})
})

describe('live access changes', () => {
	it('the teacher turns a student to read-only mid-lesson, and back', () => {
		const { room, a } = setup()
		const id = geo(a, 0)
		room.flush()
		room.room.updateSessionActor('a', { userId: 'alice', permissions: [P.read] })
		room.flush()
		expect(a.getEditor().getIsReadonly()).toBe(true)
		expect(a.client.can(P.writeComments)).toBe(false)

		room.room.updateSessionActor('a', student('alice'))
		room.flush()
		expect(a.getEditor().getIsReadonly()).toBe(false)
		a.getEditor().updateShape({ id, type: 'geo', x: 10 })
		room.flush()
		expect((room.room.getRecord(id) as TLShape).x).toBe(10)
	})

	it('a command already sent when access is revoked is rolled back and reported', () => {
		const { room, a } = setup()
		a.run('comments.add', add('comment-thread:r', 'comment:r'))
		expect(a.store.get('comment:r' as any)).toBeDefined() // optimistic
		// revoke before the server sees the command
		room.room.updateSessionActor('a', { userId: 'alice', permissions: [P.read, P.edit] })
		room.flush()
		expect(a.store.get('comment:r' as any)).toBeUndefined()
		expect(room.room.getRecord('comment:r')).toBeUndefined()
		expect(a.rejections).toContain('missing permission: comments:write')
	})

	function add(threadId: string, commentId: string) {
		return {
			threadId,
			commentId,
			pageId: page,
			anchor: { type: 'page' },
			body: toRichText('x'),
			now: 1,
		}
	}
})

describe('plugin actions: dot voting', () => {
	it("students vote on the teacher's shape, which they cannot edit", () => {
		const { room, t, a, b } = setup()
		const id = geo(t, 0)
		room.flush()
		a.run('votes.toggle', { shapeId: id })
		b.run('votes.toggle', { shapeId: id })
		// both votes land: the server runs each command on the latest state
		room.flush()
		expect((room.room.getRecord(id) as TLShape).meta.votes).toEqual(['alice', 'bob'])
		expect((t.get<TLShape>(id)!.meta as any).votes).toEqual(['alice', 'bob'])
		// a raw write of the same field is an edit of the teacher's shape, so it is denied
		a.getEditor().updateShape({ id, type: 'geo', meta: { votes: ['alice', 'alice', 'alice'] } })
		room.flush()
		expect((room.room.getRecord(id) as TLShape).meta.votes).toEqual(['alice', 'bob'])
	})

	it('a vote cannot be cast for someone else: the voter is the actor, not an arg', () => {
		const { room, t, a } = setup()
		const id = geo(t, 0)
		room.flush()
		expect(a.run('votes.toggle', { shapeId: id, userId: 'bob' })).toMatchObject({ ok: false })
		a.run('votes.toggle', { shapeId: id })
		room.flush()
		expect((room.room.getRecord(id) as TLShape).meta.votes).toEqual(['alice'])
	})
})

describe('agents: a token that may run one tool and nothing else', () => {
	it('the agent adds notes in its area, and cannot edit or comment', () => {
		const { room, t } = setup()
		const area = createShapeId()
		t.getEditor().createShape({
			id: area,
			type: 'frame',
			x: 0,
			y: 0,
			props: { w: 800, h: 300 },
			meta: { agentArea: true },
		})
		const other = geo(t, 900)
		room.flush()
		const bot = room.connect('bot', agent)
		room.flush()
		expect(bot.run('agent.addNote', { id: 'shape:note1', text: 'Idea' }).ok).toBe(true)
		expect(bot.run('comments.add', add())).toMatchObject({ ok: false })
		bot.getEditor().updateShape({ id: other, type: 'geo', x: 0 })
		room.flush()
		expect(room.room.getRecord('shape:note1')).toMatchObject({ parentId: area })
		expect((room.room.getRecord(other) as TLShape).x).toBe(900)
	})

	function add() {
		return {
			threadId: 'comment-thread:bot',
			commentId: 'comment:bot',
			pageId: page,
			anchor: { type: 'page' },
			body: toRichText('x'),
			now: 1,
		}
	}
})

function geoProps() {
	const room = new LocalRoom(commands)
	const p = room.connect('probe', teacher)
	room.flush()
	return { ...p.getEditor().getShapeUtil('geo').getDefaultProps() }
}

describe('review fixes', () => {
	const policy = createOwnedShapesPolicy()
	const bob: TLCommandActor = student('bob')
	const shapes: Record<string, any> = {
		'shape:aliceArrow': { id: 'shape:aliceArrow', typeName: 'shape', meta: { ownerId: 'alice' } },
		'shape:bobArrow': { id: 'shape:bobArrow', typeName: 'shape', meta: { ownerId: 'bob' } },
	}
	const binding = (fromId: string) => ({ id: 'binding:1', typeName: 'binding', fromId, toId: 'x' })

	it('a binding cannot be taken over by pointing it at your own arrow', () => {
		expect(
			policy.authorize!({
				actor: bob,
				op: 'update',
				prev: binding('shape:aliceArrow') as any,
				next: binding('shape:bobArrow') as any,
				get: (id) => shapes[id],
			})
		).toBe(false)
	})

	it('pages.delete stops on a stored parent cycle', () => {
		// no editors here: the editor itself cannot render a parent cycle
		const room = new LocalRoom(commands)
		const forger = room.forger('t2', teacher)
		room.flush()
		forger.push({ command: { name: 'pages.create', args: { id: 'page:two', name: 'Two' } } })
		room.flush()
		const page2 = room.room.getRecord('page:page') as any
		void page2
		const base = (id: string, parentId: string) => ({
			id,
			typeName: 'shape',
			type: 'geo',
			parentId,
			index: 'a1',
			x: 0,
			y: 0,
			rotation: 0,
			isLocked: false,
			opacity: 1,
			meta: {},
			props: geoProps(),
		})
		forger.push({
			diff: {
				'shape:x': ['put', base('shape:x', 'page:two')],
				'shape:y': ['put', base('shape:y', 'shape:x')],
			} as any,
		})
		room.flush()
		forger.push({ diff: { 'shape:x': ['patch', { parentId: ['put', 'shape:y'] }] } as any })
		room.flush()
		expect((room.room.getRecord('shape:x') as TLShape).parentId).toBe('shape:y')
		forger.push({ command: { name: 'pages.delete', args: { id: 'page:two' } } })
		room.flush()
		expect(room.room.getRecord('page:two')).toBeUndefined()
	})

	it('a host read-only flag caps an actor that has edit', () => {
		const room = new LocalRoom(commands)
		const id = createShapeId()
		const t = room.connect('t', teacher)
		room.flush()
		t.getEditor().createShape({ id, type: 'geo', x: 0, y: 0 })
		room.flush()
		room.room.handleSocketConnect({
			sessionId: 'ro',
			isReadonly: true,
			actor: teacher,
			socket: { readyState: 1, send: () => {}, close: () => {} },
		})
		room.room.handleSocketMessage(
			'ro',
			JSON.stringify({
				type: 'connect',
				connectRequestId: 'x',
				lastServerClock: 0,
				protocolVersion: 9,
				schema: t.store.schema.serialize(),
			})
		)
		room.room.handleSocketMessage(
			'ro',
			JSON.stringify({ type: 'push', clientClock: 0, diff: { [id]: ['patch', { x: ['put', 5] }] } })
		)
		expect((room.room.getRecord(id) as TLShape).x).toBe(0)
	})
})

describe('file read control', () => {
	it('a session without the read permission is refused at connect', () => {
		const { room } = setup()
		const x = room.connect('x', { userId: 'x', permissions: [P.edit] })
		room.flush()
		expect(x.closedWith).toBe('FORBIDDEN')
		expect(x.store.get(page)).toBeUndefined()
	})

	it('revoking read closes an open session at once', () => {
		const { room, t, a } = setup()
		room.room.updateSessionActor('a', { userId: 'alice', permissions: [P.edit] })
		room.flush()
		expect(a.closedWith).toBe('FORBIDDEN')
		// nothing new reaches the closed session
		const id = geo(t, 0)
		room.flush()
		expect(a.get(id)).toBeUndefined()
	})
})

describe('page read control', () => {
	const answers = 'page:answers' as TLPageId
	function lesson() {
		const s = setup()
		s.t.run('pages.create', { id: answers, name: 'Answers' })
		s.t.run('pages.setReaders', { id: answers, readers: [] })
		s.room.flush()
		s.t.getEditor().setCurrentPage(answers)
		const secret = geo(s.t, 0)
		s.t.getEditor().setCurrentPage(page)
		s.room.flush()
		return { ...s, secret }
	}

	it('a hidden page and everything on it never reach students', () => {
		const { room, t, a, b, secret } = lesson()
		expect(t.get(answers)).toBeDefined()
		for (const peer of [a, b]) {
			expect(peer.get(answers)).toBeUndefined()
			expect(peer.get(secret)).toBeUndefined()
		}
		// edits on the hidden page are filtered out of every broadcast
		t.getEditor().updateShape({ id: secret, type: 'geo', x: 50 })
		room.flush()
		expect(a.get(secret)).toBeUndefined()
		expect((room.room.getRecord(secret) as TLShape).x).toBe(50)
	})

	it('sharing a page sends it to its new readers live, and unsharing removes it', () => {
		const { room, t, a, b, secret } = lesson()
		t.run('pages.setReaders', { id: answers, readers: ['alice'] })
		room.flush()
		expect(a.get(answers)).toBeDefined()
		expect(a.get(secret)).toBeDefined()
		expect(b.get(secret)).toBeUndefined()
		// a later edit arrives as a normal patch
		t.getEditor().updateShape({ id: secret, type: 'geo', x: 70 })
		room.flush()
		expect(a.get<TLShape>(secret)!.x).toBe(70)

		a.getEditor().setCurrentPage(answers)
		t.run('pages.setReaders', { id: answers, readers: [] })
		room.flush()
		expect(a.get(answers)).toBeUndefined()
		expect(a.get(secret)).toBeUndefined()
		// the editor moves to a page Alice can read
		expect(a.getEditor().getCurrentPageId()).toBe(page)
		expect(a.syncErrors).toEqual([])
	})

	it('moving a shape to a hidden page removes it for students, moving it back returns it', () => {
		const { room, t, a } = lesson()
		const id = geo(t, 300)
		room.flush()
		expect(a.get(id)).toBeDefined()
		t.getEditor().moveShapesToPage([id], answers)
		room.flush()
		expect(a.get(id)).toBeUndefined()
		t.getEditor().moveShapesToPage([id], page)
		room.flush()
		expect(a.get(id)).toBeDefined()
	})

	it('a modified client cannot read, edit, or write into a hidden page', () => {
		const { room, secret } = lesson()
		const forger = room.forger('f', student('mallory'))
		room.flush()
		const received = JSON.stringify(forger.answers)
		expect(received).not.toContain(answers)
		expect(received).not.toContain(secret)

		forger.push({ diff: { [secret]: ['patch', { x: ['put', 999] }] } as any })
		room.flush()
		expect(forger.lastResult().action).toBe('discard')
		expect((room.room.getRecord(secret) as TLShape).x).toBe(0)

		const shape = { ...(room.room.getRecord(secret) as TLShape), id: 'shape:mine', meta: {} }
		forger.push({ diff: { 'shape:mine': ['put', shape] } as any })
		room.flush()
		expect(forger.lastResult().action).toBe('discard')
		expect(room.room.getRecord('shape:mine')).toBeUndefined()

		forger.push({
			command: {
				name: 'comments.add',
				args: {
					threadId: 'comment-thread:f',
					commentId: 'comment:f',
					pageId: answers,
					anchor: { type: 'page' },
					body: toRichText('x'),
					now: 1,
				},
			},
		})
		room.flush()
		expect(forger.lastResult()).toMatchObject({ action: 'discard', reason: 'no such page' })
	})

	it('a command cannot read a hidden record: a vote on a hidden shape is not found', () => {
		const { room, a, secret } = lesson()
		const forger = room.forger('f', student('mallory'))
		room.flush()
		forger.push({ command: { name: 'votes.toggle', args: { shapeId: secret } } })
		room.flush()
		expect(forger.lastResult()).toMatchObject({ action: 'discard', reason: 'no such shape' })
		void a
	})

	it('comments on a hidden page are hidden too', () => {
		const { room, t, a } = lesson()
		t.run('comments.add', {
			threadId: 'comment-thread:s',
			commentId: 'comment:s',
			pageId: answers,
			anchor: { type: 'page' },
			body: toRichText('the answer is 42'),
			now: 1,
		})
		room.flush()
		expect(room.room.getRecord('comment:s')).toBeDefined()
		expect(a.store.get('comment:s' as any)).toBeUndefined()
		expect(a.store.get('comment-thread:s' as any)).toBeUndefined()
	})

	it('a reconnect hydrates only what the session can read', () => {
		const { room, secret } = lesson()
		const late = room.connect('late', student('dana'))
		room.flush()
		expect(late.get(answers)).toBeUndefined()
		expect(late.get(secret)).toBeUndefined()
		expect(late.get(page)).toBeDefined()
	})
})

describe('arrows across owners', () => {
	function boundArrow() {
		const s = setup()
		const box = geo(s.b, 300)
		s.room.flush()
		const arrow = createShapeId()
		const editor = s.a.getEditor()
		editor.createShape({
			id: arrow,
			type: 'arrow',
			x: 0,
			y: 50,
			props: { start: { x: 0, y: 0 }, end: { x: 350, y: 0 } },
		})
		editor.createBinding({
			type: 'arrow',
			fromId: arrow,
			toId: box,
			props: {
				terminal: 'end',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
			},
		})
		s.room.flush()
		const bindings = () =>
			s.room.room
				.getCurrentSnapshot()
				.documents.filter((d) => d.state.typeName === 'binding')
				.map((d) => d.state)
		return { ...s, box, arrow, bindings }
	}

	it("Alice binds her arrow to Bob's shape; Bob moves it and the arrow follows", () => {
		const { room, a, b, box, arrow, bindings } = boundArrow()
		expect(bindings()).toHaveLength(1)
		b.getEditor().updateShape({ id: box, type: 'geo', x: 500 })
		room.flush()
		expect(b.rejections).toEqual([])
		expect((room.room.getRecord(box) as TLShape).x).toBe(500)
		// the binding, not a write to Alice's arrow, makes the arrow follow
		expect(a.getEditor().getBindingsFromShape(arrow, 'arrow')).toHaveLength(1)
	})

	it("Bob deletes his shape: the binding from Alice's arrow goes with it", () => {
		const { room, a, b, box, arrow, bindings } = boundArrow()
		b.getEditor().deleteShape(box)
		room.flush()
		expect(b.rejections).toEqual([])
		expect(room.room.getRecord(box)).toBeUndefined()
		// no binding to a shape that is gone, on the server or on Alice's client
		expect(bindings()).toEqual([])
		expect(a.getEditor().getBindingsFromShape(arrow, 'arrow')).toEqual([])
		// Alice's arrow stays, and stays hers
		expect(getShapeOwner(room.room.getRecord(arrow) as TLShape)).toBe('alice')
	})

	it("Bob cannot unbind Alice's arrow from a shape that is not his", () => {
		const { room, a, bindings } = boundArrow()
		const own = geo(a, 900)
		room.flush()
		const binding = bindings()[0]
		const forger = room.forger('f', student('bob'))
		room.flush()
		forger.push({ diff: { [binding.id]: ['remove'] } as any })
		room.flush()
		// the binding points at Bob's box, so Bob may remove it; retarget it to Alice's shape first
		const retargeted = { ...binding, id: 'binding:alice', toId: own }
		a.store.put([retargeted as any])
		room.flush()
		forger.push({ diff: { 'binding:alice': ['remove'] } as any })
		room.flush()
		expect(forger.lastResult().action).toBe('discard')
		expect(room.room.getRecord('binding:alice')).toBeDefined()
	})
})

describe('undo and redo of commands', () => {
	it("undo of a vote on the teacher's note sends the inverse command, not a raw edit", () => {
		const { room, t, a } = setup()
		const note = geo(t, 0)
		room.flush()
		const editor = a.getEditor()
		editor.markHistoryStoppingPoint()
		a.run('votes.toggle', { shapeId: note })
		room.flush()
		expect((room.room.getRecord(note) as TLShape).meta.votes).toEqual(['alice'])

		editor.undo()
		// optimistic: the undo step itself
		expect(a.get<TLShape>(note)!.meta.votes).toBeUndefined()
		room.flush()
		// then the server's result of the inverse command
		expect((room.room.getRecord(note) as TLShape).meta.votes).toEqual([])
		expect(a.get<TLShape>(note)!.meta.votes).toEqual([])
		expect(a.rejections).toEqual([])

		editor.redo()
		room.flush()
		expect((room.room.getRecord(note) as TLShape).meta.votes).toEqual(['alice'])
		expect(a.rejections).toEqual([])
	})

	it('undo keeps votes that others cast in the meantime', () => {
		const { room, t, a, b } = setup()
		const note = geo(t, 0)
		room.flush()
		a.getEditor().markHistoryStoppingPoint()
		a.run('votes.toggle', { shapeId: note })
		room.flush()
		b.run('votes.toggle', { shapeId: note })
		room.flush()
		a.getEditor().undo()
		room.flush()
		// a raw undo would write back [], wiping Bob's vote; the inverse command removes only Alice's
		expect((room.room.getRecord(note) as TLShape).meta.votes).toEqual(['bob'])
		expect(a.get<TLShape>(note)!.meta.votes).toEqual(['bob'])
	})

	it('undo of a comment deletes it; redo restores it; the author stays the actor', () => {
		const { room, a } = setup()
		const editor = a.getEditor()
		editor.markHistoryStoppingPoint()
		a.run('comments.add', {
			threadId: 'comment-thread:u',
			commentId: 'comment:u',
			pageId: page,
			anchor: { type: 'page' },
			body: toRichText('oops'),
			now: 1,
		})
		room.flush()
		editor.undo()
		room.flush()
		expect((room.room.getRecord('comment:u') as TLComment).isDeleted).toBe(true)
		editor.redo()
		room.flush()
		expect(room.room.getRecord('comment:u')).toMatchObject({ isDeleted: false, authorId: 'alice' })
		expect(a.rejections).toEqual([])
	})

	it('one undo step can hold a drag and a command: the drag goes raw, the command as its inverse', () => {
		const { room, t, a } = setup()
		const note = geo(t, 0)
		const mine = geo(a, 300)
		room.flush()
		const editor = a.getEditor()
		editor.markHistoryStoppingPoint()
		editor.updateShape({ id: mine, type: 'geo', x: 400 })
		a.run('votes.toggle', { shapeId: note })
		room.flush()
		editor.undo()
		room.flush()
		expect((room.room.getRecord(mine) as TLShape).x).toBe(300)
		expect((room.room.getRecord(note) as TLShape).meta.votes).toEqual([])
		expect(a.rejections).toEqual([])
	})

	it('undo is authorized like any command: it fails after the permission is gone', () => {
		const { room, t, a } = setup()
		const note = geo(t, 0)
		room.flush()
		a.getEditor().markHistoryStoppingPoint()
		a.run('votes.toggle', { shapeId: note })
		room.flush()
		room.room.updateSessionActor('a', { userId: 'alice', permissions: [P.read, P.edit] })
		room.flush()
		a.getEditor().undo()
		room.flush()
		expect((room.room.getRecord(note) as TLShape).meta.votes).toEqual(['alice'])
		expect(a.get<TLShape>(note)!.meta.votes).toEqual(['alice'])
		expect(a.rejections).toContain('missing permission: votes:cast')
	})

	it('the teacher undoes a new page', () => {
		const { room, t, a } = setup()
		t.getEditor().markHistoryStoppingPoint()
		t.run('pages.create', { id: 'page:new', name: 'New' })
		room.flush()
		expect(a.get('page:new' as TLPageId)).toBeDefined()
		t.getEditor().undo()
		room.flush()
		expect(room.room.getRecord('page:new')).toBeUndefined()
		expect(a.get('page:new' as TLPageId)).toBeUndefined()
	})
})

describe('reconnect and offline', () => {
	it('a command the server applied before the connection dropped is not applied twice', () => {
		const { room, t, a } = setup()
		const note = geo(t, 0)
		room.flush()
		a.run('votes.toggle', { shapeId: note })
		room.step() // the server applies the vote; its answer is still in flight
		expect((room.room.getRecord(note) as TLShape).meta.votes).toEqual(['alice'])
		a.disconnect()
		room.flush()
		a.reconnect()
		room.flush()
		// a second toggle would remove the vote again
		expect((room.room.getRecord(note) as TLShape).meta.votes).toEqual(['alice'])
		expect(a.get<TLShape>(note)!.meta.votes).toEqual(['alice'])
		expect(a.rejections).toEqual([])
	})

	it('a command lost on the way is sent again as a command, not as a raw edit', () => {
		const { room, t, a } = setup()
		const note = geo(t, 0)
		room.flush()
		a.run('votes.toggle', { shapeId: note })
		a.disconnect() // the push never reaches the server
		room.flush()
		expect((room.room.getRecord(note) as TLShape).meta.votes).toBeUndefined()
		a.reconnect()
		room.flush()
		// as a raw edit, the vote would be denied: Alice cannot edit the teacher's note
		expect((room.room.getRecord(note) as TLShape).meta.votes).toEqual(['alice'])
		expect(a.rejections).toEqual([])
	})

	it('commands and edits made offline go to the server in order on reconnect', () => {
		const { room, a } = setup()
		a.disconnect()
		room.flush()
		const mine = geo(a, 0)
		expect(
			a.run('comments.add', {
				threadId: 'comment-thread:o',
				commentId: 'comment:o',
				pageId: page,
				anchor: { type: 'shape', shapeId: mine, x: 0, y: 0, isPrecise: false },
				body: toRichText('written offline'),
				now: 1,
			})
		).toMatchObject({ ok: true })
		a.getEditor().updateShape({ id: mine, type: 'geo', x: 40 })
		a.reconnect()
		room.flush()
		expect(room.room.getRecord(mine)).toMatchObject({ x: 40, meta: { ownerId: 'alice' } })
		expect(room.room.getRecord('comment:o')).toMatchObject({ authorId: 'alice' })
		expect(a.rejections).toEqual([])
	})
})
