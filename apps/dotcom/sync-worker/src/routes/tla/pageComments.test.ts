import { afterEach, describe, expect, it, vi } from 'vitest'
import { createFakeKysely } from '../../test/fakeKysely'
import { Environment } from '../../types'
import { hasReadAccessToFile } from '../../utils/tla/getAuth'
import { COMMENT_BOARD_NOT_FOUND_MESSAGE, COMMENT_THREADS_PAGE_SIZE } from './boardTools'

vi.mock('../../postgres', () => ({ createPostgresConnectionPool: vi.fn() }))
vi.mock('../../utils/tla/getAuth', () => ({ hasReadAccessToFile: vi.fn() }))

const writeMcpComment = vi.fn()
vi.mock('../../utils/durableObjects', () => ({
	getRoomDurableObject: vi.fn(() => ({ writeMcpComment })),
}))

const { createPostgresConnectionPool } = await import('../../postgres')
const { getRoomDurableObject } = await import('../../utils/durableObjects')
const { readMentionableUsers, readPageCommentRows, writeCommentForUser } =
	await import('./pageComments')

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
		writeMcpComment.mockResolvedValue({
			ok: true,
			threadId: 'comment-thread:t',
			commentId: 'comment:c',
			pageId: 'page:a',
			newThread: false,
			queued: false,
		})

		const outcome = await writeCommentForUser(env, USER_ID, {
			agentName: 'Claude',
			agentClient: 'claude',
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
			queued: false,
		})
		expect(getRoomDurableObject).toHaveBeenCalledWith(env, BOARD_ID)
		const [call] = writeMcpComment.mock.calls[0]
		expect(call).toMatchObject({
			fileId: BOARD_ID,
			userId: USER_ID,
			target: { kind: 'reply', threadId: 'comment-thread:t' },
		})
		// The text is the agent's own: tldraw.com marks the comment from its meta instead.
		expect(call.body.content[0].content[0]).toEqual({ type: 'text', text: 'Done' })
	})

	// The same answer as a missing board, so ids cannot be probed.
	it('words a board the caller cannot see as missing', async () => {
		writeMcpComment.mockResolvedValue({ ok: false, reason: 'not_found' })
		const outcome = await writeCommentForUser(env, USER_ID, {
			agentName: 'Claude',
			agentClient: 'claude',
			boardId: BOARD_ID,
			text: 'Hi',
			target: { kind: 'shape', shapeId: 'shape:box' },
		})
		expect(outcome).toMatchObject({ ok: false, reason: 'not_found' })
		expect(errorText(outcome)).toBe(COMMENT_BOARD_NOT_FOUND_MESSAGE)
	})

	it('words the object’s refusal for the model', async () => {
		writeMcpComment.mockResolvedValue({ ok: false, reason: 'comment_forbidden' })
		const forbidden = await writeCommentForUser(env, USER_ID, {
			agentName: 'Claude',
			agentClient: 'claude',
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
			agentName: 'Claude',
			agentClient: 'claude',
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
							meta: { mcpAgent: { id: 'mcp-agent:a', name: 'Claude' } },
						},
					],
				},
			],
		])
		vi.mocked(createPostgresConnectionPool).mockReturnValue(fake.db)

		expect(
			await readPageCommentRows(env, BOARD_ID, 'page:a', { includeResolved: true, after: null })
		).toEqual({
			hasMore: false,
			threads: [{ id: 'comment-thread:t', anchor: { type: 'page' }, resolvedAt: 5, createdAt: 1 }],
			comments: [
				{
					id: 'comment:c',
					threadId: 'comment-thread:t',
					authorId: 'user_a',
					authorName: 'Ada',
					body: { type: 'doc', content: [] },
					createdAt: 2,
					meta: { mcpAgent: { id: 'mcp-agent:a', name: 'Claude' } },
				},
			],
		})
		expect(fake.queries).toHaveLength(1)
		const { sql, parameters } = fake.queries[0]
		expect(sql).toContain('"isDeleted" = $')
		expect(parameters.filter((p) => p === BOARD_ID)).toHaveLength(3)
		expect(parameters.filter((p) => p === 'page:a')).toHaveLength(1)
		expect(sql).not.toContain('"resolvedAt" is null')
		expect(parameters).toContain(COMMENT_THREADS_PAGE_SIZE + 1)
		expect(fake.destroy).toHaveBeenCalled()
	})

	it('leaves resolved threads and their comments out in the query', async () => {
		const fake = createFakeKysely([[{ threadRows: [], commentRows: [] }]])
		vi.mocked(createPostgresConnectionPool).mockReturnValue(fake.db)
		await readPageCommentRows(env, BOARD_ID, 'page:a', { includeResolved: false, after: null })
		expect(fake.queries[0].sql.match(/"resolvedAt" is null/g)).toHaveLength(1)
	})

	it('reads one thread past the page to tell whether there is another, and drops it', async () => {
		const threadRows = Array.from({ length: COMMENT_THREADS_PAGE_SIZE + 1 }, (_, i) => ({
			id: `comment-thread:${String(i).padStart(2, '0')}`,
			anchor: { type: 'page' },
			resolvedAt: null,
			createdAt: String(100 - i),
		}))
		const commentRows = threadRows.map((thread, i) => ({
			id: `comment:${i}`,
			threadId: thread.id,
			authorId: 'user_a',
			authorName: 'Ada',
			body: { type: 'doc', content: [] },
			createdAt: '1',
			meta: null,
		}))
		const fake = createFakeKysely([[{ threadRows, commentRows }]])
		vi.mocked(createPostgresConnectionPool).mockReturnValue(fake.db)
		const read = await readPageCommentRows(env, BOARD_ID, 'page:a', {
			includeResolved: false,
			after: { createdAt: 101, threadId: 'comment-thread:zz' },
		})
		expect(read.hasMore).toBe(true)
		expect(read.threads).toHaveLength(COMMENT_THREADS_PAGE_SIZE)
		expect(read.comments).toHaveLength(COMMENT_THREADS_PAGE_SIZE)
		expect(read.threads.at(-1)?.createdAt).toBe(100 - COMMENT_THREADS_PAGE_SIZE + 1)
		expect(fake.queries[0].parameters).toEqual(expect.arrayContaining([101, 'comment-thread:zz']))
	})
})

