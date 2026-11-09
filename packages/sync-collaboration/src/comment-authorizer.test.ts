import type { UnknownRecord } from '@tldraw/store'
import { perRecord, type TLRecordChange } from '@tldraw/sync-core'
import {
	createComment,
	createCommentThread,
	PageRecordType,
	TLComment,
	TLPageId,
	toRichText,
} from '@tldraw/tlschema'
import { describe, expect, it } from 'vitest'
import {
	createCommentAuthorizer,
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	createCommentAuthorizers,
	isCommentRecord,
} from './comment-authorizers'

interface Meta {
	userId: string | null
	canEdit: boolean
}

const pageId = 'page:test' as TLPageId
const page = PageRecordType.create({ id: pageId, name: 'p', index: 'a1' as any })
const thread = createCommentThread({ pageId, anchor: { type: 'page' }, createdBy: 'client-says' })
const comment = (authorId: string) =>
	createComment({ threadId: thread.id, pageId, authorId, body: toRichText('hi') })

const session = (userId: string | null, canEdit = true, objects: 'read' | 'write' = 'write') => ({
	sessionId: 's1',
	meta: { userId, canEdit },
	access: { document: canEdit ? ('write' as const) : ('read' as const), objects },
})
type Session = ReturnType<typeof session>
const readers = { before: () => undefined, after: () => undefined }

const rules = createCommentAuthorizer<UnknownRecord, Meta>({
	getUserId: (s) => s.meta.userId,
})

// The room fills the readers from the push; tests judge one change at a time.
const judge = (
	{ authorize }: typeof rules,
	s: Session,
	...changes: TLRecordChange<UnknownRecord>[]
) => authorize({ session: s, changes, ...readers })
const stamp = ({ transform }: typeof rules, s: Session, record: UnknownRecord) =>
	transform({ session: s, record, before: readers.before })

describe('createCommentAuthorizer', () => {
	it('passes non-comment records through unchanged', () => {
		expect(stamp(rules, session('bob'), page)).toBe(page)
		expect(judge(rules, session('bob'), { type: 'create', prev: null, next: page })).toBeNull()
		expect(judge(rules, session('bob'), { type: 'delete', prev: page, next: null })).toBeNull()
	})

	it('stamps the author on create and refuses what the per-type map refused', () => {
		const next = comment('client-says-alice')
		expect((stamp(rules, session('bob'), next) as TLComment).authorId).toBe('bob')
		expect(judge(rules, session('bob'), { type: 'create', prev: null, next })).toBeNull()
		expect(judge(rules, session(null), { type: 'create', prev: null, next })).toEqual({
			reason: 'comment create refused',
			ids: [next.id],
		})
		const bobs = comment('bob')
		expect(judge(rules, session('eve'), { type: 'delete', prev: bobs, next: null })).toEqual({
			reason: 'comment delete refused',
			ids: [bobs.id],
		})
	})

	it('leaves a create it would refuse unstamped for authorize to refuse', () => {
		const next = comment('x')
		expect(stamp(rules, session(null), next)).toBe(next)
	})

	it('refuses the push once, naming every refused record', () => {
		const a = comment('bob')
		const b = { ...comment('bob'), id: 'comment:b' as TLComment['id'] }
		expect(
			judge(
				rules,
				session('eve'),
				{ type: 'delete', prev: a, next: null },
				{ type: 'create', prev: null, next: page },
				{ type: 'delete', prev: b, next: null }
			)
		).toEqual({ reason: 'comment delete refused', ids: [a.id, b.id].sort() })
	})

	it('follows object-store access by default, independent of the canvas', () => {
		const next = comment('x')
		const change: TLRecordChange<UnknownRecord> = { type: 'create', prev: null, next }
		expect(judge(rules, session('bob', false, 'write'), change)).toBeNull()
		expect(judge(rules, session('bob', true, 'read'), change)).not.toBeNull()
	})

	it('lets a host derive "may comment" from meta', () => {
		const strict = createCommentAuthorizer<UnknownRecord, Meta>({
			getUserId: (s) => s.meta.userId,
			canComment: (s) => s.meta.canEdit,
		})
		const change: TLRecordChange<UnknownRecord> = { type: 'create', prev: null, next: comment('x') }
		expect(judge(strict, session('bob', false), change)).not.toBeNull()
		expect(judge(strict, session('bob', true), change)).toBeNull()
	})

	it('composes with a host rule by a plain call', () => {
		const canvas = perRecord<UnknownRecord, Meta>(({ record }, { session }) =>
			isCommentRecord(record) || session.meta.canEdit ? null : 'read-only'
		)
		const compound: typeof rules.authorize = (args) => rules.authorize(args) ?? canvas(args)
		const commentCreate: TLRecordChange<UnknownRecord> = {
			type: 'create',
			prev: null,
			next: comment('x'),
		}
		const pageCreate: TLRecordChange<UnknownRecord> = { type: 'create', prev: null, next: page }
		expect(
			compound({ session: session('bob', false), changes: [commentCreate], ...readers })
		).toBeNull()
		expect(compound({ session: session('bob', false), changes: [pageCreate], ...readers })).toEqual(
			{
				reason: 'read-only',
				ids: [page.id],
			}
		)
		expect(
			compound({ session: session('bob', true), changes: [pageCreate], ...readers })
		).toBeNull()
	})

	it('agrees with the deprecated map on every comment decision', () => {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		const map = createCommentAuthorizers<Meta>({
			getUserId: (s) => s.meta.userId,
			canComment: () => true,
		})
		const legacySession = (userId: string | null) => ({ ...session(userId), isReadonly: false })
		const cases = [
			{ type: 'create', prev: null, next: comment('forged') },
			{ type: 'update', prev: comment('bob'), next: { ...comment('bob'), authorId: 'eve' } },
			{ type: 'update', prev: comment('bob'), next: { ...comment('bob'), isDeleted: true } },
			{ type: 'delete', prev: comment('bob'), next: null },
			{ type: 'create', prev: null, next: thread },
			{ type: 'delete', prev: thread, next: null },
		] as const
		for (const userId of ['bob', 'eve', null]) {
			for (const c of cases) {
				const viaMap = map[(c.next ?? c.prev).typeName as 'comment' | 'comment-thread']!({
					session: legacySession(userId),
					...c,
				} as any)
				const refusal = judge(rules, session(userId), c as TLRecordChange<UnknownRecord>)
				expect(refusal === null).toBe(viaMap !== null)
				if (c.type === 'create' && viaMap) {
					expect(stamp(rules, session(userId), c.next)).toEqual(viaMap)
				}
			}
		}
	})
})

