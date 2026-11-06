/**
 * Backtests: each use case from the permissions research, run end to end. Real tldraw editors
 * connect to a room over the sync protocol. The room evaluates the default relation schema, the
 * clients evaluate the same schema, and grants above the room come from a tuple store.
 */
import {
	PageRecordType,
	TLPageId,
	TLShapeId,
	createComment,
	createCommentThread,
	createRelation,
	createShapeId,
	toRichText,
} from 'tldraw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { attenuateCapabilityToken, createCapabilityToken } from '../../lib/relations/tokens'
import { Peer, ROOT, RelationsHarness, TOKEN_SECRET, discards } from './harness'

vi.mock('@tldraw/editor/src/lib/editor/managers/TickManager/TickManager.ts', () => ({
	TickManager: class {
		start() {}
		dispose() {}
	},
}))
// @ts-expect-error
global.requestAnimationFrame = (cb: () => any) => cb()

let h: RelationsHarness
afterEach(() => h?.close())

const PAGE = 'page:page' as TLPageId
const box = (peer: Peer, id: TLShapeId, opts: { parentId?: TLShapeId; x?: number } = {}) =>
	peer.ed().createShape({ id, type: 'geo', x: opts.x ?? 0, y: 0, parentId: opts.parentId })
const frame = (peer: Peer, id: TLShapeId, x = 0) =>
	peer.ed().createShape({ id, type: 'frame', x, y: 0, props: { w: 500, h: 500 } })
const xOf = (peer: Peer, id: TLShapeId) => peer.ed().getShape(id)?.x
/** A raw store write, as a modified client would make: past the editor's lock checks too. */
const rawPut = (peer: Peer, id: string, patch: object) =>
	peer.store.put([{ ...(peer.store.get(id as any) as any), ...patch }])
const pages = (peer: Peer) =>
	peer.store
		.allRecords()
		.filter((r) => r.typeName === 'page')
		.map((r) => r.id)
		.sort()

/** Put in-room relation tuples as a peer (who must have `share` on the object). */
async function putRelation(peer: Peer, object: string, relation: string, subject: string) {
	peer.store.put([createRelation(object, relation, subject) as any])
	await h.flush()
}
async function removeRelation(peer: Peer, object: string, relation: string, subject: string) {
	peer.store.remove([createRelation(object, relation, subject).id as any])
	await h.flush()
}

