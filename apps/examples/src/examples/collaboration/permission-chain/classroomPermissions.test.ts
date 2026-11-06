import {
	createComment,
	createCommentThread,
	createShapeId,
	PageRecordType,
	RecordAccess,
	TLComment,
	TLPageId,
	TLRecord,
	TLShape,
	toRichText,
} from 'tldraw'
import { describe, expect, it } from 'vitest'
import { ClassroomMeta, classroomActor, classroomPermissions } from './classroomPermissions'

// The demo's comment layers: the real `createCommentAuthorizers` rules, in the demo's chain.

const chain = classroomPermissions()
const makePage = (name: string, meta = {}) =>
	PageRecordType.create({ id: PageRecordType.createId(name), name, index: 'a1' as any, meta })
const p1 = makePage('p1')
const p2 = makePage('p2')
const answers = makePage('answers', { private: true })
const lockedPage = makePage('locked', { locked: true })

// Alice's box on p1, with her thread on it. Bob replied in it.
const box = {
	id: createShapeId('box'),
	typeName: 'shape',
	type: 'geo',
	parentId: p1.id,
	index: 'a1',
	x: 0,
	y: 0,
	rotation: 0,
	isLocked: false,
	opacity: 1,
	props: {},
	meta: { ownerId: 'alice' },
} as unknown as TLShape
const thread = createCommentThread({
	pageId: p1.id,
	anchor: { type: 'shape', shapeId: box.id, x: 0, y: 0, isPrecise: false },
	createdBy: 'alice',
})
const comment = (authorId: string) =>
	createComment({ threadId: thread.id, pageId: p1.id, authorId, body: toRichText('hi') })
const fromAlice = comment('alice')
const fromBob = comment('bob')
const stored = new Map<string, TLRecord>(
	[p1, p2, answers, lockedPage, box, thread, fromAlice, fromBob].map((r) => [r.id, r])
)

const alice: ClassroomMeta = { userId: 'alice', role: 'student' }
const bob: ClassroomMeta = { userId: 'bob', role: 'student' }
const teacher: ClassroomMeta = { userId: 'teacher', role: 'teacher' }
const update = (prev: TLRecord, change: object) =>
	({ type: 'update', prev, next: { ...prev, ...change } }) as RecordAccess<TLRecord>
function write(meta: ClassroomMeta, ...items: RecordAccess<TLRecord>[]) {
	return chain.run({
		kind: 'write',
		actor: classroomActor(meta),
		items,
		get: (id) => stored.get(id),
	})
}
const reasons = (meta: ClassroomMeta, ...items: RecordAccess<TLRecord>[]) => [
	...new Set(write(meta, ...items).denied.map((d) => d.reason)),
]
/** What the editor writes when the box moves to another page: its thread and comments follow. */
const moveBox = (pageId: TLPageId) => [
	update(box, { parentId: pageId }),
	update(thread, { pageId }),
	update(fromAlice, { pageId }),
	update(fromBob, { pageId }),
]

describe('comments in the demo chain', () => {
	it('a new comment is posted as the session user', () => {
		const next = { ...fromAlice, id: 'comment:new' as TLComment['id'] }
		const result = write(bob, { type: 'create', prev: null, next })
		expect(
			result.allowed.map((a) => (a.type === 'create' ? (a.next as TLComment).authorId : null))
		).toEqual(['bob'])
	})

	it('a student edits only their own comment; a teacher deletes any, and edits none', () => {
		const edit = update(fromAlice, { body: toRichText('changed') })
		const del = update(fromAlice, { isDeleted: true })
		expect([
			reasons(alice, edit),
			reasons(bob, edit),
			reasons(teacher, edit),
			reasons(teacher, del),
		]).toEqual([[], ['comment rule'], ['comment rule'], []])
	})

	it("comments follow their shape to another page, also someone else's comments", () => {
		expect([reasons(alice, ...moveBox(p2.id)), reasons(teacher, ...moveBox(p2.id))]).toEqual([
			[],
			[],
		])
		// without the shape and its thread, the same change is an edit of someone else's comment
		expect(reasons(alice, update(fromBob, { pageId: p2.id }))).toEqual(['comment rule'])
	})

	it("a student cannot move someone else's thread to a page of their choice", () => {
		expect(reasons(bob, update(thread, { pageId: lockedPage.id }))).toEqual(['not your thread'])
		expect(reasons(bob, update(thread, { anchor: { type: 'point', x: 0, y: 0 } }))).toEqual([
			'not your thread',
		])
	})

	it('comments that follow their shape are still checked by the page rules', () => {
		expect(reasons(alice, ...moveBox(answers.id))).toEqual(['private page'])
	})
})
