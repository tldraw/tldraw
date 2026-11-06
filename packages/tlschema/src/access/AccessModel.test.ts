import { UnknownRecord } from '@tldraw/store'
import { describe, expect, it } from 'vitest'
import {
	AccessEntry,
	AccessView,
	SessionAccess,
	createAccessView,
	overlayAccessView,
} from './AccessModel'
import { TL_ACCESS_ROOT, createAccessEntry, createTLAccessModel } from './TLAccess'

// A small room: two pages, frames and shapes owned by different people, a comment thread.
//
// document
// ├── page:a ── frame:ann (ann) ── shape:ann1 (ann)
// │          ├── frame:bob (bob) ── shape:bob1 (bob)
// │          ├── shape:teacher (tess)
// │          └── shape:card (dealer)
// ├── page:team ── shape:secret (tess)
// └── comment-thread:t (on page:a, by ann) ── comment:c1 (ann), comment:c2 (bob)

const shape = (id: string, parentId: string, ownerId: string | null): UnknownRecord =>
	({ id, typeName: 'shape', type: 'geo', parentId, meta: ownerId ? { ownerId } : {} }) as any

const base: UnknownRecord[] = [
	{ id: TL_ACCESS_ROOT, typeName: 'document' } as any,
	{ id: 'page:a', typeName: 'page' } as any,
	{ id: 'page:team', typeName: 'page' } as any,
	shape('shape:frameAnn', 'page:a', 'ann'),
	shape('shape:ann1', 'shape:frameAnn', 'ann'),
	shape('shape:frameBob', 'page:a', 'bob'),
	shape('shape:bob1', 'shape:frameBob', 'bob'),
	shape('shape:teacher', 'page:a', 'tess'),
	shape('shape:card', 'page:a', 'dealer'),
	shape('shape:old', 'page:a', null),
	shape('shape:secret', 'page:team', 'tess'),
	{
		id: 'binding:b',
		typeName: 'binding',
		fromId: 'shape:teacher',
		toId: 'shape:secret',
	} as any,
	{
		id: 'comment-thread:t',
		typeName: 'comment-thread',
		pageId: 'page:a',
		anchor: { type: 'page' },
		createdBy: 'ann',
	} as any,
	{ id: 'comment:c1', typeName: 'comment', threadId: 'comment-thread:t', authorId: 'ann' } as any,
	{ id: 'comment:c2', typeName: 'comment', threadId: 'comment-thread:t', authorId: 'bob' } as any,
]

const role = (verbs: string[], subject: AccessEntry['subject'] = { type: 'anyone' }) =>
	({ resource: TL_ACCESS_ROOT, subject, effect: 'allow', verbs }) as AccessEntry

const user = (id: string | null, entries: AccessEntry[] = [], extra: Partial<SessionAccess> = {}) =>
	({ actor: { id }, entries, ...extra }) as SessionAccess

function room(entries: Parameters<typeof createAccessEntry>[0][] = [], records = base) {
	return [...records, ...entries.map((e) => createAccessEntry(e))]
}

const ownerEdits = {
	resource: TL_ACCESS_ROOT,
	subject: { type: 'relation', relation: 'owner' },
	effect: 'allow',
	verbs: ['update', 'delete'],
} as const