describe('file read and write control', () => {
	it('a user with no relation to the file receives nothing', async () => {
		h = new RelationsHarness([{ object: ROOT, relation: 'owner', subject: 'user:teacher' }])
		const teacher = await h.connect('teacher', 'user:teacher')
		box(teacher, createShapeId('a'))
		await h.flush()
		const stranger = await h.connect('stranger', 'user:stranger')
		expect(stranger.errors).toEqual(['FORBIDDEN'])
		expect(Object.keys(stranger.store.serialize('document'))).toEqual([])
		expect(stranger.editor).toBe(null)
	})

	it('a viewer reads everything; the client guard drops its edits before they are sent', async () => {
		h = new RelationsHarness([
			{ object: ROOT, relation: 'owner', subject: 'user:teacher' },
			{ object: ROOT, relation: 'viewer', subject: 'user:ann' },
		])
		const teacher = await h.connect('teacher', 'user:teacher')
		const ann = await h.connect('ann', 'user:ann')
		const id = createShapeId('a')
		box(teacher, id)
		await h.flush()
		expect(ann.ed().getShape(id)?.meta.owner).toBe('user:teacher')
		expect(ann.ed().isShapeOrAncestorLocked(id)).toBe(true)

		ann.ed().updateShape({ id, type: 'geo', x: 100 })
		ann.ed().createShape({ type: 'geo', x: 0, y: 0 })
		await h.flush()
		expect(xOf(ann, id)).toBe(0)
		expect(ann.shapeIds()).toEqual([id])
		expect(discards(ann)).toEqual([]) // nothing was even sent
	})

	it('the server discards writes from a client that skips the guard', async () => {
		h = new RelationsHarness([
			{ object: ROOT, relation: 'owner', subject: 'user:teacher' },
			{ object: ROOT, relation: 'viewer', subject: 'user:mallory' },
		])
		const teacher = await h.connect('teacher', 'user:teacher')
		const mallory = await h.connect('mallory', 'user:mallory')
		const id = createShapeId('a')
		box(teacher, id)
		await h.flush()
		mallory.forge(() => rawPut(mallory, id, { x: 100 }))
		await h.flush()
		expect(discards(mallory).length).toBe(1)
		expect(xOf(teacher, id)).toBe(0)
		expect(xOf(mallory, id)).toBe(0) // rolled back
	})

	it('roles flow down from team and folder, including nested teams', async () => {
		h = new RelationsHarness([
			{ object: ROOT, relation: 'parent', subject: 'folder:design' },
			{ object: 'folder:design', relation: 'parent', subject: 'team:acme' },
			{ object: 'folder:design', relation: 'editor', subject: 'team:designers#member' },
			{ object: 'team:designers', relation: 'member', subject: 'team:interns#member' },
			{ object: 'team:interns', relation: 'member', subject: 'user:ann' },
			{ object: 'team:acme', relation: 'viewer', subject: 'user:bob' },
		])
		const ann = await h.connect('ann', 'user:ann')
		const bob = await h.connect('bob', 'user:bob')
		expect(ann.relations.can('edit', ROOT)).toBe(true)
		expect(bob.relations.can('read', ROOT)).toBe(true)
		expect(bob.relations.can('edit', ROOT)).toBe(false)
		const id = createShapeId('a')
		box(ann, id)
		await h.flush()
		expect(bob.has(id)).toBe(true)
	})

	it('a grant change reaches open sessions live, with no reconnect', async () => {
		h = new RelationsHarness([
			{ object: ROOT, relation: 'owner', subject: 'user:teacher' },
			{ object: ROOT, relation: 'viewer', subject: 'user:ann' },
		])
		const teacher = await h.connect('teacher', 'user:teacher')
		const id = createShapeId('a')
		box(teacher, id)
		await h.flush()
		const ann = await h.connect('ann', 'user:ann')
		expect(ann.ed().isShapeOrAncestorLocked(id)).toBe(true)

		await h.grant(ROOT, 'editor', 'user:ann')
		expect(ann.relations.can('edit', ROOT)).toBe(true)
		expect(ann.ed().isShapeOrAncestorLocked(id)).toBe(false)

		// with nothing left to read, the session is closed rather than emptied under the editor
		await h.revoke(ROOT, 'viewer', 'user:ann')
		expect(ann.errors).toEqual([])
		await h.revoke(ROOT, 'editor', 'user:ann')
		expect(ann.errors).toEqual(['FORBIDDEN'])
	})
})

