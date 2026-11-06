import {
	CustomRecordInfo,
	TLPageId,
	TLRecord,
	TLRule,
	TLShapeId,
	confineToShape,
	createShapeId,
	defaultAbilityRules,
	definePermissions,
	intentOwnsTypes,
	pageReadAccess,
	pageWriteAccess,
	toRichText,
} from 'tldraw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SyncHarness, SyncUser, roomSnapshot } from './harness'

// Backtests for the use cases in the permissions research: pages, comments, share links, agents
// and plugins. Each test runs real editors against a real room.

let h: SyncHarness
beforeEach(() => {
	vi.useFakeTimers()
})
afterEach(() => {
	h?.dispose()
	vi.useRealTimers()
})

const anyRecord: CustomRecordInfo = { scope: 'document', validator: { validate: (r: any) => r } }
const records = { comment: anyRecord, vote: anyRecord }

function geo(id: TLShapeId, x = 0, parentId?: string) {
	return {
		id,
		type: 'geo' as const,
		x,
		y: 0,
		...(parentId ? { parentId: parentId as TLPageId } : {}),
		props: { w: 100, h: 100, richText: toRichText('') },
	}
}

function ids(user: SyncUser, typeName: string) {
	return user.store
		.allRecords()
		.filter((r) => r.typeName === typeName)
		.map((r) => r.id)
		.sort()
}

describe('page read and write control', () => {
	const PAGE = 'page:page' as TLPageId
	const LOCKED = 'page:locked' as TLPageId
	const HIDDEN = 'page:hidden' as TLPageId

	beforeEach(() => {
		h = new SyncHarness(
			definePermissions<TLRecord>({
				rules: [
					...defaultAbilityRules(),
					pageWriteAccess({
						canEditPage: (page: any, tx) => !page.meta.locked || tx.can('teach'),
					}),
				],
				canRead: pageReadAccess({
					canSeePage: (page: any, ctx) => !page.meta.hidden || ctx.can('teach'),
				}),
			}),
			{
				records,
				snapshot: roomSnapshot([
					{ id: LOCKED, name: 'Locked', meta: { locked: true } },
					{ id: HIDDEN, name: 'Answers', meta: { hidden: true } },
				]),
			}
		)
	})
	const student = { userId: 'sam', abilities: ['edit', 'comment'] }
	const teacher = { userId: 'tia', abilities: ['edit', 'comment', 'teach'] }

	it('hides a page, its shapes, and its comments from those who cannot see it', () => {
		const tia = h.connect('tia', teacher)
		tia.editor.createShapes([geo(createShapeId('answer'), 0, HIDDEN)])
		tia.editor.run(() =>
			tia.store.put([
				{ id: 'comment:1', typeName: 'comment', pageId: HIDDEN, authorId: 'tia' } as any,
			])
		)
		h.settle()

		const sam = h.connect('sam', student)
		expect(ids(sam, 'page')).toEqual([LOCKED, PAGE])
		expect(sam.editor.getShape(createShapeId('answer'))).toBeUndefined()
		expect(ids(sam, 'comment')).toEqual([])
		expect(ids(tia, 'page')).toEqual([HIDDEN, LOCKED, PAGE])
	})

	it('hides the cursors of people on a hidden page', () => {
		const tia = h.connect('tia', teacher)
		const sam = h.connect('sam', student)
		tia.editor.setCurrentPage(PAGE)
		h.settle()
		expect(ids(sam, 'instance_presence')).toHaveLength(1)
		tia.editor.setCurrentPage(HIDDEN)
		h.settle()
		expect(ids(sam, 'instance_presence')).toHaveLength(0)
	})

	it('denies changes on a locked page as a whole, locally and on the server', () => {
		const tia = h.connect('tia', teacher)
		const sam = h.connect('sam', student)
		tia.editor.createShapes([geo(createShapeId('task'), 0, LOCKED)])
		h.settle()

		sam.editor.updateShapes([{ id: createShapeId('task'), type: 'geo', x: 400 }])
		expect(sam.denials.map((d) => d.reason)).toEqual(['You cannot edit the page "Locked".'])

		// moving a shape from an open page onto the locked page is denied too
		sam.editor.createShapes([geo(createShapeId('mine'))])
		sam.editor.moveShapesToPage([createShapeId('mine')], LOCKED)
		expect(sam.editor.getShape(createShapeId('mine'))?.parentId).toBe(PAGE)
		h.settle()
		expect(h.serverRecord(createShapeId('task'))).toMatchObject({ x: 0 })
		expect(h.serverRecord(createShapeId('mine'))).toMatchObject({ parentId: PAGE })
	})

	it('denies writing onto a page you cannot see', () => {
		const sam = h.connect('sam', student)
		// sam's editor does not know the page, so this can only come from a bad client
		sam.store.withTransaction(() =>
			sam.store.put([{ ...sam.store.get(sam.editor.getCurrentPageId())!, id: HIDDEN } as any])
		)
		h.settle()
		expect(h.serverRecord(HIDDEN)).toMatchObject({ name: 'Answers' })
		expect(sam.store.props.collaboration?.lastDenial?.get()?.reason).toBe(
			'You cannot change records you cannot see.'
		)
	})

	it('reveals a page live when the teacher unhides it', () => {
		const tia = h.connect('tia', teacher)
		const sam = h.connect('sam', student)
		tia.editor.createShapes([geo(createShapeId('answer'), 0, HIDDEN)])
		h.settle()
		expect(sam.editor.getShape(createShapeId('answer'))).toBeUndefined()

		tia.editor.updatePage({ id: HIDDEN, meta: { hidden: false } })
		h.settle()
		expect(ids(sam, 'page')).toContain(HIDDEN)
		expect(sam.editor.getShape(createShapeId('answer'))).toBeDefined()

		tia.editor.updatePage({ id: HIDDEN, meta: { hidden: true } })
		h.settle()
		expect(ids(sam, 'page')).not.toContain(HIDDEN)
		expect(sam.editor.getShape(createShapeId('answer'))).toBeUndefined()
	})

	it('reveals a page live when access changes', () => {
		const tia = h.connect('tia', teacher)
		const sam = h.connect('sam', student)
		tia.editor.createShapes([geo(createShapeId('answer'), 0, HIDDEN)])
		h.settle()
		sam.setServerAccess({ ...student, abilities: [...student.abilities, 'teach'] })
		expect(sam.editor.getShape(createShapeId('answer'))).toBeDefined()
		sam.setServerAccess(student)
		expect(sam.editor.getShape(createShapeId('answer'))).toBeUndefined()
	})
})

