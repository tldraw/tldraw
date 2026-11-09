import { SessionMeta, authorizeFileRecord, getObjectAccess } from '@tldraw/dotcom-shared'
import { runAuthorize } from '@tldraw/store'
import {
	RecordOpType,
	TLSocketRoom,
	WebSocketMinimal,
	getTlsyncProtocolVersion,
} from '@tldraw/sync-core'
import {
	DocumentRecordType,
	PageRecordType,
	TLDOCUMENT_ID,
	TLComment,
	TLNoteShape,
	TLPageId,
	TLRecord,
	TLShape,
	createComment,
	createCommentThread,
	createShapeId,
	createTLSchema,
	toRichText,
} from '@tldraw/tlschema'
import { describe, expect, it, vi } from 'vitest'
import { asAuthorizerMap } from './authorizeFileRecord.testing'

const fileAuth = asAuthorizerMap(authorizeFileRecord)

const pageId = 'page:test' as TLPageId

function session(
	userId: string | null,
	isReadonly = false
): {
	sessionId: string
	isReadonly: boolean
	meta: SessionMeta
} {
	return { sessionId: 's1', isReadonly, meta: { storeId: 'store', userId, isReadonly } }
}

describe('authorizeFileRecord', () => {
	// The comment/thread policy itself is tested in @tldraw/sync-collaboration; these two only
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
			const result = fileAuth.comment({
				session: session('real-bob'),
				type: 'create',
				prev: null,
				next,
			}) as TLComment
			expect(result.authorId).toBe('real-bob')
		})

		it('vetoes thread hard-deletes (deletion is soft)', () => {
			expect(
				fileAuth['comment-thread']({
					session: session('real-bob'),
					type: 'delete',
					prev: thread,
					next: null,
				})
			).toBeNull()
		})

		// The file rules deny `comments:write` to view-only sessions, and the object lane follows
		// them, so view-only sessions still read comments but cannot write them. The editor asks the
		// same rule to hide the composer.
		it('gives the object lane write access only to signed-in, non-readonly sessions', () => {
			expect(getObjectAccess({ storeId: 'store', userId: 'real-bob', isReadonly: false })).toBe(
				'write'
			)
			expect(getObjectAccess({ storeId: 'store', userId: 'real-bob', isReadonly: true })).toBe(
				'read'
			)
			expect(getObjectAccess({ storeId: 'store', userId: null, isReadonly: false })).toBe('read')
		})

		it('answers comments:write the same way for the editor', () => {
			const ask = (meta: SessionMeta) =>
				runAuthorize(
					authorizeFileRecord,
					{ action: 'comments:write' },
					{ actor: meta, get: () => undefined }
				).allowed
			expect(ask(session('real-bob').meta)).toBe(true)
			expect(ask(session('real-bob', true).meta)).toBe(false)
			expect(ask(session(null).meta)).toBe(false)
		})
	})

	describe('shape', () => {
		const authorize = fileAuth.shape

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

		it('re-stamps a create with foreign attribution instead of dropping imported notes', () => {
			const next = makeNote('real-alice')
			expect(authorize({ session: session('real-bob'), type: 'create', prev: null, next })).toEqual(
				{ ...next, props: { ...next.props, textLastEditedBy: 'real-bob' } }
			)
			expect(next.props.textLastEditedBy).toBe('real-alice')
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

		it('clears foreign attribution when an anonymous session creates a note', () => {
			const next = makeNote('real-alice')
			expect(authorize({ session: session(null), type: 'create', prev: null, next })).toEqual({
				...next,
				props: { ...next.props, textLastEditedBy: null },
			})
		})

		it('keeps local notes when a signed-in session pushes a slurped snapshot', () => {
			const schema = createTLSchema()
			const document = DocumentRecordType.create({
				id: TLDOCUMENT_ID,
				meta: { slurpFinished: true },
			})
			const page = PageRecordType.create({
				id: pageId,
				name: 'Page',
				index: 'a1' as TLNoteShape['index'],
			})
			const note = makeNote('browser-generated-user-id')
			const room = new TLSocketRoom<TLRecord, SessionMeta>({
				schema,
				authorize: authorizeFileRecord,
			})
			const socket: WebSocketMinimal = {
				send: vi.fn(),
				close: vi.fn(),
				readyState: 1,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			}
			try {
				room.handleSocketConnect({
					sessionId: 's1',
					socket,
					meta: { userId: 'real-bob', storeId: 'store', isReadonly: false },
				})
				room.handleSocketMessage(
					's1',
					JSON.stringify({
						type: 'connect',
						connectRequestId: 'connect',
						lastServerClock: 0,
						protocolVersion: getTlsyncProtocolVersion(),
						schema: schema.serialize(),
					})
				)
				room.handleSocketMessage(
					's1',
					JSON.stringify({
						type: 'push',
						clientClock: 0,
						diff: Object.fromEntries(
							[document, page, note].map((r) => [r.id, [RecordOpType.Put, r]])
						),
					})
				)
				const [storedDocument, storedNote] = room.storage.transaction((txn) => [
					txn.get(document.id),
					txn.get(note.id),
				]).result
				expect(storedDocument).toEqual(document)
				expect(storedNote).toEqual({
					...note,
					props: { ...note.props, textLastEditedBy: 'real-bob' },
				})
			} finally {
				room.close()
			}
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

		it('allows a legal note update from a canvas read-only session (gated at the protocol level, not here)', () => {
			const prev = makeNote('real-alice')
			const next = { ...prev, x: 100 }
			expect(authorize({ session: session('real-bob', true), type: 'update', prev, next })).toBe(
				next
			)
		})
	})
})