describe('page read control', () => {
	it('a restricted page is hidden from the file viewers until it is shared with them', async () => {
		h = new RelationsHarness([
			{ object: ROOT, relation: 'owner', subject: 'user:teacher' },
			{ object: ROOT, relation: 'editor', subject: 'user:ann' },
		])
		const teacher = await h.connect('teacher', 'user:teacher')
		const ann = await h.connect('ann', 'user:ann')
		const secret = PageRecordType.createId('answers')
		// restrict first, then create: grants are records, and the page is born hidden
		await putRelation(teacher, secret, 'restricted', '*')
		teacher.ed().createPage({ id: secret, name: 'Answers' })
		await h.flush()
		const answer = createShapeId('answer')
		teacher.ed().setCurrentPage(secret)
		box(teacher, answer)
		await h.flush()
		expect(pages(teacher)).toEqual([secret, PAGE].sort())
		expect(pages(ann)).toEqual([PAGE])
		expect(ann.has(answer)).toBe(false)

		await putRelation(teacher, secret, 'viewer', 'user:ann')
		expect(pages(ann)).toEqual([secret, PAGE].sort())
		expect(ann.has(answer)).toBe(true)
		// a viewer grant on the page does not make the file editor an editor there
		expect(ann.relations.canUpdate(ann.ed().getShape(answer)!)).toBe(false)

		await removeRelation(teacher, secret, 'viewer', 'user:ann')
		expect(ann.has(answer)).toBe(false)
	})

	it('a page can be hidden from one team only', async () => {
		h = new RelationsHarness([
			{ object: ROOT, relation: 'owner', subject: 'user:teacher' },
			{ object: ROOT, relation: 'editor', subject: 'team:staff#member' },
			{ object: ROOT, relation: 'contributor', subject: 'team:students#member' },
			{ object: 'team:staff', relation: 'member', subject: 'user:ta' },
			{ object: 'team:students', relation: 'member', subject: 'user:ann' },
		])
		const teacher = await h.connect('teacher', 'user:teacher')
		const notes = PageRecordType.createId('notes')
		await putRelation(teacher, notes, 'restricted', 'team:students#member')
		teacher.ed().createPage({ id: notes, name: 'Staff notes' })
		await h.flush()
		const ta = await h.connect('ta', 'user:ta')
		const ann = await h.connect('ann', 'user:ann')
		expect(pages(ta)).toContain(notes)
		expect(pages(ann)).not.toContain(notes)
	})

	it('presence on a page you cannot read is not sent to you', async () => {
		h = new RelationsHarness([
			{ object: ROOT, relation: 'owner', subject: 'user:teacher' },
			{ object: ROOT, relation: 'viewer', subject: 'user:ann' },
		])
		const teacher = await h.connect('teacher', 'user:teacher')
		const ann = await h.connect('ann', 'user:ann')
		const presences = () => ann.store.allRecords().filter((r) => r.typeName === 'instance_presence')
		expect(presences().length).toBe(1)

		const secret = PageRecordType.createId('secret')
		await putRelation(teacher, secret, 'restricted', '*')
		teacher.ed().createPage({ id: secret, name: 'Secret' })
		teacher.ed().setCurrentPage(secret)
		await h.flush()
		expect(presences().length).toBe(0)

		teacher.ed().setCurrentPage(PAGE)
		await h.flush()
		expect(presences().length).toBe(1)
	})
})