describe('comments: add your own, manage any with "moderate"', () => {
	const ownComments: TLRule<TLRecord> = (tx) => {
		for (const change of tx.changes) {
			const comment = (change.next ?? change.prev) as any
			if (comment.typeName !== 'comment') continue
			if (change.op === 'create') {
				if (comment.authorId !== tx.access.userId) return 'Comments must be your own.'
			} else if ((change.prev as any).authorId !== tx.access.userId && !tx.can('moderate')) {
				return 'You can only change your own comments.'
			}
		}
		return undefined
	}
	beforeEach(() => {
		h = new SyncHarness(
			definePermissions<TLRecord>({ rules: [...defaultAbilityRules(), ownComments] }),
			{ records }
		)
	})
	const comment = (id: string, authorId: string, text: string) =>
		({ id: `comment:${id}`, typeName: 'comment', pageId: 'page:page', authorId, text }) as any

	it('lets a commenter add comments, but not shapes', () => {
		const cal = h.connect('cal', { userId: 'cal', abilities: ['comment'] })
		cal.editor.run(() => cal.store.put([comment('1', 'cal', 'hi')]))
		cal.editor.run(() => cal.store.put([comment('2', 'cal', 'and a shape')]), {
			ignoreShapeLock: true,
		})
		h.settle()
		expect(h.serverRecord('comment:1')).toBeDefined()
		expect(cal.editor.getIsReadonly()).toBe(true)
		expect(cal.editor.permissions.can('comment')).toBe(true)
		expect(cal.editor.permissions.can('edit')).toBe(false)
	})

	it("denies editing someone else's comment, unless you moderate", () => {
		const cal = h.connect('cal', { userId: 'cal', abilities: ['comment'] })
		const dee = h.connect('dee', { userId: 'dee', abilities: ['comment'] })
		const mod = h.connect('mod', { userId: 'mod', abilities: ['comment', 'moderate'] })
		cal.editor.run(() => cal.store.put([comment('1', 'cal', 'hi')]))
		h.settle()

		dee.editor.run(() => dee.store.put([comment('1', 'cal', 'edited by dee')]))
		expect(dee.denials.map((d) => d.reason)).toEqual(['You can only change your own comments.'])
		mod.editor.run(() => mod.store.remove(['comment:1' as any]))
		h.settle()
		expect(h.serverRecord('comment:1')).toBeUndefined()
		expect(cal.store.get('comment:1' as any)).toBeUndefined()
	})

	it('denies a forged author', () => {
		const cal = h.connect('cal', { userId: 'cal', abilities: ['comment'] })
		cal.editor.run(() => cal.store.put([comment('1', 'dee', 'not me')]))
		expect(cal.denials.map((d) => d.reason)).toEqual(['Comments must be your own.'])
	})
})

