import type { UnknownRecord } from '@tldraw/store'
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
const get = () => undefined

type Rule = ReturnType<typeof createCommentAuthorizer<UnknownRecord, Meta>>
type Args = Parameters<Rule>[0]
type Change = Omit<Args, 'record' | 'get'>
// The room fills `get` and `record` from the push; tests build the change by hand.
const args = (c: Change): Args =>
	({ ...c, get, record: c.type === 'delete' ? c.prev : c.next }) as Args

describe('createCommentAuthorizer', () => {
	const rule = createCommentAuthorizer<UnknownRecord, Meta>({
		getUserId: (s) => s.meta.userId,
	})

	it('passes non-comment records through unchanged', () => {
		expect(rule(args({ session: session('bob'), type: 'create', prev: null, next: page }))).toBe(
			page
		)
		expect(rule(args({ session: session('bob'), type: 'delete', prev: page, next: null }))).toBe(
			page
		)
	})

	it('judges comment records with the same rules as the per-type map', () => {
		const next = comment('client-says-alice')
		const result = rule(
			args({ session: session('bob'), type: 'create', prev: null, next })
		) as TLComment
		expect(result.authorId).toBe('bob')
		expect(rule(args({ session: session(null), type: 'create', prev: null, next }))).toBeNull()
		expect(
			rule(args({ session: session('eve'), type: 'delete', prev: comment('bob'), next: null }))
		).toBeNull()
	})

	it('follows object-lane access by default, independent of the canvas', () => {
		const next = comment('x')
		expect(
			rule(args({ session: session('bob', false, 'write'), type: 'create', prev: null, next }))
		).not.toBeNull()
		expect(
			rule(args({ session: session('bob', true, 'read'), type: 'create', prev: null, next }))
		).toBeNull()
	})

	it('lets a host derive "may comment" from meta', () => {
		const strict = createCommentAuthorizer<UnknownRecord, Meta>({
			getUserId: (s) => s.meta.userId,
			canComment: (s) => s.meta.canEdit,
		})
		const next = comment('x')
		expect(
			strict(args({ session: session('bob', false), type: 'create', prev: null, next }))
		).toBeNull()
		expect(
			strict(args({ session: session('bob', true), type: 'create', prev: null, next }))
		).not.toBeNull()
	})

	it('composes with a host rule that runs after it', () => {
		const comments = createCommentAuthorizer<UnknownRecord, Meta>({
			getUserId: (s) => s.meta.userId,
		})
		const compound: Rule = (a) => {
			if (isCommentRecord(a.record)) return comments(a)
			return a.session.meta.canEdit ? a.record : null
		}
		expect(
			compound(
				args({ session: session('bob', false), type: 'create', prev: null, next: comment('x') })
			)
		).not.toBeNull()
		expect(
			compound(args({ session: session('bob', false), type: 'create', prev: null, next: page }))
		).toBeNull()
		expect(
			compound(args({ session: session('bob', true), type: 'create', prev: null, next: page }))
		).toBe(page)
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
				const viaRule = rule(args({ session: session(userId), ...c } as Change))
				const viaMap = map[(c.next ?? c.prev).typeName as 'comment' | 'comment-thread']!({
					session: legacySession(userId),
					...c,
				} as any)
				expect(viaRule).toEqual(viaMap)
			}
		}
	})
})

describe('isCommentRecord', () => {
	it('is true for the three comment types and false otherwise', () => {
		expect(isCommentRecord(thread)).toBe(true)
		expect(isCommentRecord(comment('x'))).toBe(true)
		expect(isCommentRecord(page)).toBe(false)
	})
})
