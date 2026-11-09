import {
	RecordOpType,
	TLSocketRoom,
	TLSyncAuthorizer,
	TLSyncTransform,
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
import { SessionMeta, authorizeFileRecord, transformFileRecord } from './authorizeFileRecord'

const pageId = 'page:test' as TLPageId
const readers = { before: () => undefined, after: () => undefined }

function session(userId: string | null, document: 'read' | 'write' = 'write') {
	return {
		sessionId: 's1',
		meta: { storeId: 'store', userId } satisfies SessionMeta,
		access: { document, objects: userId ? ('write' as const) : ('read' as const) },
	}
}

type Change = Parameters<typeof authorizeFileRecord>[0]['changes'][number]
type Session = ReturnType<typeof session>
// The room fills the readers from the push; tests judge one change at a time. null = allowed.
const authorize = ({ session, ...change }: { session: Session } & Change) =>
	authorizeFileRecord({ session, changes: [change], ...readers })
const stamp = (session: Session, record: Change['prev'] | Change['next']) =>
	transformFileRecord({ session, record: record!, before: readers.before })

describe('authorizeFileRecord', () => {
	describe('comment rule wiring', () => {
		const thread = createCommentThread({
			pageId,
			anchor: { type: 'page' },
			createdBy: 'real-bob',
		})
		const comment = (authorId: string) =>
			createComment({ threadId: thread.id, pageId, authorId, body: toRichText('hi') })

		it('stamps authorId from the session user id', () => {
			const result = stamp(session('real-bob'), comment('client-claims-alice')) as TLComment
			expect(result.authorId).toBe('real-bob')
		})

		it('vetoes thread hard-deletes (deletion is soft)', () => {
			expect(
				authorize({ session: session('real-bob'), type: 'delete', prev: thread, next: null })
			).not.toBeNull()
		})

		it('vetoes a comment create from a canvas read-only session', () => {
			expect(
				authorize({
					session: session('real-bob', 'read'),
					type: 'create',
					prev: null,
					next: comment('real-bob'),
				})
			).not.toBeNull()
		})

		it("lets a non-author move a shape that carries someone else's thread", () => {
			const otherPage = 'page:other' as TLPageId
			const shapeThread = {
				...thread,
				anchor: {
					type: 'shape',
					shapeId: createShapeId('s'),
					normalizedAnchor: { x: 0.5, y: 0.5 },
				},
			} as unknown as typeof thread
			const moved = { ...shapeThread, pageId: otherPage }
			const bobs = comment('real-bob')
			expect(
				authorizeFileRecord({
					session: session('alice'),
					changes: [
						{ type: 'update', prev: shapeThread, next: moved },
						{ type: 'update', prev: bobs, next: { ...bobs, pageId: otherPage } },
					],
					before: () => undefined,
					after: (id) => (id === moved.id ? moved : undefined),
				})
			).toBeNull()
		})

		it('lets an anonymous editor delete a shape that carries a thread', () => {
			const shapeThread = {
				...thread,
				anchor: {
					type: 'shape',
					shapeId: createShapeId('s'),
					normalizedAnchor: { x: 0.5, y: 0.5 },
				},
			} as unknown as typeof thread
			expect(
				authorize({
					session: session(null),
					type: 'update',
					prev: shapeThread,
					next: {
						...shapeThread,
						anchor: { type: 'point', x: 1, y: 2 },
					} as unknown as typeof thread,
				})
			).toBeNull()
		})

		it('vetoes every comment write from an anonymous session, including reopening a thread', () => {
			const resolved = { ...thread, resolved: { at: 1, by: 'real-bob' } }
			expect(
				authorize({ session: session(null), type: 'create', prev: null, next: comment('x') })
			).not.toBeNull()
			expect(
				authorize({ session: session(null), type: 'update', prev: resolved, next: thread })
			).not.toBeNull()
		})
	})

	describe('canvas access', () => {
		const page = PageRecordType.create({ id: pageId, name: 'Page', index: 'a1' as any })

		it('refuses any non-comment write from a session without edit access', () => {
			expect(
				authorize({ session: session('real-bob', 'read'), type: 'create', prev: null, next: page })
			).not.toBeNull()
			expect(
				authorize({ session: session('real-bob', 'read'), type: 'delete', prev: page, next: null })
			).not.toBeNull()
		})

		it('passes non-shape records through for a session with edit access', () => {
			expect(
				authorize({ session: session(null), type: 'create', prev: null, next: page })
			).toBeNull()
			expect(stamp(session(null), page)).toBe(page)
		})
	})

	describe('shape', () => {
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
			expect(stamp(session('real-bob'), next)).toEqual({
				...next,
				props: { ...next.props, textLastEditedBy: 'real-bob' },
			})
			expect(next.props.textLastEditedBy).toBe('real-alice')
		})

		it('leaves a create attributed to the session user alone', () => {
			const next = makeNote('real-bob')
			expect(stamp(session('real-bob'), next)).toBe(next)
			expect(
				authorize({ session: session('real-bob'), type: 'create', prev: null, next })
			).toBeNull()
		})

		it('leaves a create with no attribution alone (empty or anonymous note)', () => {
			const next = makeNote(null)
			expect(stamp(session('real-bob'), next)).toBe(next)
			expect(stamp(session(null), next)).toBe(next)
			expect(authorize({ session: session(null), type: 'create', prev: null, next })).toBeNull()
		})

		it('clears foreign attribution when an anonymous session creates a note', () => {
			const next = makeNote('real-alice')
			expect(stamp(session(null), next)).toEqual({
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
				transform: transformFileRecord as TLSyncTransform<TLRecord, SessionMeta>,
				authorize: authorizeFileRecord as TLSyncAuthorizer<TLRecord, SessionMeta>,
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
					meta: { userId: 'real-bob', storeId: 'store' },
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
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBeNull()
			expect(authorize({ session: session(null), type: 'update', prev, next })).toBeNull()
		})

		it('allows changing attribution to the session user', () => {
			const prev = makeNote('real-alice')
			const next = { ...prev, props: { ...prev.props, textLastEditedBy: 'real-bob' } }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBeNull()
		})

		it('allows clearing attribution to null (text emptied, or anonymous edit)', () => {
			const prev = makeNote('real-alice')
			const next = { ...prev, props: { ...prev.props, textLastEditedBy: null } }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).toBeNull()
			expect(authorize({ session: session(null), type: 'update', prev, next })).toBeNull()
		})

		it('vetoes changing attribution to someone else', () => {
			const prev = makeNote('real-bob')
			const next = { ...prev, props: { ...prev.props, textLastEditedBy: 'real-alice' } }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).not.toBeNull()
		})

		it('vetoes an anonymous session setting any non-null attribution', () => {
			const prev = makeNote(null)
			const next = { ...prev, props: { ...prev.props, textLastEditedBy: 'real-alice' } }
			expect(authorize({ session: session(null), type: 'update', prev, next })).not.toBeNull()
		})

		it('vetoes smuggling attribution in via a shape-type change', () => {
			const prev = makeGeo()
			const next = { ...makeNote('real-alice'), id: prev.id }
			expect(authorize({ session: session('real-bob'), type: 'update', prev, next })).not.toBeNull()
		})

		it('ignores non-note shapes', () => {
			const prev = makeGeo()
			const next = { ...prev, x: 50 }
			expect(authorize({ session: session(null), type: 'update', prev, next })).toBeNull()
			expect(stamp(session(null), prev)).toBe(prev)
		})

		it('allows deletes', () => {
			const prev = makeNote('real-alice')
			expect(
				authorize({ session: session('real-bob'), type: 'delete', prev, next: null })
			).toBeNull()
		})

		it('refuses a note update from a canvas read-only session (the rule, not a gate, decides now)', () => {
			const prev = makeNote('real-alice')
			const next = { ...prev, x: 100 }
			expect(
				authorize({ session: session('real-bob', 'read'), type: 'update', prev, next })
			).not.toBeNull()
		})
	})
})