describe('share links', () => {
	beforeEach(() => {
		h = new SyncHarness(definePermissions<TLRecord>({ rules: defaultAbilityRules() }), {
			records,
		})
	})

	// A share link is a token that the app's server turns into access when the socket connects.
	const linkAccess = {
		view: { userId: null, abilities: [] },
		comment: { userId: null, abilities: ['comment'] },
		edit: { userId: null, abilities: ['edit', 'comment'] },
	}

	it('gives each link exactly its access', () => {
		const owner = h.connect('owner', { userId: 'owner', abilities: ['edit', 'comment'] })
		owner.editor.createShapes([geo(createShapeId('a'))])
		h.settle()
		const viewer = h.connect('viewer', linkAccess.view)
		const editor = h.connect('editor', linkAccess.edit)

		expect(viewer.editor.getShape(createShapeId('a'))).toBeDefined()
		expect(viewer.editor.getIsReadonly()).toBe(true)
		editor.editor.updateShapes([{ id: createShapeId('a'), type: 'geo', x: 10 }])
		h.settle()
		expect(h.serverRecord(createShapeId('a'))).toMatchObject({ x: 10 })
	})

	it('revokes a link live', () => {
		const editor = h.connect('editor', linkAccess.edit)
		editor.setServerAccess(linkAccess.view)
		editor.store.withTransaction(() =>
			editor.store.put([{ ...editor.store.get(editor.editor.getCurrentPageId())!, name: 'x' }])
		)
		h.settle()
		expect(h.serverRecords().find((r) => r.typeName === 'page')).toMatchObject({ name: 'Page 1' })
	})
})

describe('agents: write only inside their frame', () => {
	beforeEach(() => {
		h = new SyncHarness(
			definePermissions<TLRecord>({
				rules: [
					...defaultAbilityRules(),
					confineToShape({
						appliesTo: (tx) => tx.can('agent'),
						// the frame the app gave this agent, found by a meta field
						rootId: (tx) =>
							[...tx.before.all()].find(
								(r: any) => r.typeName === 'shape' && r.meta.agentId === tx.access.userId
							)?.id ?? null,
						reason: 'The agent can only change shapes inside its frame.',
					}),
				],
			})
		)
	})

	it('confines the agent to its frame, and leaves people unconfined', () => {
		const ann = h.connect('ann', { userId: 'ann', abilities: ['edit'] })
		const bot = h.connect('bot', { userId: 'bot', abilities: ['edit', 'agent'] })
		const frame = createShapeId('frame')
		ann.editor.createShapes([
			{ id: frame, type: 'frame', x: 0, y: 0, props: { w: 500, h: 500 }, meta: { agentId: 'bot' } },
		])
		ann.editor.createShapes([geo(createShapeId('outside'), 900)])
		h.settle()

		bot.editor.createShapes([{ ...geo(createShapeId('inside'), 10), parentId: frame }])
		bot.editor.createShapes([geo(createShapeId('escape'), 900)])
		bot.editor.updateShapes([{ id: createShapeId('outside'), type: 'geo', x: 0 }])
		// moving its own shape out of the frame is denied too
		bot.editor.reparentShapes([createShapeId('inside')], bot.editor.getCurrentPageId())
		h.settle()

		expect(bot.denials.map((d) => d.reason)).toEqual([
			'The agent can only change shapes inside its frame.',
			'The agent can only change shapes inside its frame.',
			'The agent can only change shapes inside its frame.',
		])
		expect(h.serverRecord(createShapeId('inside'))).toMatchObject({ parentId: frame })
		expect(h.serverRecord(createShapeId('escape'))).toBeUndefined()
		expect(h.serverRecord(createShapeId('outside'))).toMatchObject({ x: 900 })
	})
})

