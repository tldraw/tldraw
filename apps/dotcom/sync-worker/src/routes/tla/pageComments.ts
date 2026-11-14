import { McpAgentClient } from '@tldraw/dotcom-shared'
import { jsonArrayFrom } from 'kysely/helpers/postgres'
import { selectMentionableUsers } from '../../mcpCommentWrite'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { getRoomDurableObject } from '../../utils/durableObjects'
import {
	COMMENT_THREADS_PAGE_SIZE,
	CommentRow,
	CommentTarget,
	CommentThreadRow,
	CommentWriteRefusal,
	MentionableUser,
	ToolResult,
	getCommentRefusalMessage,
	toolError,
} from './boardTools'

/**
 * Who `userId` may mention in a comment on `fileId`: the roster tldraw.com's own @-picker offers
 * them (see `selectMentionableUsers`), so an agent can mention whoever its user could.
 */
export async function readMentionableUsers(
	env: Environment,
	fileId: string,
	userId: string
): Promise<MentionableUser[]> {
	const db = createPostgresConnectionPool(env, 'sync-worker/readMentionableUsers')
	try {
		return await selectMentionableUsers(db, { fileId, userId })
	} finally {
		await db.destroy()
	}
}

/**
 * One page of a board page's live comment threads, newest first, and all their live comments, in
 * one statement. Resolved threads are left out unless `includeResolved`, in the query rather than
 * after it: a busy review page's resolved threads can outnumber its open ones.
 *
 * Paged by keyset on (createdAt, id), which a thread never changes, so a thread started or resolved
 * between calls can't shift the threads after it onto a page the caller has already read.
 *
 * Read from Postgres rather than the file's Durable Object: the object would have to boot the room
 * to answer, and Postgres is the comment lane's durable store, a drain behind the room at most —
 * which write_comment waits out for its own comments.
 */
export async function readPageCommentRows(
	env: Environment,
	fileId: string,
	pageId: string,
	{
		includeResolved,
		after,
	}: {
		includeResolved: boolean
		/** The last thread of the previous page; see `CommentThreadCursor`. */
		after: { createdAt: number; threadId: string } | null
	}
): Promise<{ threads: CommentThreadRow[]; comments: CommentRow[]; hasMore: boolean }> {
	const db = createPostgresConnectionPool(env, 'sync-worker/readPageCommentRows')
	try {
		const { threadRows, commentRows } = await db
			.with('t', (qb) =>
				qb
					.selectFrom('comment_thread')
					.select(['id', 'anchor', 'resolvedAt', 'createdAt'])
					.where('fileId', '=', fileId)
					.where('pageId', '=', pageId)
					.where('isDeleted', '=', false)
					.$if(!includeResolved, (q) => q.where('resolvedAt', 'is', null))
					// tldraw.com shows no thread without a live comment, and one here would take a slot.
					.where(({ exists, selectFrom }) =>
						exists(
							selectFrom('comment')
								.select('comment.id')
								.whereRef('comment.threadId', '=', 'comment_thread.id')
								.where('comment.fileId', '=', fileId)
								.where('comment.isDeleted', '=', false)
						)
					)
					.$if(after !== null, (q) =>
						q.where(({ eb, or, and }) =>
							or([
								eb('createdAt', '<', after!.createdAt),
								and([eb('createdAt', '=', after!.createdAt), eb('id', '<', after!.threadId)]),
							])
						)
					)
					.orderBy('createdAt', 'desc')
					.orderBy('id', 'desc')
					// One over, to tell whether there is a next page without counting.
					.limit(COMMENT_THREADS_PAGE_SIZE + 1)
			)
			.selectNoFrom((eb) => [
				jsonArrayFrom(
					eb.selectFrom('t').select(['t.id', 't.anchor', 't.resolvedAt', 't.createdAt'])
				).as('threadRows'),
				// Joined to this page of threads rather than by the comment's own pageId, which is
				// denormalized from it.
				jsonArrayFrom(
					eb
						.selectFrom('comment as c')
						.innerJoin('t', 't.id', 'c.threadId')
						.select([
							'c.id',
							'c.threadId',
							'c.authorId',
							'c.authorName',
							'c.body',
							'c.createdAt',
							'c.meta',
						])
						.where('c.fileId', '=', fileId)
						.where('c.isDeleted', '=', false)
				).as('commentRows'),
			])
			.executeTakeFirstOrThrow()
		const hasMore = threadRows.length > COMMENT_THREADS_PAGE_SIZE
		// The extra thread's comments came back too; they are dropped with it, by thread.
		const threads = [...threadRows]
			.map((row) => ({ ...row, createdAt: Number(row.createdAt) }))
			.sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0))
			.slice(0, COMMENT_THREADS_PAGE_SIZE)
		const kept = new Set(threads.map((thread) => thread.id))
		return {
			hasMore,
			threads: threads.map((row) => ({
				id: row.id,
				anchor: row.anchor,
				resolvedAt: row.resolvedAt == null ? null : Number(row.resolvedAt),
				createdAt: row.createdAt,
			})),
			comments: commentRows
				.filter((row) => kept.has(row.threadId))
				.map((row) => ({
					id: row.id,
					threadId: row.threadId,
					authorId: row.authorId,
					authorName: row.authorName,
					body: row.body,
					createdAt: Number(row.createdAt),
					meta: row.meta,
				})),
		}
	} finally {
		await db.destroy()
	}
}

export type WriteCommentOutcome =
	| {
			ok: true
			threadId: string
			commentId: string
			pageId: string
			newThread: boolean
			/** Saved on the board, but not yet in Postgres, which read_page_comments reads. */
			queued: boolean
	  }
	| { ok: false; reason: CommentWriteRefusal['reason']; result: ToolResult }

/**
 * Posts `text` as `userId`, marked as an agent's, through the file's Durable Object — the one
 * place a comment can be written so that connected collaborators see it and it reaches Postgres.
 *
 * The object makes the access call itself, with the same query `hasReadAccessToFile` runs, and
 * checks any mentions after it, so the route asks Postgres nothing. An id the caller cannot see wakes
 * an object, but it answers not_found before it loads or stores anything or says who is on the board.
 */
export async function writeCommentForUser(
	env: Environment,
	userId: string,
	{
		boardId,
		text,
		target,
		agentName,
		agentClient,
	}: {
		boardId: string
		text: string
		target: CommentTarget
		agentName: string
		agentClient: McpAgentClient | null
	}
): Promise<WriteCommentOutcome> {
	const written = await getRoomDurableObject(env, boardId).writeMcpComment({
		fileId: boardId,
		userId,
		agentName,
		agentClient,
		text,
		target,
	})
	if (!written.ok) return refused(written)
	return written
}

function refused(refusal: CommentWriteRefusal): WriteCommentOutcome {
	return {
		ok: false,
		reason: refusal.reason,
		result: toolError(getCommentRefusalMessage(refusal)),
	}
}