describe('moves: a thread following its shape', () => {
	const p2 = 'page:2' as TLPageId
	const shapeThread = {
		...thread,
		anchor: { type: 'shape', shapeId: 'shape:x', normalizedAnchor: { x: 0.5, y: 0.5 } },
	} as unknown as typeof thread
	const alices = comment('alice')
	const withAfter = (...records: UnknownRecord[]) => ({
		before: () => undefined,
		after: (id: string) => records.find((r) => r.id === id),
	})

	it('lets a non-author re-home a thread and its comments when the shape changes page', () => {
		const movedThread = { ...shapeThread, pageId: p2 }
		const r = rules.authorize({
			session: session('bob'),
			changes: [
				{ type: 'update', prev: shapeThread, next: movedThread },
				{ type: 'update', prev: alices, next: { ...alices, pageId: p2 } as UnknownRecord },
			],
			...withAfter(movedThread),
		})
		expect(r).toBeNull()
	})

	it('lets an anonymous editor convert the anchor when the shape is deleted', () => {
		const r = rules.authorize({
			session: session(null, true, 'read'),
			changes: [
				{
					type: 'update',
					prev: shapeThread,
					next: {
						...shapeThread,
						anchor: { type: 'point', x: 1, y: 2 },
					} as unknown as typeof thread,
				},
			],
			...withAfter(),
		})
		expect(r).toBeNull()
	})

	it('refuses a move from a session without document write access', () => {
		const movedThread = { ...shapeThread, pageId: p2 }
		const r = rules.authorize({
			session: session('bob', false),
			changes: [{ type: 'update', prev: shapeThread, next: movedThread }],
			...withAfter(movedThread),
		})
		expect(r).toEqual({ reason: 'comment-thread move refused', ids: [shapeThread.id] })
	})

	it('refuses a comment moving to a page its thread is not on', () => {
		const r = rules.authorize({
			session: session('bob'),
			changes: [{ type: 'update', prev: alices, next: { ...alices, pageId: p2 } as UnknownRecord }],
			...withAfter(shapeThread),
		})
		expect(r).toEqual({ reason: 'comment must stay on its thread page', ids: [alices.id] })
	})

	it('still treats a pageId change bundled with a content edit as an edit', () => {
		const movedThread = { ...shapeThread, pageId: p2 }
		const r = rules.authorize({
			session: session('bob'),
			changes: [
				{
					type: 'update',
					prev: alices,
					next: { ...alices, pageId: p2, body: toRichText('rewritten') } as UnknownRecord,
				},
			],
			...withAfter(movedThread),
		})
		expect(r).toEqual({ reason: 'comment update refused', ids: [alices.id] })
	})
})

describe('isCommentRecord', () => {
	it('is true for the three comment types and false otherwise', () => {
		expect(isCommentRecord(thread)).toBe(true)
		expect(isCommentRecord(comment('x'))).toBe(true)
		expect(isCommentRecord(page)).toBe(false)
	})
})
