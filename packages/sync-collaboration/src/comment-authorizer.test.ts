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
import { isEqual } from '@tldraw/utils'
import { describe, expect, it } from 'vitest'
import {
	createCommentRule,
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
	userId,
	meta: { userId, canEdit },
	access: { document: canEdit ? ('write' as const) : ('read' as const), objects },
	permissions: null as string[] | null,
})
type Session = ReturnType<typeof session>
// a comment's thread has to exist for the comment to be judged
const readers = {
	before: () => undefined,
	after: (id: string) => (id === thread.id ? thread : undefined),
}

const rules = createCommentRule<UnknownRecord, Meta>({
	getUserId: (s) => s.meta.userId,
})

// The room fills the readers from the push; tests judge one change at a time.
const judge = (rule: typeof rules, s: Session, ...changes: TLRecordChange<UnknownRecord>[]) =>
	rule({ session: s, changes, ...readers })

describe('createCommentRule defaults', () => {
	it('checks authorship against session.userId when no getUserId is given', () => {
		const byDefault = createCommentRule<UnknownRecord, Meta>()
		const signedIn = { ...session(null), userId: 'bob' }
		const create = (next: TLComment) => ({ type: 'create', prev: null, next }) as const
		expect(judge(byDefault, signedIn, create(comment('bob')))).toBeNull()
		expect(judge(byDefault, signedIn, create(comment('client-says-alice')))).not.toBeNull()
		expect(judge(byDefault, session(null), create(comment('bob')))).not.toBeNull()
	})
})