describe('shape write control (classroom)', () => {
	const classroom = () =>
		new RelationsHarness([
			{ object: ROOT, relation: 'owner', subject: 'user:teacher' },
			{ object: ROOT, relation: 'contributor', subject: 'team:class#member' },
			{ object: 'team:class', relation: 'member', subject: 'user:ann' },
			{ object: 'team:class', relation: 'member', subject: 'user:ben' },
		])

	it('students add shapes and change only their own', async () => {
		h = classroom()
		const teacher = await h.connect('teacher', 'user:teacher')
		const ann = await h.connect('ann', 'user:ann')
		const ben = await h.connect('ben', 'user:ben')
		const a = createShapeId('ann-box')
		const t = createShapeId('teacher-box')
		box(ann, a)
		box(teacher, t)
		await h.flush()
		expect(teacher.ed().getShape(a)?.meta.owner).toBe('user:ann')

		ann.ed().updateShape({ id: a, type: 'geo', x: 50 })
		ben.ed().updateShape({ id: a, type: 'geo', x: 99 })
		ben.ed().deleteShapes([a])
		ann.ed().updateShape({ id: t, type: 'geo', x: 99 })
		await h.flush()
		expect(xOf(teacher, a)).toBe(50)
		expect(xOf(teacher, t)).toBe(0)
		expect(ben.ed().isShapeOrAncestorLocked(a)).toBe(true)
		expect(ann.ed().isShapeOrAncestorLocked(a)).toBe(false)

		// the teacher manages every shape
		teacher.ed().updateShape({ id: a, type: 'geo', x: 7 })
		await h.flush()
		expect(xOf(ann, a)).toBe(7)
	})

	it('the server stamps the owner, so a client cannot create a shape in someone else name', async () => {
		h = classroom()
		await h.connect('teacher', 'user:teacher') // creates the first page
		const ben = await h.connect('ben', 'user:ben')
		const id = createShapeId('forged')
		ben.forge(() =>
			ben.ed().createShape({ id, type: 'geo', x: 0, y: 0, meta: { owner: 'user:ann' } })
		)
		await h.flush()
		const ann = await h.connect('ann', 'user:ann')
		expect(ann.ed().getShape(id)?.meta.owner).toBe('user:ben')
		// and the owner cannot be changed later
		ben.forge(() => rawPut(ben, id, { meta: { owner: 'user:ann' } }))
		await h.flush()
		expect(ann.ed().getShape(id)?.meta.owner).toBe('user:ben')
		expect(discards(ben).length).toBe(1)
	})

	it('a student given an area can add only inside it, and cannot move work into another area', async () => {
		h = new RelationsHarness([
			{ object: ROOT, relation: 'owner', subject: 'user:teacher' },
			{ object: ROOT, relation: 'viewer', subject: 'user:ann' },
		])
		const teacher = await h.connect('teacher', 'user:teacher')
		const areaA = createShapeId('area-a')
		const areaB = createShapeId('area-b')
		frame(teacher, areaA, 0)
		frame(teacher, areaB, 600)
		await h.flush()
		await putRelation(teacher, areaA, 'contributor', 'user:ann')
		await putRelation(teacher, areaB, 'contributor', 'user:ben')
		const ann = await h.connect('ann', 'user:ann')

		const inA = createShapeId('in-a')
		box(ann, inA, { parentId: areaA, x: 10 })
		box(ann, createShapeId('on-page'), { x: 2000 })
		await h.flush()
		expect(teacher.ed().getShape(inA)?.parentId).toBe(areaA)
		expect(teacher.has(createShapeId('on-page'))).toBe(false)

		// moving it into B passes the check on where it was, and fails on where it would go
		ann.ed().updateShape({ id: inA, type: 'geo', parentId: areaB })
		await h.flush()
		expect(teacher.ed().getShape(inA)?.parentId).toBe(areaA)
		// the frame itself belongs to the teacher
		expect(ann.ed().isShapeOrAncestorLocked(areaA)).toBe(true)
	})

	it('the teacher calls on a student: edit access is granted and taken back live', async () => {
		h = classroom()
		const teacher = await h.connect('teacher', 'user:teacher')
		const ann = await h.connect('ann', 'user:ann')
		const t = createShapeId('teacher-box')
		box(teacher, t)
		await h.flush()
		expect(ann.ed().isShapeOrAncestorLocked(t)).toBe(true)

		await h.grant(ROOT, 'editor', 'user:ann')
		expect(ann.ed().isShapeOrAncestorLocked(t)).toBe(false)
		ann.ed().updateShape({ id: t, type: 'geo', x: 42 })
		await h.flush()
		expect(xOf(teacher, t)).toBe(42)

		await h.revoke(ROOT, 'editor', 'user:ann')
		expect(ann.ed().isShapeOrAncestorLocked(t)).toBe(true)
	})

	it('a write that was valid when made is discarded if access was revoked before it arrived', async () => {
		h = classroom()
		const teacher = await h.connect('teacher', 'user:teacher')
		await h.grant(ROOT, 'editor', 'user:ann')
		const ann = await h.connect('ann', 'user:ann')
		const t = createShapeId('teacher-box')
		box(teacher, t)
		await h.flush()
		ann.ed().updateShape({ id: t, type: 'geo', x: 42 })
		ann.store._flushHistory() // queued on ann's socket, not yet delivered
		await h.tuples.delete({ object: ROOT, relation: 'editor', subject: 'user:ann' })
		await h.flush()
		expect(xOf(teacher, t)).toBe(0)
		expect(xOf(ann, t)).toBe(0)
	})
})

