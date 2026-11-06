import {
	createComment,
	createCommentThread,
	PageRecordType,
	RecordAccess,
	TLComment,
	TLPage,
	TLRecord,
	toRichText,
} from 'tldraw'
import { describe, expect, it } from 'vitest'
import { ClassroomMeta, classroomActor, classroomPermissions } from './classroomPermissions'

// The demo's comment layer: the real `createCommentAuthorizers` rules, in the demo's chain.

const chain = classroomPermissions()
const page = PageRecordType.create({
	id: PageRecordType.createId('p1'),
	name: 'p1',
	index: 'a1' as any,
})
const answers: TLPage = PageRecordType.create({
	id: PageRecordType.createId('answers'),
	name: 'Answers',
	index: 'a2' as any,
	meta: { private: true },
})
const thread = createCommentThread({
	pageId: page.id,
	anchor: { type: 'page' },
	createdBy: 'alice',
})
const comment = createComment({
	threadId: thread.id,
	pageId: page.id,
	authorId: 'alice',
	body: toRichText('hi'),
})
const stored = new Map<string, TLRecord>([page, answers, thread, comment].map((r) => [r.id, r]))

function write(meta: ClassroomMeta, ...items: RecordAccess<TLRecord>[]) {
	return chain.run({
		kind: 'write',
		actor: classroomActor(meta),
		items,
		get: (id) => stored.get(id),
	})
}
const reasons = (meta: ClassroomMeta, ...items: RecordAccess<TLRecord>[]) =>
	write(meta, ...items).denied.map((d) => d.reason)
const alice: ClassroomMeta = { userId: 'alice', role: 'student' }
const bob: ClassroomMeta = { userId: 'bob', role: 'student' }
const teacher: ClassroomMeta = { userId: 'teacher', role: 'teacher' }
const update = (prev: TLRecord, change: object) =>
	({ type: 'update', prev, next: { ...prev, ...change } }) as RecordAccess<TLRecord>

describe('comments in the demo chain', () => {
	it('a new comment is posted as the session user', () => {
		const result = write(bob, {
			type: 'create',
			prev: null,
			next: { ...comment, id: 'comment:new' as TLComment['id'] },
		})
		expect(
			result.allowed.map((a) => (a.type === 'create' ? (a.next as TLComment).authorId : null))
		).toEqual(['bob'])
	})

	it('a student edits only their own comment; a teacher deletes any, and edits none', () => {
		const edit = update(comment, { body: toRichText('changed') })
		const del = update(comment, { isDeleted: true })
		expect([
			reasons(alice, edit),
			reasons(bob, edit),
			reasons(teacher, edit),
			reasons(teacher, del),
		]).toEqual([[], ['comment rule'], ['comment rule'], []])
	})

	it('a comment that follows its thread to another page is not an edit', () => {
		const p3 = PageRecordType.createId('p3')
		const moved = [update(thread, { pageId: p3 }), update(comment, { pageId: p3 })]
		stored.set(p3, PageRecordType.create({ id: p3, name: 'p3', index: 'a3' as any }))
		expect(reasons(teacher, ...moved)).toEqual([])
		// without its thread, the same change is an edit of alice's comment
		expect(reasons(teacher, update(comment, { pageId: p3 }))[0]).toBeDefined()
	})

	it('a comment that follows its thread is still checked by the page rules', () => {
		const moved = [update(thread, { pageId: answers.id }), update(comment, { pageId: answers.id })]
		expect(reasons(alice, ...moved)).toEqual(['private page', 'private page'])
	})
})