describe('the walk', () => {
	const model = createTLAccessModel()

	it('is closed when nothing matches', () => {
		const view = createAccessView(model, room())
		expect(model.explain(user('ann'), 'read', 'shape:ann1', view)).toMatchObject({
			allowed: false,
			reason: 'no entry gives read',
		})
	})

	it('a nearer level beats a farther one, both ways', () => {
		const view = createAccessView(
			model,
			room([
				{
					resource: 'page:a',
					subject: { type: 'user', id: 'bob' },
					effect: 'allow',
					verbs: ['editor'],
				},
				{
					resource: 'shape:frameAnn',
					subject: { type: 'anyone' },
					effect: 'deny',
					verbs: ['update'],
				},
			])
		)
		const bob = user('bob', [role(['viewer'])])
		expect(model.can(bob, 'update', 'shape:teacher', view)).toBe(true) // page allow beats root viewer
		expect(model.can(bob, 'update', 'shape:ann1', view)).toBe(false) // frame deny beats page allow
		expect(model.can(bob, 'update', 'shape:secret', view)).toBe(false) // other page: root only
	})

	it('on one level, deny beats allow, and allow beats block', () => {
		const view = createAccessView(
			model,
			room([
				{ resource: 'page:a', subject: { type: 'anyone' }, effect: 'block', verbs: ['admin'] },
				{
					resource: 'page:a',
					subject: { type: 'user', id: 'ann' },
					effect: 'allow',
					verbs: ['viewer'],
				},
				{
					resource: 'page:a',
					subject: { type: 'user', id: 'bob' },
					effect: 'allow',
					verbs: ['viewer'],
				},
				{
					resource: 'page:a',
					subject: { type: 'user', id: 'bob' },
					effect: 'deny',
					verbs: ['read'],
				},
			])
		)
		const inRoom = [role(['viewer'])]
		expect(model.can(user('ann', inRoom), 'read', 'shape:ann1', view)).toBe(true)
		expect(model.can(user('bob', inRoom), 'read', 'shape:ann1', view)).toBe(false)
		// read needs every ancestor: an entry on a page alone does not open the room
		expect(model.can(user('ann'), 'read', 'shape:ann1', view)).toBe(false)
		expect(model.can(user('cy', [role(['admin'])]), 'read', 'shape:ann1', view)).toBe(false)
	})

	it('every verb needs read, and read needs every ancestor', () => {
		const view = createAccessView(
			model,
			room([
				{ resource: 'page:team', subject: { type: 'anyone' }, effect: 'block', verbs: ['read'] },
				{
					resource: 'shape:secret',
					subject: { type: 'user', id: 'bob' },
					effect: 'allow',
					verbs: ['editor'],
				},
			])
		)
		const bob = user('bob', [role(['viewer'])])
		expect(model.can(bob, 'update', 'shape:secret', view)).toBe(false)
		expect(model.explain(bob, 'update', 'shape:secret', view).reason).toBe(
			'inheritance blocked at page:team'
		)
	})

	it('roles expand, and a cycle is an error', () => {
		expect([...model.expand(['commenter'])].sort()).toEqual(['comment', 'read'])
		expect(() => createTLAccessModel({ roles: { a: ['b'], b: ['a'] } }).expand(['a'])).toThrow(
			/cycle/
		)
	})

	it('a type that is not in the model is closed', () => {
		const view = createAccessView(model, room([], [...base, { id: 'x:1', typeName: 'x' } as any]))
		const admin = user('ann', [role(['admin'])])
		expect(model.can(admin, 'read', 'x:1', view)).toBe(false)
		const decision = model.checkChange(
			admin,
			{ prev: null, next: { id: 'x:2', typeName: 'x' } as any },
			view,
			view
		)
		expect(decision.reason).toBe('x is not in the access model')
	})
})

