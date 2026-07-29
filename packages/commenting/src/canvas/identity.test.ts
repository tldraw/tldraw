import { describe, expect, it } from 'vitest'
import { type CommentingIdentity, mergeCommentingIdentity } from './identity'

const resolveAda = () => ({ name: 'Ada' })
const resolveGrace = () => ({ name: 'Grace' })

const provided: CommentingIdentity = {
	currentUserId: 'me',
	resolveAuthor: resolveAda,
	isCommentUnread: () => true,
	onCommentRead: () => {},
}

describe('mergeCommentingIdentity', () => {
	it('inherits every field a surface leaves unset', () => {
		expect(mergeCommentingIdentity(provided, {})).toEqual({
			...provided,
			onPostComment: undefined,
			getMentionSuggestions: undefined,
			renderMentionSuggestion: undefined,
		})
	})

	it('lets a surface override one field without disturbing the rest', () => {
		const merged = mergeCommentingIdentity(provided, { resolveAuthor: resolveGrace })
		expect(merged.resolveAuthor).toBe(resolveGrace)
		expect(merged.currentUserId).toBe('me')
		expect(merged.isCommentUnread).toBe(provided.isCommentUnread)
	})

	// The distinction the whole thing turns on: a read-only surface passes null to switch composing
	// off, while the provider keeps the real id for the surfaces that only read it.
	it('treats a null currentUserId as an override, not an omission', () => {
		expect(mergeCommentingIdentity(provided, { currentUserId: null }).currentUserId).toBe(null)
	})

	it('treats an undefined currentUserId as an omission', () => {
		expect(mergeCommentingIdentity(provided, { currentUserId: undefined }).currentUserId).toBe('me')
	})
})