describe('plugins: their own record types, actions, and abilities', () => {
	// A poll plugin. Votes change only through the "vote" action, which the server runs itself, so a
	// client cannot vote twice or vote for someone else, whatever it sends.
	beforeEach(() => {
		h = new SyncHarness(
			definePermissions<TLRecord>({
				rules: [
					...defaultAbilityRules(),
					intentOwnsTypes('vote', { types: ['vote'], ability: 'poll:vote' }),
				],
				mutators: {
					vote(ctx, args: { option: string }) {
						if (!ctx.can('poll:vote')) throw new Error('You cannot vote.')
						const id = `vote:${ctx.access.userId}`
						ctx.put([
							{ id, typeName: 'vote', userId: ctx.access.userId, option: args.option } as any,
						])
					},
				},
			}),
			{ records }
		)
	})

	it('runs the action on the server, and the server result wins', () => {
		const ann = h.connect('ann', { userId: 'ann', abilities: ['edit', 'poll:vote'] })
		const bob = h.connect('bob', { userId: 'bob', abilities: ['edit', 'poll:vote'] })
		ann.editor.permissions.mutate('vote', { option: 'a' })
		ann.editor.permissions.mutate('vote', { option: 'b' })
		h.settle()
		expect(h.serverRecord('vote:ann')).toMatchObject({ option: 'b' })
		expect(bob.store.get('vote:ann' as any)).toMatchObject({ option: 'b' })
	})

	it('denies writing plugin records outside the action', () => {
		const ann = h.connect('ann', { userId: 'ann', abilities: ['edit', 'poll:vote'] })
		ann.editor.run(() =>
			ann.store.put([{ id: 'vote:bob', typeName: 'vote', userId: 'bob', option: 'a' } as any])
		)
		expect(ann.denials.map((d) => d.reason)).toEqual(['Only "vote" can change vote records.'])
	})

	it("ignores a client's forged prediction: the server computes the result", () => {
		const ann = h.connect('ann', { userId: 'ann', abilities: ['edit', 'poll:vote'] })
		// a bad client labels a forged vote as the "vote" action
		ann.store.withTransaction(
			() =>
				ann.store.put([{ id: 'vote:bob', typeName: 'vote', userId: 'bob', option: 'z' } as any]),
			{ intent: { name: 'vote', args: { option: 'a' } } }
		)
		h.settle()
		expect(h.serverRecord('vote:bob')).toBeUndefined()
		expect(h.serverRecord('vote:ann')).toMatchObject({ option: 'a' })
		expect(ann.store.get('vote:bob' as any)).toBeUndefined()
	})

	it('denies the action without the custom ability', () => {
		const val = h.connect('val', { userId: 'val', abilities: ['edit'] })
		val.editor.permissions.mutate('vote', { option: 'a' })
		expect(val.editor.getCrashingError()).toBeNull()
		h.settle()
		expect(h.serverRecord('vote:val')).toBeUndefined()
		expect(val.denials).toEqual([
			{
				reason: 'You cannot vote.',
				intent: { name: 'vote', args: { option: 'a' } },
				source: 'local',
			},
		])
	})
})
