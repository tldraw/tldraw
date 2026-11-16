import { createComment, TLComment, toRichText } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { dropAgentBylineOnEdit } from './agentCommentEdits'

const agent = { id: 'mcp-agent:1', name: 'Claude', client: 'claude' }
const posted: TLComment = {
	...createComment({
		threadId: 'comment-thread:t' as TLComment['threadId'],
		pageId: 'page:p' as TLComment['pageId'],
		authorId: 'user_me',
		body: toRichText('From the agent'),
	}),
	meta: { mcpAgent: agent, other: 1 },
}
const edited: TLComment = { ...posted, body: toRichText('Mine now'), editedAt: 1000 }

describe('dropAgentBylineOnEdit', () => {
	it('drops the agent badge, and nothing else, when a person edits the comment', () => {
		expect(dropAgentBylineOnEdit(posted, edited, 'user')).toEqual({ ...edited, meta: { other: 1 } })
	})

	it('keeps the badge on a remote update', () => {
		expect(dropAgentBylineOnEdit(posted, edited, 'remote')).toBe(edited)
	})

	it('keeps the badge on a change that is not an edit, such as a delete', () => {
		const deleted = { ...posted, isDeleted: true }
		expect(dropAgentBylineOnEdit(posted, deleted, 'user')).toBe(deleted)
	})
})