describe('comments', () => {
	const setup = async () => {
		h = new RelationsHarness([
			{ object: ROOT, relation: 'owner', subject: 'user:teacher' },
			{ object: ROOT, relation: 'commenter', subject: 'user:ann' },
			{ object: ROOT, relation: 'commenter', subject: 'user:ben' },
			{ object: ROOT, relation: 'viewer', subject: 'link:public' },
		])
		const teacher = await h.connect('teacher', 'user:teacher')
		const ann = await h.connect('ann', 'user:ann')
		const ben = await h.connect('ben', 'user:ben')
		return { teacher, ann, ben }
	}
	const post = (peer: Peer, authorId: string) => {
		const thread = createCommentThread({
			pageId: PAGE,
			anchor: { type: 'page' },
			createdBy: authorId,
		})
		const comment = createComment({
			threadId: thread.id,
			pageId: PAGE,
			authorId,
			body: toRichText('hi'),
		})
		peer.store.put([thread, comment] as any[])
		return comment
	}

	it('commenters add comments in their own name and cannot draw', async () => {
		const { teacher, ann } = await setup()
		const c = post(ann, 'someone-else') // the stamp replaces the claimed author
		box(ann, createShapeId('nope'))
		await h.flush()
		expect((teacher.store.get(c.id as any) as any)?.authorId).toBe('ann')
		expect(teacher.shapeIds()).toEqual([])
	})

	it('authors edit their own comments; moderators may only hide them', async () => {
		const { teacher, ann, ben } = await setup()
		const c = post(ann, 'ann')
		await h.flush()
		const edit = (peer: Peer, patch: object) => {
			peer.store.put([{ ...(peer.store.get(c.id as any) as any), ...patch }])
		}
		edit(ben, { body: toRichText('ben was here') })
		await h.flush()
		expect((teacher.store.get(c.id as any) as any).body).toEqual(toRichText('hi'))

		edit(ann, { body: toRichText('edited'), editedAt: 1 })
		await h.flush()
		expect((teacher.store.get(c.id as any) as any).body).toEqual(toRichText('edited'))

		edit(teacher, { body: toRichText('teacher rewrote it') })
		await h.flush()
		expect((ann.store.get(c.id as any) as any).body).toEqual(toRichText('edited'))

		edit(teacher, { isDeleted: true })
		await h.flush()
		expect((ann.store.get(c.id as any) as any).isDeleted).toBe(true)
	})

	it('an anonymous link visitor can read comments but cannot post one', async () => {
		await setup()
		const token = await createCapabilityToken({ subject: 'link:public' }, TOKEN_SECRET)
		const guest = await h.connectWithToken('guest', token)
		let c: any
		guest.forge(() => (c = post(guest, 'guest')))
		await h.flush()
		expect(h.peers[0].store.get(c.id as any)).toBe(undefined)
		expect(discards(guest).length).toBe(1)
	})
})

describe('share links', () => {
	const setup = async () => {
		h = new RelationsHarness([{ object: ROOT, relation: 'owner', subject: 'user:teacher' }])
		const teacher = await h.connect('teacher', 'user:teacher')
		const id = createShapeId('a')
		box(teacher, id)
		await h.flush()
		return { teacher, id }
	}

	it('a view link lets an anonymous visitor read but not write', async () => {
		const { id } = await setup()
		await h.grant(ROOT, 'viewer', 'link:view')
		const guest = await h.connectWithToken(
			'guest',
			await createCapabilityToken({ subject: 'link:view' }, TOKEN_SECRET)
		)
		expect(guest.has(id)).toBe(true)
		expect(guest.ed().isShapeOrAncestorLocked(id)).toBe(true)
	})

	it('a link can share a single page', async () => {
		const { teacher, id } = await setup()
		const shared = PageRecordType.createId('shared')
		teacher.ed().createPage({ id: shared, name: 'Shared' })
		teacher.ed().setCurrentPage(shared)
		const onShared = createShapeId('on-shared')
		box(teacher, onShared)
		await h.flush()
		await putRelation(teacher, shared, 'viewer', 'link:one-page')
		const guest = await h.connectWithToken(
			'guest',
			await createCapabilityToken({ subject: 'link:one-page' }, TOKEN_SECRET)
		)
		expect(pages(guest)).toEqual([shared])
		expect(guest.has(onShared)).toBe(true)
		expect(guest.has(id)).toBe(false)
	})

	it('an edit link edits; a caveat added by the holder caps it to read only', async () => {
		const { teacher, id } = await setup()
		await h.grant(ROOT, 'editor', 'link:edit')
		const token = await createCapabilityToken({ subject: 'link:edit' }, TOKEN_SECRET)
		const editor = await h.connectWithToken('editor', token)
		editor.ed().updateShape({ id, type: 'geo', x: 5 })
		await h.flush()
		expect(xOf(teacher, id)).toBe(5)

		// attenuating needs no secret, and the server enforces it
		const readOnly = await attenuateCapabilityToken(token, { relations: ['read'] })
		const viewer = await h.connectWithToken('viewer', readOnly)
		expect(viewer.ed().isShapeOrAncestorLocked(id)).toBe(true)
		viewer.forge(() => rawPut(viewer, id, { x: 9 }))
		await h.flush()
		expect(xOf(teacher, id)).toBe(5)
		expect(discards(viewer).length).toBe(1)
	})

	it('revoking a link removes access from visitors who are connected', async () => {
		const { id } = await setup()
		await h.grant(ROOT, 'viewer', 'link:view')
		const guest = await h.connectWithToken(
			'guest',
			await createCapabilityToken({ subject: 'link:view' }, TOKEN_SECRET)
		)
		expect(guest.has(id)).toBe(true)
		await h.revoke(ROOT, 'viewer', 'link:view')
		expect(guest.errors).toEqual(['FORBIDDEN'])
	})
})

