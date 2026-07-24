import {
	TLComment,
	TLNoteShape,
	TLPageId,
	TLShape,
	createComment,
	createCommentThread,
	createShapeId,
	toRichText,
} from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import { SessionMeta, authorizeFileRecord } from './authorizeFileRecord'

const pageId = 'page:test' as TLPageId

function session(userId: string | null): { sessionId: string; meta: SessionMeta } {
	return { sessionId: 's1', meta: { storeId: 'store', userId } }
}

describe('authorizeFileRecord', () => {
	// The comment/thread policy itself is tested in @tldraw/commenting-core; these two only
	// verify the factory is wired in with getUserId mapped to session.meta.userId.
	describe('comment authorizer wiring', () => {
		const thread = createCommentThread({
			pageId,
			anchor: { type: 'page' },
			createdBy: 'real-bob',
		})

		it('stamps authorId from the session user id', () => {
			const next = createComment({
				threadId: thread.id,
				pageId,
				authorId: 'client-claims-alice',
				body: toRichText('hi'),
			})
			const result = authorizeFileRecord.comment!({
				session: session('real-bob'),
				type: 'create',
				prev: null,
				next,
			}) as TLComment
			expect(result.authorId).toBe('real-bob')
		})

		it('vetoes thread hard-deletes (deletion is soft)', () => {
			expect(
				authorizeFileRecord['comment-thread']!({
					session: session('real-bob'),
					type: 'delete',
					prev: thread,
					next: null,
				})
			).toBeNull()
		})
	})

	describe('shape', () => {
		const authorize = authorizeFileRecord.shape!

		function makeNote(textLastEditedBy: string | null): TLNoteShape {
			return {
				id: createShapeId('note1'),
				typeName: 'shape',
				type: 'note',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as TLNoteShape['index'],
				parentId: 'page:test' as TLNoteShape['parentId'],
				isLocked: false,
				opacity: 1,
				meta: {},
				props: {
					color: 'black',
					richText: toRichText('hello'),
					size: 'm',
					font: 'draw',
					align: 'middle',
					verticalAlign: 'middle',
					labelColor: 'black',
					growY: 0,
					fontSizeAdjustment: 1,
					url: '',
					scale: 1,
					textLastEditedBy,
				},
			}
		}

		function makeGeo(): TLShape {
			const note = makeNote(null)
			const { textLastEditedBy: _, ...props } = note.props
			return { ...note, id: createShapeId('geo1'), type: 'geo', props } as unknown as TLShape
		}

		it('vetoes a create with foreign attribution (duplication now re-stamps the copy)', () => {
			const next = makeNote('real-alice')
			expect(
				authorize({ session: session('real-bob'), type: 'create', prev: null, next })
			).toBeNull()
		})

		it('allows a create attributed to the session user', () => {
			const next = makeNote('real-bob')
			expect(authorize({ session: session('real-bob'), type: 'create', prev: null, next })).toBe(
				next
			)
		})

		it('allows a create with no attribution (empty or anonymous note)', () => {
			const next = makeNote(null)
			expect(authorize({ session: session('real-bob'), type: 'create', prev: null, next })).toBe(
				next
			)
			expect(authorize({ session: session(null), type: 'create', prev: null, next })).toBe(next)
		})

		it('vetoes an anonymous session creating a note with any attribution', () => {
			const next = makeNote('real-alice')
			expect(authorize({ session: session(null), type: 'create', prev: null, next })).toBeNull()
		})

		it('allows updates that do not touch attribution, from any user', () => {
			const prev = makeNote('real-alice')
			const next = { ...prev, x: 100 }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBe(next)
			expect(authorize({ session: session(null), type: 'update', prev, next })).toBe(next)
		})

		it('allows changing attribution to the session user', () => {
			const prev = makeNote('real-alice')
			const next = { ...prev, props: { ...prev.props, textLastEditedBy: 'real-bob' } }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBe(next)
		})

		it('allows clearing attribution to null (text emptied, or anonymous edit)', () => {
			const prev = makeNote('real-alice')
			const next = { ...prev, props: { ...prev.props, textLastEditedBy: null } }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBe(next)
			expect(authorize({ session: session(null), type: 'update', prev, next })).toBe(next)
		})

		it('vetoes changing attribution to someone else', () => {
			const prev = makeNote('real-bob')
			const next = { ...prev, props: { ...prev.props, textLastEditedBy: 'real-alice' } }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBeNull()
		})

		it('vetoes an anonymous session setting any non-null attribution', () => {
			const prev = makeNote(null)
			const next = { ...prev, props: { ...prev.props, textLastEditedBy: 'real-alice' } }
			expect(authorize({ session: session(null), type: 'update', prev, next })).toBeNull()
		})

		it('vetoes smuggling attribution in via a shape-type change', () => {
			const prev = makeGeo()
			const next = { ...makeNote('real-alice'), id: prev.id }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBeNull()
		})

		it('ignores non-note shapes', () => {
			const prev = makeGeo()
			const next = { ...prev, x: 50 }
			expect(authorize({ session: session(null), type: 'update', prev, next })).toBe(next)
			// creates of non-note shapes carry no attribution to enforce, so they pass through
			expect(authorize({ session: session(null), type: 'create', prev: null, next: prev })).toBe(
				prev
			)
		})

		it('allows deletes', () => {
			const prev = makeNote('real-alice')
			expect(authorize({ session: session('real-bob'), type: 'delete', prev, next: null })).toBe(
				prev
			)
		})
	})
})