describe('createCommentRule', () => {
	it('passes non-comment records through unchanged', () => {
		expect(judge(rules, session('bob'), { type: 'create', prev: null, next: page })).toBeNull()
		expect(judge(rules, session('bob'), { type: 'delete', prev: page, next: null })).toBeNull()
	})

	it("allows a create in the session's own name, and refuses one in anyone else's", () => {
		const next = comment('bob')
		expect(judge(rules, session('bob'), { type: 'create', prev: null, next })).toBeNull()
		const forged = comment('client-says-alice')
		expect(judge(rules, session('bob'), { type: 'create', prev: null, next: forged })).toEqual({
			reason: 'comment create refused',
			ids: [forged.id],
		})
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
		const next = comment('bob')
		const change: TLRecordChange<UnknownRecord> = { type: 'create', prev: null, next }
		expect(judge(rules, session('bob', false, 'write'), change)).toBeNull()
		expect(judge(rules, session('bob', true, 'read'), change)).not.toBeNull()
	})

	it('lets a host derive "may comment" from meta', () => {
		const strict = createCommentRule<UnknownRecord, Meta>({
			getUserId: (s) => s.meta.userId,
			canComment: (s) => s.meta.canEdit,
		})
		const change: TLRecordChange<UnknownRecord> = {
			type: 'create',
			prev: null,
			next: comment('bob'),
		}
		expect(judge(strict, session('bob', false), change)).not.toBeNull()
		expect(judge(strict, session('bob', true), change)).toBeNull()
	})

	it('composes with a host rule by a plain call', () => {
		const canvas = perRecord<UnknownRecord, Meta>(({ record }, { session }) =>
			isCommentRecord(record) || session.meta.canEdit ? null : 'read-only'
		)
		const compound: typeof rules = (args) => rules(args) ?? canvas(args)
		const commentCreate: TLRecordChange<UnknownRecord> = {
			type: 'create',
			prev: null,
			next: comment('bob'),
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

	it('agrees with the deprecated map, except that it refuses a create the map would stamp', () => {
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		const map = createCommentAuthorizers<Meta>({
			getUserId: (s) => s.meta.userId,
			canComment: () => true,
		})
		const legacySession = (userId: string | null) => ({ ...session(userId), isReadonly: false })
		const cases = [
			{ type: 'create', prev: null, next: comment('forged') },
			{ type: 'create', prev: null, next: comment('bob') },
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
				const asSent = c.type !== 'create' || isEqual(viaMap, c.next)
				expect(refusal === null).toBe(viaMap !== null && asSent)
			}
		}
	})
})

describe('moves: a thread following its shape', () => {
	const p2 = 'page:2' as TLPageId
	const shapeId = 'shape:x'
	const shapeAnchor = { type: 'shape', shapeId, x: 0.5, y: 0.5, isPrecise: true }
	const shapeThread = { ...thread, anchor: shapeAnchor } as unknown as typeof thread
	const shapeOn = (parentId: string, id = shapeId) =>
		({ id, typeName: 'shape', parentId }) as unknown as UnknownRecord
	const alices = comment('alice')
	const pointed = (t: typeof thread, x = 1, y = 2) =>
		({ ...t, anchor: { type: 'point', x, y } }) as unknown as typeof thread
	const state = (before: UnknownRecord[], after: UnknownRecord[]) => ({
		before: (id: string) => before.find((r) => r.id === id),
		after: (id: string) => after.find((r) => r.id === id),
	})
	// Edits the document but may not comment: only a real follow gets through.
	const editor = session('bob', true, 'read')
	const update = (prev: UnknownRecord, next: UnknownRecord): TLRecordChange<UnknownRecord> => ({
		type: 'update',
		prev,
		next,
	})

	it('lets a non-commenter re-home a thread and its comments when the shape changes page', () => {
		const movedThread = { ...shapeThread, pageId: p2 }
		const r = rules({
			session: editor,
			changes: [
				update(shapeOn(pageId), shapeOn(p2)),
				update(shapeThread, movedThread),
				update(alices, { ...alices, pageId: p2 } as UnknownRecord),
			],
			...state([shapeOn(pageId), shapeThread, alices], [shapeOn(p2), movedThread]),
		})
		expect(r).toBeNull()
	})

	it('follows a shape that moved page with its parent frame', () => {
		const movedThread = { ...shapeThread, pageId: p2 }
		const r = rules({
			session: editor,
			changes: [
				update(shapeOn(pageId, 'shape:f'), shapeOn(p2, 'shape:f')),
				update(shapeThread, movedThread),
			],
			...state(
				[shapeOn(pageId, 'shape:f'), shapeOn('shape:f')],
				[shapeOn(p2, 'shape:f'), shapeOn('shape:f'), movedThread]
			),
		})
		expect(r).toBeNull()
	})

	it('lets an anonymous non-commenter convert the anchor when the shape is deleted', () => {
		const r = rules({
			session: session(null, true, 'read'),
			changes: [
				{ type: 'delete', prev: shapeOn(pageId), next: null },
				update(shapeThread, pointed(shapeThread)),
			],
			...state([shapeOn(pageId), shapeThread], [pointed(shapeThread)]),
		})
		expect(r).toBeNull()
	})

	it('lets a non-commenter re-attach a converted thread when its shape comes back', () => {
		const restored = { ...shapeThread, pageId: p2 }
		const r = rules({
			session: editor,
			changes: [
				{ type: 'create', prev: null, next: shapeOn(p2) },
				update(pointed(shapeThread), restored),
			],
			...state([pointed(shapeThread)], [shapeOn(p2), restored]),
		})
		expect(r).toBeNull()
	})

	it('refuses a non-commenter relocating a thread whose shape did not change', () => {
		const shape = shapeOn(pageId)
		const relocations = [
			{ ...shapeThread, pageId: p2 },
			pointed(shapeThread),
			pointed({ ...shapeThread, pageId: p2 }),
		]
		for (const next of relocations) {
			const r = rules({
				session: editor,
				changes: [update(shapeThread, next)],
				...state([shape, shapeThread], [shape, next]),
			})
			expect(r).toEqual({ reason: 'comment-thread move refused', ids: [shapeThread.id] })
		}
	})

	it('refuses a thread following a shape to a page it did not move to', () => {
		const r = rules({
			session: editor,
			changes: [
				update(shapeOn(pageId), shapeOn(p2)),
				update(shapeThread, { ...shapeThread, pageId: 'page:3' as TLPageId } as UnknownRecord),
			],
			...state([shapeOn(pageId)], [shapeOn(p2)]),
		})
		expect(r).toEqual({ reason: 'comment-thread move refused', ids: [shapeThread.id] })
	})

	it("refuses a deleted shape's thread jumping page", () => {
		const next = pointed({ ...shapeThread, pageId: p2 })
		const r = rules({
			session: editor,
			changes: [{ type: 'delete', prev: shapeOn(pageId), next: null }, update(shapeThread, next)],
			...state([shapeOn(pageId)], [next]),
		})
		expect(r).toEqual({ reason: 'comment-thread move refused', ids: [shapeThread.id] })
	})

	it('still lets a commenter relocate a thread with no shape change', () => {
		const r = rules({
			session: session('bob'),
			changes: [update(shapeThread, pointed({ ...shapeThread, pageId: p2 }))],
			...state([shapeOn(pageId)], [shapeOn(pageId)]),
		})
		expect(r).toBeNull()
	})

	it('refuses a move from a session without document write access', () => {
		const movedThread = { ...shapeThread, pageId: p2 }
		const r = rules({
			session: session('bob', false, 'read'),
			changes: [update(shapeThread, movedThread)],
			...state([shapeOn(pageId)], [shapeOn(p2), movedThread]),
		})
		expect(r).toEqual({ reason: 'comment-thread move refused', ids: [shapeThread.id] })
	})

	it('refuses a comment moving to a page its thread is not on', () => {
		const r = rules({
			session: editor,
			changes: [update(alices, { ...alices, pageId: p2 } as UnknownRecord)],
			...state([shapeThread], [shapeThread]),
		})
		expect(r).toEqual({ reason: 'comment must stay on its thread page', ids: [alices.id] })
	})

	it("refuses the comment's own author moving it off its thread's page, alone or with an edit", () => {
		const author = session('alice')
		const moves = [
			{ ...alices, pageId: p2 },
			{ ...alices, pageId: p2, body: toRichText('rewritten') },
		]
		for (const next of moves) {
			const r = rules({
				session: author,
				changes: [update(alices, next as UnknownRecord)],
				...state([shapeThread], [shapeThread]),
			})
			expect(r).toEqual({ reason: 'comment must stay on its thread page', ids: [alices.id] })
		}
	})

	it("lets the author edit a comment and follow its thread's move in one push", () => {
		const movedThread = { ...shapeThread, pageId: p2 }
		const r = rules({
			session: session('alice'),
			changes: [
				update(shapeThread, movedThread),
				update(alices, { ...alices, pageId: p2, body: toRichText('rewritten') } as UnknownRecord),
			],
			...state([shapeThread], [movedThread]),
		})
		expect(r).toBeNull()
	})

	it("refuses a comment created on a page its thread isn't on", () => {
		const created = { ...comment('alice'), pageId: p2 } as UnknownRecord
		const r = rules({
			session: session('alice'),
			changes: [{ type: 'create', prev: null, next: created }],
			...state([thread], [thread, created]),
		})
		expect(r).toEqual({ reason: 'comment must stay on its thread page', ids: [created.id] })
	})

	it('still treats a pageId change bundled with a content edit as an edit', () => {
		const movedThread = { ...shapeThread, pageId: p2 }
		const r = rules({
			session: session('bob'),
			changes: [
				update(alices, { ...alices, pageId: p2, body: toRichText('rewritten') } as UnknownRecord),
			],
			...state([], [movedThread]),
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