describe('agents', () => {
	it('an agent acting for a user writes only inside its frame', async () => {
		h = new RelationsHarness([
			{ object: ROOT, relation: 'owner', subject: 'user:teacher' },
			{ object: ROOT, relation: 'editor', subject: 'user:ann' },
		])
		const teacher = await h.connect('teacher', 'user:teacher')
		const workspace = createShapeId('agent-area')
		const outside = createShapeId('outside')
		frame(teacher, workspace)
		box(teacher, outside, { x: 900 })
		await h.flush()
		const token = await createCapabilityToken(
			{ subject: 'agent:helper', actingFor: 'user:ann', ceilings: [{ within: [workspace] }] },
			TOKEN_SECRET
		)
		const agent = await h.connectWithToken('agent', token)
		const made = createShapeId('made-by-agent')
		box(agent, made, { parentId: workspace })
		agent.ed().updateShape({ id: outside, type: 'geo', x: 0 })
		box(agent, createShapeId('loose'), { x: 2000 })
		await h.flush()
		expect(teacher.ed().getShape(made)?.parentId).toBe(workspace)
		expect(xOf(teacher, outside)).toBe(900)
		expect(teacher.has(createShapeId('loose'))).toBe(false)
		// it reads everything its user can read
		expect(agent.has(outside)).toBe(true)
	})

	it('an agent never gets more access than the user it acts for', async () => {
		h = new RelationsHarness([
			{ object: ROOT, relation: 'owner', subject: 'user:teacher' },
			{ object: ROOT, relation: 'viewer', subject: 'user:ann' },
		])
		await h.connect('teacher', 'user:teacher')
		const token = await createCapabilityToken(
			{ subject: 'agent:helper', actingFor: 'user:ann' },
			TOKEN_SECRET
		)
		const agent = await h.connectWithToken('agent', token)
		expect(agent.relations.can('edit', ROOT)).toBe(false)
		expect(agent.relations.can('read', ROOT)).toBe(true)
	})
})

describe('plugin shape types and actions', () => {
	it('a shape type can be restricted for one team, and the client knows which tools to show', async () => {
		h = new RelationsHarness([
			{ object: ROOT, relation: 'owner', subject: 'user:teacher' },
			{ object: ROOT, relation: 'contributor', subject: 'team:class#member' },
			{ object: 'team:class', relation: 'member', subject: 'user:ann' },
		])
		const teacher = await h.connect('teacher', 'user:teacher')
		await putRelation(teacher, 'shape_type:geo', 'restricted', 'team:class#member')
		const ann = await h.connect('ann', 'user:ann')
		const probe = (type: string) =>
			ann.relations.canCreate({
				...ann
					.ed()
					.getShapeUtil(type as any)
					.getDefaultProps(),
				id: createShapeId(),
				typeName: 'shape',
				type,
				parentId: PAGE,
				meta: {},
			} as any)
		expect(probe('geo')).toBe(false)
		expect(probe('draw')).toBe(true)

		ann.ed().createShape({ type: 'geo', x: 0, y: 0 })
		ann.ed().createShape({ type: 'note', x: 0, y: 0 })
		await h.flush()
		expect(
			teacher
				.ed()
				.getCurrentPageShapes()
				.map((s) => s.type)
		).toEqual(['note'])
	})

	it('an editor action is an object that can be granted', async () => {
		h = new RelationsHarness([
			{ object: ROOT, relation: 'owner', subject: 'user:teacher' },
			{ object: ROOT, relation: 'editor', subject: 'team:all#member' },
			{ object: 'team:all', relation: 'member', subject: 'user:ann' },
			{ object: 'team:all', relation: 'member', subject: 'user:ben' },
		])
		const teacher = await h.connect('teacher', 'user:teacher')
		await putRelation(teacher, 'action:ai-generate', 'restricted', '*')
		await putRelation(teacher, 'action:ai-generate', 'use', 'user:ben')
		const ann = await h.connect('ann', 'user:ann')
		const ben = await h.connect('ben', 'user:ben')
		expect(ann.relations.can('use', 'action:ai-generate')).toBe(false)
		expect(ben.relations.can('use', 'action:ai-generate')).toBe(true)
		expect(ann.relations.can('use', 'action:align')).toBe(true)
	})
})