describe('mentions', () => {
	function allowAccess() {
		vi.mocked(hasReadAccessToFile).mockResolvedValue({
			ok: true,
			file: { id: BOARD_ID, name: 'Board', shared: false, isDeleted: false },
		})
	}
	function roster(members: object[], visitors: object[] = []) {
		const fake = createFakeKysely([[{ members, visitors }]])
		vi.mocked(createPostgresConnectionPool).mockReturnValue(fake.db)
		return fake
	}
	const write = (text: string) =>
		writeCommentForUser(env, USER_ID, {
			agentName: 'Claude',
			agentClient: 'claude',
			boardId: BOARD_ID,
			text,
			target: { kind: 'reply', threadId: 'comment-thread:t' },
		})

	it('lists workspace members, then visitors who are not members, with a fallback name', async () => {
		const fake = roster(
			[{ id: 'user_a', name: 'Ada' }],
			[
				{ id: 'user_a', name: 'Ada' },
				{ id: 'user_g', name: '' },
			]
		)
		expect(await readMentionableUsers(env, BOARD_ID)).toEqual([
			{ id: 'user_a', name: 'Ada' },
			{ id: 'user_g', name: 'Someone' },
		])
		expect(fake.destroy).toHaveBeenCalled()
	})

	it('mentions by id, named from our records rather than the text', async () => {
		allowAccess()
		roster([{ id: 'user_a', name: 'Ada Lovelace' }])
		writeMcpComment.mockResolvedValue({
			ok: true,
			threadId: 'comment-thread:t',
			commentId: 'comment:c',
			pageId: 'page:a',
			newThread: false,
		})

		await write('@[The Boss](user_a) take a look')

		expect(writeMcpComment.mock.calls[0][0].body).toEqual({
			type: 'doc',
			content: [
				{
					type: 'paragraph',
					content: [
						{ type: 'mention', attrs: { id: 'user_a', label: 'Ada Lovelace' } },
						{ type: 'text', text: ' take a look' },
					],
				},
			],
		})
	})

	it('refuses an id the board would not offer, without touching the object', async () => {
		allowAccess()
		roster([{ id: 'user_a', name: 'Ada' }])
		const outcome = await write('@[Ada](user_a) and @[Eve](user_eve)')
		expect(outcome).toMatchObject({ ok: false, reason: 'unknown_mention' })
		expect(errorText(outcome)).toContain('"user_eve"')
		expect(errorText(outcome)).not.toContain('"user_a"')
		expect(writeMcpComment).not.toHaveBeenCalled()
	})

	it('reads no roster or access for a comment that mentions nobody', async () => {
		writeMcpComment.mockResolvedValue({ ok: false, reason: 'comment_forbidden' })
		await write('no mentions here')
		expect(createPostgresConnectionPool).not.toHaveBeenCalled()
		expect(hasReadAccessToFile).not.toHaveBeenCalled()
	})

	// Otherwise which ids pass would say who is on a board the caller cannot see.
	it('answers a mention on a board the caller cannot see as missing, before the roster', async () => {
		vi.mocked(hasReadAccessToFile).mockResolvedValue({ ok: false })
		const outcome = await write('@[Ada](user_a)')
		expect(outcome).toMatchObject({ ok: false, reason: 'not_found' })
		expect(createPostgresConnectionPool).not.toHaveBeenCalled()
		expect(writeMcpComment).not.toHaveBeenCalled()
	})
})
