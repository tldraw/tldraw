/* eslint-disable tldraw/no-direct-storage */
import type { TLRichText } from 'tldraw'
import { beforeEach, describe, expect, it } from 'vitest'
import {
	clearCommentDraft,
	getCommentDraft,
	NEW_COMMENT_DRAFT,
	replyDraftSlot,
	saveCommentDraft,
} from './comment-drafts'

function richText(text: string): TLRichText {
	return {
		type: 'doc',
		content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
	} as unknown as TLRichText
}

const EMPTY = { type: 'doc', content: [{ type: 'paragraph' }] } as unknown as TLRichText

beforeEach(() => {
	localStorage.clear()
})

describe('comment drafts', () => {
	it('round-trips a draft through its slot', () => {
		saveCommentDraft(NEW_COMMENT_DRAFT, richText('hello'))
		expect(getCommentDraft(NEW_COMMENT_DRAFT)).toEqual(richText('hello'))
	})

	it('keeps reply drafts apart by thread id', () => {
		saveCommentDraft(replyDraftSlot('comment-thread:a'), richText('for a'))
		saveCommentDraft(replyDraftSlot('comment-thread:b'), richText('for b'))
		expect(getCommentDraft(replyDraftSlot('comment-thread:a'))).toEqual(richText('for a'))
		expect(getCommentDraft(replyDraftSlot('comment-thread:b'))).toEqual(richText('for b'))
		expect(getCommentDraft(NEW_COMMENT_DRAFT)).toBeUndefined()
	})

	it('saving empty content clears the slot instead', () => {
		saveCommentDraft(NEW_COMMENT_DRAFT, richText('typed then deleted'))
		saveCommentDraft(NEW_COMMENT_DRAFT, EMPTY)
		expect(getCommentDraft(NEW_COMMENT_DRAFT)).toBeUndefined()
	})

	it('clears a slot explicitly', () => {
		saveCommentDraft(NEW_COMMENT_DRAFT, richText('posted'))
		clearCommentDraft(NEW_COMMENT_DRAFT)
		expect(getCommentDraft(NEW_COMMENT_DRAFT)).toBeUndefined()
	})

	it('returns undefined for a corrupt stored value', () => {
		localStorage.setItem('tldraw-comment-draft:new', '{not json')
		expect(getCommentDraft(NEW_COMMENT_DRAFT)).toBeUndefined()
	})
})