describe('hidden content', () => {
	it('progressive reveal: a restricted frame and its contents appear when the teacher reveals it', async () => {
		h = new RelationsHarness([
			{ object: ROOT, relation: 'owner', subject: 'user:teacher' },
			{ object: ROOT, relation: 'viewer', subject: 'user:ann' },
		])
		const teacher = await h.connect('teacher', 'user:teacher')
		const step2 = createShapeId('step-2')
		const inside = createShapeId('step-2-content')
		// one operation, so no session ever sees the frame before it is restricted
		teacher.ed().run(() => {
			frame(teacher, step2)
			teacher.store.put([createRelation(step2, 'restricted', '*') as any])
			box(teacher, inside, { parentId: step2 })
		})
		await h.flush()
		const ann = await h.connect('ann', 'user:ann')
		expect(ann.has(step2)).toBe(false)
		expect(ann.has(inside)).toBe(false)

		await removeRelation(teacher, step2, 'restricted', '*')
		expect(ann.has(step2)).toBe(true)
		expect(ann.has(inside)).toBe(true)
	})

	it('cards: each face is readable only by its holder until it is turned over', async () => {
		h = new RelationsHarness([
			{ object: ROOT, relation: 'owner', subject: 'user:dealer' },
			{ object: ROOT, relation: 'viewer', subject: 'user:ann' },
			{ object: ROOT, relation: 'viewer', subject: 'user:ben' },
		])
		const dealer = await h.connect('dealer', 'user:dealer')
		const annCard = createShapeId('ann-card')
		dealer.ed().run(() => {
			box(dealer, annCard)
			dealer.store.put([
				createRelation(annCard, 'restricted', '*') as any,
				createRelation(annCard, 'viewer', 'user:ann') as any,
			])
		})
		await h.flush()
		const ann = await h.connect('ann', 'user:ann')
		const ben = await h.connect('ben', 'user:ben')
		expect(ann.has(annCard)).toBe(true)
		expect(ben.has(annCard)).toBe(false)

		await putRelation(dealer, annCard, 'viewer', '*') // turn it over
		expect(ben.has(annCard)).toBe(true)
	})
})

describe('transactions', () => {
	it('a push with one denied write is discarded whole, so no half operation lands', async () => {
		h = new RelationsHarness([
			{ object: ROOT, relation: 'owner', subject: 'user:teacher' },
			{ object: ROOT, relation: 'contributor', subject: 'user:ben' },
		])
		const teacher = await h.connect('teacher', 'user:teacher')
		const ben = await h.connect('ben', 'user:ben')
		const t = createShapeId('teacher-box')
		box(teacher, t)
		await h.flush()
		// one operation: add a shape (allowed) and move the teacher's shape (denied)
		ben.forge(() =>
			ben.ed().run(() => {
				box(ben, createShapeId('ben-box'))
				rawPut(ben, t, { x: 300 })
			})
		)
		await h.flush()
		expect(teacher.shapeIds()).toEqual([t])
		expect(ben.shapeIds()).toEqual([t])
		expect(xOf(ben, t)).toBe(0)
	})
})
