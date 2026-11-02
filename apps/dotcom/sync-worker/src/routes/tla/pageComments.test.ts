import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFakeKysely } from '../../test/fakeKysely'
import { Environment } from '../../types'
import { hasReadAccessToFile } from '../../utils/tla/getAuth'
import { AGENT_COMMENT_HEADER, COMMENT_BOARD_NOT_FOUND_MESSAGE } from './boardTools'

vi.mock('../../postgres', () => ({ createPostgresConnectionPool: vi.fn() }))
vi.mock('../../utils/tla/getAuth', () => ({ hasReadAccessToFile: vi.fn() }))

const writeMcpComment = vi.fn()
vi.mock('../../utils/durableObjects', () => ({
	getRoomDurableObject: vi.fn(() => ({ writeMcpComment })),
}))

const { createPostgresConnectionPool } = await import('../../postgres')
const { getRoomDurableObject } = await import('../../utils/durableObjects')
const { readPageCommentRows, writeCommentForUser } = await import('./pageComments')

const env = {} as Environment
const USER_ID = 'user_me'
const BOARD_ID = 'board_abc'

function errorText(outcome: Awaited<ReturnType<typeof writeCommentForUser>>) {
	if (outcome.ok) throw new Error('Expected a refusal')
	const block = outcome.result.content[0]
	if (block.type !== 'text') throw new Error('Expected a text block')
	return block.text
}

afterEach(() => vi.clearAllMocks())

describe('writeCommentForUser', () => {
	it('posts through the file’s object as the caller, with the header in the body', async () => {
		vi.mocked(hasReadAccessToFile).mockResolvedValue({
			ok: true,
			file: { id: BOARD_ID, shared: false, isDeleted: false },
		})
		writeMcpComment.mockResolvedValue({
			ok: true,
			threadId: 'comment-thread:t',
			commentId: 'comment:c',
			pageId: 'page:a',
			newThread: false,
		})

		const outcome = await writeCommentForUser(env, USER_ID, {
			boardId: BOARD_ID,
			text: 'Done',
			target: { kind: 'reply', threadId: 'comment-thread:t' },
		})

		expect(outcome).toEqual({
			ok: true,
			threadId: 'comment-thread:t',
			commentId: 'comment:c',
			pageId: 'page:a',
			newThread: false,
		})
		expect(getRoomDurableObject).toHaveBeenCalledWith(env, BOARD_ID)
		const [call] = writeMcpComment.mock.calls[0]
		expect(call).toMatchObject({
			fileId: BOARD_ID,
			userId: USER_ID,
			target: { kind: 'reply', threadId: 'comment-thread:t' },
		})
		expect(call.body.content[0].content[0]).toEqual({
			type: 'text',
			text: AGENT_COMMENT_HEADER,
			marks: [{ type: 'italic' }],
		})
	})

	// The same answer as a missing board, so ids cannot be probed — and no object is woken for it.
	it('refuses a board the caller cannot see without touching its object', async () => {
		vi.mocked(hasReadAccessToFile).mockResolvedValue({ ok: false })
		const outcome = await writeCommentForUser(env, USER_ID, {
			boardId: BOARD_ID,
			text: 'Hi',
			target: { kind: 'shape', shapeId: 'shape:box' },
		})
		expect(outcome).toMatchObject({ ok: false, reason: 'not_found' })
		expect(errorText(outcome)).toBe(COMMENT_BOARD_NOT_FOUND_MESSAGE)
		expect(getRoomDurableObject).not.toHaveBeenCalled()
	})

	it('words the object’s refusal for the model', async () => {
		vi.mocked(hasReadAccessToFile).mockResolvedValue({
			ok: true,
			file: { id: BOARD_ID, shared: true, isDeleted: false },
		})
		writeMcpComment.mockResolvedValue({ ok: false, reason: 'comment_forbidden' })
		const forbidden = await writeCommentForUser(env, USER_ID, {
			boardId: BOARD_ID,
			text: 'Hi',
			target: { kind: 'reply', threadId: 'comment-thread:t' },
		})
		expect(forbidden).toMatchObject({ ok: false, reason: 'comment_forbidden' })
		expect(errorText(forbidden)).toContain('view-only link')

		writeMcpComment.mockResolvedValue({
			ok: false,
			reason: 'thread_resolved',
			threadId: 'comment-thread:t',
		})
		const resolved = await writeCommentForUser(env, USER_ID, {
			boardId: BOARD_ID,
			text: 'Hi',
			target: { kind: 'reply', threadId: 'comment-thread:t' },
		})
		expect(errorText(resolved)).toContain('resolved')
	})
})

describe('readPageCommentRows', () => {
	it('reads one page’s live threads and their live comments in a single statement', async () => {
		const fake = createFakeKysely([
			[
				{
					threadRows: [
						{ id: 'comment-thread:t', anchor: { type: 'page' }, resolvedAt: '5', createdAt: '1' },
					],
					commentRows: [
						{
							id: 'comment:c',
							threadId: 'comment-thread:t',
							authorId: 'user_a',
							authorName: 'Ada',
							body: { type: 'doc', content: [] },
							createdAt: '2',
						},
					],
				},
			],
		])
		vi.mocked(createPostgresConnectionPool).mockReturnValue(fake.db)

		expect(await readPageCommentRows(env, BOARD_ID, 'page:a')).toEqual({
			threads: [{ id: 'comment-thread:t', anchor: { type: 'page' }, resolvedAt: 5, createdAt: 1 }],
			comments: [
				{
					id: 'comment:c',
					threadId: 'comment-thread:t',
					authorId: 'user_a',
					authorName: 'Ada',
					body: { type: 'doc', content: [] },
					createdAt: 2,
				},
			],
		})
		expect(fake.queries).toHaveLength(1)
		const { sql, parameters } = fake.queries[0]
		expect(sql).toContain('"isDeleted" = $')
		expect(parameters.filter((p) => p === BOARD_ID)).toHaveLength(3)
		expect(parameters.filter((p) => p === 'page:a')).toHaveLength(2)
		expect(fake.destroy).toHaveBeenCalled()
	})
})
