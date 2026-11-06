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
})

// ---- roles: a role is a list of permissions ----

const teacher: TLCommandActor = { userId: 'teacher', permissions: ['*'] }
const student = (userId: string): TLCommandActor => ({
	userId,
	permissions: [P.edit, P.writeComments, 'votes:cast'],
})
const viewer: TLCommandActor = { userId: 'viewer', permissions: [] }
const commenter: TLCommandActor = { userId: 'commenter', permissions: [P.writeComments] }
const agent: TLCommandActor = { userId: 'agent', permissions: ['agent:notes'] }

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
		const { meta: _meta, ...shape } = { ...a.getEditor().getShapeUtil('geo').getDefaultProps() } as any
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
		room.room.updateSessionActor('a', { userId: 'alice', permissions: [] })
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
		room.room.updateSessionActor('a', { userId: 'alice', permissions: [P.edit] })
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
