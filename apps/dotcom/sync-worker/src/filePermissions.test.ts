import { filePermissions } from '@tldraw/dotcom-shared'
import {
	RecordOpType,
	TLSocketRoom,
	WebSocketMinimal,
	getTlsyncProtocolVersion,
} from '@tldraw/sync-core'
import {
	DocumentRecordType,
	PageRecordType,
	TLAccess,
	TLDOCUMENT_ID,
	TLNoteShape,
	TLPageId,
	TLRecord,
	TLShape,
	createComment,
	createCommentThread,
	createShapeId,
	createTLSchema,
	createTransaction,
	toRichText,
} from '@tldraw/tlschema'
import { describe, expect, it, vi } from 'vitest'

const pageId = 'page:test' as TLPageId

function session(userId: string | null, isReadonly = false): TLAccess {
	return { userId, abilities: isReadonly ? [] : userId ? ['edit', 'comment'] : ['edit'] }
}

interface Write {
	session: TLAccess
	type: 'create' | 'update' | 'delete'
	prev: TLRecord | null
	next: TLRecord | null
}

/** Check one write against the file rules, as the room checks a push of it. */
function allowed({ session, type, prev, next }: Write) {
	const id = (next ?? prev)!.id
	return filePermissions.check(
		createTransaction<TLRecord>({
			access: session,
			intent: null,
			diff: {
				added: type === 'create' ? { [id]: next } : {},
				updated: type === 'update' ? { [id]: [prev, next] } : {},
				removed: type === 'delete' ? { [id]: prev } : {},
			} as any,
			after: { get: () => undefined, all: () => [] },
		})
	).ok
}

function stamp(record: TLRecord, access: TLAccess) {
	return filePermissions.stamps.reduce((r, s) => s(r, access), record)
}

