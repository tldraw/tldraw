import type { CommentAuthor } from '@tldraw/mentions'
import type { TLComment } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { absoluteThreadLink, toCardProps } from './thread-view'

const AUTHOR: CommentAuthor = { name: 'Ada' }

function comment(overrides: Partial<TLComment> = {}): TLComment {
	return {
		id: 'comment:1',
		typeName: 'comment',
		threadId: 'comment-thread:1',
		pageId: 'page:one',
		authorId: 'user:1',
		body: { type: 'doc', content: [] },
		createdAt: Date.parse('2026-07-30T12:00:00.000Z'),
		editedAt: null,
		meta: {},
		...overrides,
	} as unknown as TLComment
}

const context = {
	currentUserId: 'user:1',
	resolveAuthor: (id: string) => (id === 'user:1' ? AUTHOR : undefined),
}

const resolveName = (id: string) => context.resolveAuthor(id)?.name

describe('toCardProps', () => {
	it('marks your own comments and resolves the author', () => {
		const card = toCardProps(comment(), context, {}, resolveName)
		expect(card.you).toBe(true)
		expect(card.author).toBe(AUTHOR)
		expect(card.date).toBe('2026-07-30T12:00:00.000Z')
		expect(card.edited).toBe(false)
	})

	it('falls back to the unknown author when the id does not resolve', () => {
		const card = toCardProps(comment({ authorId: 'user:gone' }), context, {}, resolveName)
		expect(card.you).toBe(false)
		expect(card.author).not.toBe(AUTHOR)
	})
})

describe('absoluteThreadLink', () => {
	const BASE = 'https://example.com/f/abc123?page=2'

	// A host's `getThreadHref` is an href — the sidebar rows use it as one — so it's allowed to be
	// relative. Copying that verbatim would put "/f/abc123?comment=…" on someone's clipboard.
	it('resolves a root-relative href against the current document', () => {
		expect(absoluteThreadLink('/f/abc123?comment=comment-thread%3A1', BASE)).toBe(
			'https://example.com/f/abc123?comment=comment-thread%3A1'
		)
	})

	it('leaves an already absolute href alone', () => {
		const href = 'https://other.example/f/xyz?comment=comment-thread%3A1'
		expect(absoluteThreadLink(href, BASE)).toBe(href)
	})

	it('resolves a path-relative href', () => {
		expect(absoluteThreadLink('?comment=comment-thread%3A1', BASE)).toBe(
			'https://example.com/f/abc123?comment=comment-thread%3A1'
		)
	})

	// Better a link that's odd than a copy button that silently does nothing.
	it('copies an unparseable href as-is', () => {
		expect(absoluteThreadLink('::not a url::', '::also not::')).toBe('::not a url::')
	})
})
