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

		it('lets a non-creator resolve the thread as themselves', () => {
			const prev = makeThread('real-bob')
			const next = { ...prev, resolved: { at: 1, by: 'real-mallory' } }
			expect(authorize({ session: session('real-mallory'), type: 'update', prev, next })).toBe(next)
		})

		it('lets a non-creator reopen a resolved thread', () => {
			const prev = { ...makeThread('real-bob'), resolved: { at: 1, by: 'real-alice' } }
			const next = { ...prev, resolved: null }
			expect(authorize({ session: session('real-mallory'), type: 'update', prev, next })).toBe(next)
		})

		it('vetoes a resolution attributed to someone else', () => {
			const prev = makeThread('real-bob')
			const next = { ...prev, resolved: { at: 1, by: 'real-alice' } }
			expect(authorize({ session: session('real-mallory'), type: 'update', prev, next })).toBeNull()
		})

		it('allows an update that leaves an existing resolution untouched', () => {
			const prev = { ...makeThread('real-bob'), resolved: { at: 1, by: 'real-alice' } }
			// new object reference, same value — must not be treated as a change
			const next = { ...prev, resolved: { ...prev.resolved } }
			expect(authorize({ session: session('real-mallory'), type: 'update', prev, next })).toBe(next)
		})

		it('vetoes a create with a resolution attributed to someone else', () => {
			const next = { ...makeThread('real-mallory'), resolved: { at: 1, by: 'real-alice' } }
			expect(
				authorize({ session: session('real-mallory'), type: 'create', prev: null, next })
			).toBeNull()
		})

		it('allows a create resolved by the creator themselves', () => {
			const next = { ...makeThread('real-bob'), resolved: { at: 1, by: 'real-bob' } }
			const result = authorize({
				session: session('real-bob'),
				type: 'create',
				prev: null,
				next,
			}) as TLCommentThread
			expect(result.resolved).toEqual({ at: 1, by: 'real-bob' })
		})
	})
})