describe('filePermissions', () => {
	// The comment/thread policy itself is tested in @tldraw/sync-collaboration; these only verify
	// the comment rules and stamps are wired in.
	describe('comment wiring', () => {
		const thread = createCommentThread({
			pageId,
			anchor: { type: 'page' },
			createdBy: 'real-bob',
		})
		const comment = (authorId: string) =>
			createComment({ threadId: thread.id, pageId, authorId, body: toRichText('hi') }) as any

		it('stamps authorId from the session user id', () => {
			expect(stamp(comment('client-claims-alice'), session('real-bob'))).toMatchObject({
				authorId: 'real-bob',
			})
		})

		it('denies a comment attributed to someone else', () => {
			const next = comment('client-claims-alice')
			expect(allowed({ session: session('real-bob'), type: 'create', prev: null, next })).toBe(
				false
			)
			expect(
				allowed({
					session: session('real-bob'),
					type: 'create',
					prev: null,
					next: comment('real-bob'),
				})
			).toBe(true)
		})

		it('denies thread hard-deletes (deletion is soft)', () => {
			expect(
				allowed({ session: session('real-bob'), type: 'delete', prev: thread as any, next: null })
			).toBe(false)
		})

		it('denies a comment create from a canvas read-only session', () => {
			const next = comment('real-bob')
			expect(
				allowed({ session: session('real-bob', true), type: 'create', prev: null, next })
			).toBe(false)
		})

		it('denies a comment create from an anonymous session', () => {
			const next = comment('real-bob')
			expect(allowed({ session: session(null), type: 'create', prev: null, next })).toBe(false)
		})
	})

	describe('note attribution', () => {
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

		it('denies a create with foreign attribution', () => {
			const next = makeNote('real-alice')
			expect(allowed({ session: session('real-bob'), type: 'create', prev: null, next })).toBe(
				false
			)
			expect(allowed({ session: session(null), type: 'create', prev: null, next })).toBe(false)
		})

		it('stamps foreign attribution on create to the session user, or to nobody signed out', () => {
			const next = makeNote('real-alice')
			expect(stamp(next, session('real-bob'))).toEqual({
				...next,
				props: { ...next.props, textLastEditedBy: 'real-bob' },
			})
			expect(stamp(next, session(null))).toEqual({
				...next,
				props: { ...next.props, textLastEditedBy: null },
			})
			expect(next.props.textLastEditedBy).toBe('real-alice')
		})

		it('leaves own, empty, and non-note records unstamped', () => {
			const own = makeNote('real-bob')
			const empty = makeNote(null)
			const geo = makeGeo()
			expect(stamp(own, session('real-bob'))).toBe(own)
			expect(stamp(empty, session('real-bob'))).toBe(empty)
			expect(stamp(geo, session('real-bob'))).toBe(geo)
		})

		it('allows a create attributed to the session user', () => {
			const next = makeNote('real-bob')
			expect(allowed({ session: session('real-bob'), type: 'create', prev: null, next })).toBe(true)
		})

		it('allows a create with no attribution (empty or anonymous note)', () => {
			const next = makeNote(null)
			expect(allowed({ session: session('real-bob'), type: 'create', prev: null, next })).toBe(true)
			expect(allowed({ session: session(null), type: 'create', prev: null, next })).toBe(true)
		})

		it('keeps local notes when a signed-in client stamps a slurped snapshot', () => {
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
			const access = session('real-bob')
			const note = makeNote('browser-generated-user-id')
			const room = new TLSocketRoom<TLRecord, { userId: string }>({
				schema,
				permissions: filePermissions,
			})
			const socket: WebSocketMinimal = {
				send: vi.fn(),
				close: vi.fn(),
				readyState: 1,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			}
			// `deniedCount` acknowledges the first denial, so the retry isn't denied as dependent on it
			const push = (clientClock: number, records: TLRecord[]) =>
				room.handleSocketMessage(
					's1',
					JSON.stringify({
						type: 'push',
						clientClock,
						deniedCount: clientClock,
						diff: Object.fromEntries(records.map((r) => [r.id, [RecordOpType.Put, r]])),
					})
				)
			const stored = () =>
				room.storage.transaction((txn) => [txn.get(document.id), txn.get(note.id)]).result
			try {
				room.handleSocketConnect({ sessionId: 's1', socket, meta: { userId: 'real-bob' }, access })
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
				// unstamped, the whole push is denied: the document's slurp marker doesn't land either
				push(0, [document, page, note])
				expect(stored()).toEqual([{ ...document, meta: {} }, undefined])

				push(1, [document, page, stamp(note, access)])
				expect(stored()).toEqual([
					document,
					{ ...note, props: { ...note.props, textLastEditedBy: 'real-bob' } },
				])
			} finally {
				room.close()
			}
		})

		it('allows updates that do not touch attribution, from any user', () => {
			const prev = makeNote('real-alice')
			const next = { ...prev, x: 100 }
			expect(allowed({ session: session('real-bob'), type: 'update', prev, next })).toBe(true)
			expect(allowed({ session: session(null), type: 'update', prev, next })).toBe(true)
		})

		it('allows changing attribution to the session user', () => {
			const prev = makeNote('real-alice')
			const next = { ...prev, props: { ...prev.props, textLastEditedBy: 'real-bob' } }
			expect(allowed({ session: session('real-bob'), type: 'update', prev, next })).toBe(true)
		})

		it('allows clearing attribution to null (text emptied, or anonymous edit)', () => {
			const prev = makeNote('real-alice')
			const next = { ...prev, props: { ...prev.props, textLastEditedBy: null } }
			expect(allowed({ session: session('real-bob'), type: 'update', prev, next })).toBe(true)
			expect(allowed({ session: session(null), type: 'update', prev, next })).toBe(true)
		})

		it('denies changing attribution to someone else', () => {
			const prev = makeNote('real-bob')
			const next = { ...prev, props: { ...prev.props, textLastEditedBy: 'real-alice' } }
			expect(allowed({ session: session('real-bob'), type: 'update', prev, next })).toBe(false)
		})

		it('denies an anonymous session setting any non-null attribution', () => {
			const prev = makeNote(null)
			const next = { ...prev, props: { ...prev.props, textLastEditedBy: 'real-alice' } }
			expect(allowed({ session: session(null), type: 'update', prev, next })).toBe(false)
		})

		it('denies smuggling attribution in via a shape-type change', () => {
			const prev = makeGeo()
			const next = { ...makeNote('real-alice'), id: prev.id }
			expect(allowed({ session: session('real-bob'), type: 'update', prev, next })).toBe(false)
		})

		it('ignores non-note shapes', () => {
			const prev = makeGeo()
			const next = { ...prev, x: 50 }
			expect(allowed({ session: session(null), type: 'update', prev, next })).toBe(true)
			expect(allowed({ session: session(null), type: 'create', prev: null, next: prev })).toBe(true)
		})

		it('allows deletes', () => {
			const prev = makeNote('real-alice')
			expect(allowed({ session: session('real-bob'), type: 'delete', prev, next: null })).toBe(true)
		})

		it('denies any canvas write from a read-only session', () => {
			const prev = makeNote('real-alice')
			const next = { ...prev, x: 100 }
			expect(allowed({ session: session('real-bob', true), type: 'update', prev, next })).toBe(
				false
			)
		})
	})
})