describe('use cases', () => {
	it('share link tiers: anyone with the link can view, comment, or edit', () => {
		const model = createTLAccessModel()
		const view = createAccessView(model, room())
		const viewer = user(null, [role(['viewer'])])
		const commenter = user('bob', [role(['commenter'])])
		const editor = user('bob', [role(['editor'])])
		const newComment = {
			id: 'comment:new',
			typeName: 'comment',
			threadId: 'comment-thread:t',
			authorId: 'bob',
		} as any
		const after = overlayAccessView(model, view, new Map([['comment:new', newComment]]))

		expect(model.can(viewer, 'read', 'shape:ann1', view)).toBe(true)
		expect(model.can(viewer, 'update', 'shape:ann1', view)).toBe(false)
		expect(model.checkChange(viewer, { prev: null, next: newComment }, view, after).allowed).toBe(
			false
		)
		expect(
			model.checkChange(commenter, { prev: null, next: newComment }, view, after).allowed
		).toBe(true)
		expect(model.can(commenter, 'update', 'shape:ann1', view)).toBe(false)
		expect(model.can(editor, 'update', 'shape:ann1', view)).toBe(true)
	})

	it('a ceiling caps in-room grants: read-only tokens and anonymous visitors', () => {
		const model = createTLAccessModel()
		const view = createAccessView(
			model,
			room([{ resource: 'page:a', subject: { type: 'anyone' }, effect: 'allow', verbs: ['admin'] }])
		)
		const token = user('ann', [role(['editor'])], { limit: ['viewer'] })
		expect(model.can(token, 'read', 'shape:ann1', view)).toBe(true)
		expect(model.explain(token, 'update', 'shape:ann1', view).reason).toBe(
			"update is above this session's ceiling"
		)
		const anonymous = user(null, [], { limit: ['viewer'] })
		expect(model.can(anonymous, 'comment', 'page:a', view)).toBe(false)
	})

	it('private page: only the team sees it, and nobody else gets its records', () => {
		const model = createTLAccessModel()
		const view = createAccessView(
			model,
			room([
				{ resource: 'page:team', subject: { type: 'anyone' }, effect: 'block', verbs: ['admin'] },
				{
					resource: 'page:team',
					subject: { type: 'group', id: 'team' },
					effect: 'allow',
					verbs: ['editor'],
				},
			])
		)
		const member = { actor: { id: 'tess', groups: ['team'] }, entries: [role(['editor'])] }
		const guest = user('gus', [role(['admin'])])
		expect(model.can(member, 'update', 'shape:secret', view)).toBe(true)
		expect(model.can(guest, 'read', 'page:team', view)).toBe(false)
		expect(model.can(guest, 'read', 'shape:secret', view)).toBe(false)
		expect(model.can(guest, 'read', 'shape:ann1', view)).toBe(true)
		// a binding is hidden when either end is hidden
		expect(model.can(guest, 'read', 'binding:b', view)).toBe(false)
		expect(model.can(member, 'read', 'binding:b', view)).toBe(true)
	})

	it('remove one person: a deny entry beats the role they get from the room', () => {
		const model = createTLAccessModel()
		const view = createAccessView(
			model,
			room([
				{
					resource: 'page:a',
					subject: { type: 'user', id: 'bob' },
					effect: 'deny',
					verbs: ['read'],
				},
			])
		)
		expect(model.can(user('bob', [role(['editor'])]), 'read', 'shape:ann1', view)).toBe(false)
		expect(model.can(user('ann', [role(['editor'])]), 'read', 'shape:ann1', view)).toBe(true)
	})

	describe('classroom: students create shapes and edit only their own', () => {
		const model = createTLAccessModel({
			roles: { student: ['viewer', 'comment', 'create'], teacher: ['admin'] },
			entries: [ownerEdits],
		})
		const view = createAccessView(model, room())
		const bob = user('bob', [role(['student'])])
		const tess = user('tess', [role(['teacher'])])
		const move = (s: SessionAccess, id: string, parentId: string) => {
			const prev = view.get(id)!
			const next = { ...prev, parentId } as UnknownRecord
			return model.checkChange(
				s,
				{ prev, next },
				view,
				overlayAccessView(model, view, new Map([[id, next]]))
			)
		}

		it('students edit and delete their own shapes, not others', () => {
			expect(model.can(bob, 'update', 'shape:bob1', view)).toBe(true)
			expect(model.can(bob, 'delete', 'shape:bob1', view)).toBe(true)
			expect(model.can(bob, 'update', 'shape:ann1', view)).toBe(false)
			expect(model.can(bob, 'delete', 'page:a', view)).toBe(false)
			expect(model.can(tess, 'update', 'shape:ann1', view)).toBe(true)
		})

		it('ownership fails closed: an unowned shape or an anonymous actor owns nothing', () => {
			expect(model.can(bob, 'update', 'shape:old', view)).toBe(false)
			expect(model.can(user(null, [role(['student'])]), 'update', 'shape:old', view)).toBe(false)
		})

		it('the server stamps the owner, and a client cannot change it', () => {
			const next = shape('shape:new', 'page:a', 'ann')
			expect((model.stamp(bob, null, next) as any).meta).toEqual({ ownerId: 'bob' })
			const prev = view.get('shape:bob1')!
			expect((model.stamp(bob, prev, { ...prev, meta: {} } as any) as any).meta).toEqual({
				ownerId: 'bob',
			})
			const stolen = { ...prev, meta: { ownerId: 'ann' } } as UnknownRecord
			expect(model.checkChange(bob, { prev, next: stolen }, view, view).reason).toBe(
				'the owner of a record cannot change'
			)
		})

		it('a student can move their own shape anywhere they can write', () => {
			expect(move(bob, 'shape:bob1', 'page:a').allowed).toBe(true)
		})
	})

	it('areas: each student edits only inside their own frame, and a move checks both places', () => {
		const model = createTLAccessModel()
		const view = createAccessView(
			model,
			room([
				{
					resource: 'shape:frameAnn',
					subject: { type: 'user', id: 'ann' },
					effect: 'allow',
					verbs: ['editor'],
				},
				{
					resource: 'shape:frameBob',
					subject: { type: 'user', id: 'bob' },
					effect: 'allow',
					verbs: ['editor'],
				},
			])
		)
		const ann = user('ann', [role(['viewer'])])
		expect(model.can(ann, 'update', 'shape:ann1', view)).toBe(true)
		expect(model.can(ann, 'update', 'shape:bob1', view)).toBe(false)
		expect(model.can(ann, 'update', 'shape:teacher', view)).toBe(false)
		const prev = view.get('shape:ann1')!
		const next = { ...prev, parentId: 'shape:frameBob' } as UnknownRecord
		const after = overlayAccessView(model, view, new Map([[prev.id, next]]))
		expect(model.checkChange(ann, { prev, next }, view, after)).toMatchObject({
			allowed: false,
			reason: 'no entry gives update',
		})
	})

	it('comments: commenters add their own and manage only their own; admins manage all', () => {
		const model = createTLAccessModel()
		const view = createAccessView(model, room())
		const bob = user('bob', [role(['commenter'])])
		const admin = user('tess', [role(['admin'])])
		const c1 = view.get('comment:c1')!
		const c2 = view.get('comment:c2')!
		const edit = (s: SessionAccess, prev: UnknownRecord) =>
			model.checkChange(s, { prev, next: { ...prev, body: 'x' } as any }, view, view).allowed
		expect(edit(bob, c2)).toBe(true)
		expect(edit(bob, c1)).toBe(false)
		expect(model.checkChange(bob, { prev: c1, next: null }, view, view).allowed).toBe(false)
		expect(edit(admin, c1)).toBe(true)
		// a viewer who once commented still owns the comment, but cannot write it without the role
		expect(model.can(user('bob', [role(['viewer'])]), 'comment', 'comment:c2', view)).toBe(false)
	})

	it('poker: only the holder sees their card until it is revealed', () => {
		const model = createTLAccessModel()
		const hide = createAccessEntry({
			resource: 'shape:card',
			subject: { type: 'anyone' },
			effect: 'block',
			verbs: ['read'],
		})
		const holder = createAccessEntry({
			resource: 'shape:card',
			subject: { type: 'user', id: 'ann' },
			effect: 'allow',
			verbs: ['read'],
		})
		const view = createAccessView(model, [...room(), hide, holder])
		const ann = user('ann', [role(['editor'])])
		const bob = user('bob', [role(['editor'])])
		expect(model.can(ann, 'read', 'shape:card', view)).toBe(true)
		expect(model.can(bob, 'read', 'shape:card', view)).toBe(false)
		// reveal: the dealer deletes the block
		view.delete(hide.id)
		expect(model.can(bob, 'read', 'shape:card', view)).toBe(true)
	})

	it('locks are deny entries: they hold for editors and inherit to children', () => {
		const model = createTLAccessModel()
		const lock = createAccessEntry({
			resource: 'shape:frameAnn',
			subject: { type: 'anyone' },
			effect: 'deny',
			verbs: ['update', 'delete'],
		})
		const view = createAccessView(model, [...room(), lock])
		const editor = user('bob', [role(['editor'])])
		const admin = user('tess', [role(['admin'])])
		expect(model.can(editor, 'update', 'shape:ann1', view)).toBe(false)
		expect(model.can(admin, 'update', 'shape:ann1', view)).toBe(false)
		// unlocking is an entry write: it needs manage
		expect(model.checkChange(editor, { prev: lock, next: null }, view, view).allowed).toBe(false)
		expect(model.checkChange(admin, { prev: lock, next: null }, view, view).allowed).toBe(true)
	})

	describe('in-room entries', () => {
		const model = createTLAccessModel({ roles: { owner: ['admin', 'publish'] } })
		const view = createAccessView(model, room())
		const write = (s: SessionAccess, entry: Parameters<typeof createAccessEntry>[0]) => {
			const next = createAccessEntry(entry)
			return model.checkChange(
				s,
				{ prev: null, next },
				view,
				overlayAccessView(model, view, new Map([[next.id, next]]))
			)
		}

		it('need manage, and cannot give more than the writer has', () => {
			const editor = user('bob', [role(['editor'])])
			const admin = user('tess', [role(['admin'])])
			const give = (verbs: string[]) =>
				({
					resource: 'page:a',
					subject: { type: 'user', id: 'cy' },
					effect: 'allow',
					verbs,
				}) as const
			expect(write(editor, give(['viewer'])).allowed).toBe(false)
			expect(write(admin, give(['editor'])).allowed).toBe(true)
			expect(write(admin, give(['owner'])).reason).toBe('cannot give publish: you do not have it')
		})

		it('are visible to their subject and to managers only', () => {
			const entry = createAccessEntry({
				resource: 'page:a',
				subject: { type: 'user', id: 'cy' },
				effect: 'allow',
				verbs: ['editor'],
			})
			const withEntry = createAccessView(model, [...room(), entry])
			expect(model.canRead(user('cy', [role(['viewer'])]), entry.id, withEntry)).toBe(true)
			expect(model.canRead(user('bob', [role(['editor'])]), entry.id, withEntry)).toBe(false)
			expect(model.canRead(user('tess', [role(['admin'])]), entry.id, withEntry)).toBe(true)
		})

		it('a relation entry is visible to every reader, so the editor decides like the server', () => {
			// page:a has no owner, but the entry applies to bob's shapes below it
			const entry = createAccessEntry({ ...ownerEdits, resource: 'page:a' })
			const withEntry = createAccessView(model, [...room(), entry])
			const bob = user('bob', [role(['viewer'])])
			expect(model.canRead(bob, entry.id, withEntry)).toBe(true)
			expect(model.can(bob, 'update', 'shape:bob1', withEntry)).toBe(true)
			expect(model.can(bob, 'update', 'shape:ann1', withEntry)).toBe(false)
		})
	})

	it('plugin types and verbs: a custom record type with its own verb', () => {
		const model = createTLAccessModel({
			roles: { voter: ['viewer', 'vote'] },
			types: {
				vote: {
					parent: (vote: any) => vote.pollId,
					verbs: { create: 'vote', update: 'vote:change', delete: 'vote:change' },
					owner: { get: (v: any) => v.voterId, set: (v: any, voterId) => ({ ...v, voterId }) },
				},
			},
		})
		const records = [
			...room(),
			{ id: 'shape:poll', typeName: 'shape', parentId: 'page:a', meta: {} } as any,
		]
		const view = createAccessView(model, records)
		const vote = { id: 'vote:1', typeName: 'vote', pollId: 'shape:poll', voterId: 'bob' } as any
		const after = overlayAccessView(model, view, new Map([[vote.id, vote]]))
		const voter = user('bob', [role(['voter'])])
		expect(model.checkChange(voter, { prev: null, next: vote }, view, after).allowed).toBe(true)
		expect(
			model.checkChange(user('cy', [role(['viewer'])]), { prev: null, next: vote }, view, after)
				.allowed
		).toBe(false)
		// closing the poll is one deny entry, no code
		const closed = overlayAccessView(
			model,
			after,
			new Map([
				[
					'access:close',
					createAccessEntry({
						id: 'access:close' as any,
						resource: 'shape:poll',
						subject: { type: 'anyone' },
						effect: 'deny',
						verbs: ['vote'],
					}),
				],
			])
		)
		expect(model.can(voter, 'vote', 'shape:poll', closed)).toBe(false)
	})

	it('agents: a capped service actor writes only in its frame and cannot delete', () => {
		const model = createTLAccessModel()
		const view = createAccessView(
			model,
			room([
				{
					resource: 'shape:frameBob',
					subject: { type: 'user', id: 'agent:1' },
					effect: 'allow',
					verbs: ['editor'],
				},
			])
		)
		const agent = user('agent:1', [role(['viewer'])], { limit: ['viewer', 'create', 'update'] })
		expect(model.can(agent, 'update', 'shape:bob1', view)).toBe(true)
		expect(model.can(agent, 'update', 'shape:ann1', view)).toBe(false)
		expect(model.can(agent, 'delete', 'shape:bob1', view)).toBe(false)
	})
})

describe('views', () => {
	it('an overlay sees added and removed entries', () => {
		const model = createTLAccessModel()
		const entry = createAccessEntry({
			resource: 'page:a',
			subject: { type: 'anyone' },
			effect: 'allow',
			verbs: ['viewer'],
		})
		const view: AccessView = createAccessView(model, [...room(), entry])
		expect(view.entriesAt('page:a')).toHaveLength(1)
		const removed = overlayAccessView(model, view, new Map([[entry.id, null]]))
		expect(removed.entriesAt('page:a')).toHaveLength(0)
		const moved = overlayAccessView(
			model,
			view,
			new Map([[entry.id, { ...entry, resource: 'page:team' }]])
		)
		expect(moved.entriesAt('page:a')).toHaveLength(0)
		expect(moved.entriesAt('page:team')).toHaveLength(1)
	})
})
