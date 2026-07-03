import {
	TLComment,
	TLCommentThread,
	TLPageId,
	createComment,
	createCommentThread,
	toRichText,
} from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { SessionMeta, authorizeFileRecord } from './authorizeFileRecord'

const pageId = 'page:test' as TLPageId
const thread = createCommentThread({
	pageId,
	anchor: { type: 'page' },
	createdBy: 'client-claims-alice',
})

function session(userId: string | null): { sessionId: string; meta: SessionMeta } {
	return { sessionId: 's1', meta: { storeId: 'store', userId } }
}

describe('authorizeFileRecord', () => {
	describe('comment', () => {
		const authorize = authorizeFileRecord.comment!
		const comment = (authorId: string) =>
			createComment({ threadId: thread.id, pageId, authorId, body: toRichText('hi') })

		it('stamps authorId from the session on create, overriding the client value', () => {
			const result = authorize({
				session: session('real-bob'),
				type: 'create',
				prev: null,
				next: comment('client-claims-alice'),
			}) as TLComment
			expect(result.authorId).toBe('real-bob')
		})

		it('rejects a create with no authenticated user', () => {
			expect(
				authorize({ session: session(null), type: 'create', prev: null, next: comment('anon') })
			).toBeNull()
		})

		it('allows the author to edit their own comment', () => {
			const prev = comment('real-bob')
			const next = { ...prev, body: toRichText('edited') }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBe(next)
		})

		it('vetoes an edit from someone who is not the author', () => {
			const prev = comment('real-bob')
			const next = { ...prev, body: toRichText('sneakily rewritten') }
			expect(authorize({ session: session('real-mallory'), type: 'update', prev, next })).toBeNull()
		})

		it('vetoes an update that changes the author', () => {
			const prev = comment('real-bob')
			const next = { ...prev, authorId: 'someone-else' }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBeNull()
		})

		it('allows deletes', () => {
			const prev = comment('real-bob')
			expect(authorize({ session: session('real-bob'), type: 'delete', prev, next: null })).toBe(
				prev
			)
		})
	})

	describe('comment-thread', () => {
		const authorize = authorizeFileRecord['comment-thread']!
		const makeThread = (createdBy: string) =>
			createCommentThread({ pageId, anchor: { type: 'page' }, createdBy })

		it('stamps createdBy from the session on create, overriding the client value', () => {
			const result = authorize({
				session: session('real-bob'),
				type: 'create',
				prev: null,
				next: makeThread('client-claims-alice'),
			}) as TLCommentThread
			expect(result.createdBy).toBe('real-bob')
		})

		it('vetoes an update that changes the creator', () => {
			const prev = makeThread('real-bob')
			const next = { ...prev, createdBy: 'someone-else' }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBeNull()
		})

		it('lets a non-creator update the thread (e.g. resolve it)', () => {
			const prev = makeThread('real-bob')
			const next = { ...prev, resolvedBy: 'real-mallory', resolvedAt: 1 }
			expect(authorize({ session: session('real-mallory'), type: 'update', prev, next })).toBe(next)
		})
	})
})
