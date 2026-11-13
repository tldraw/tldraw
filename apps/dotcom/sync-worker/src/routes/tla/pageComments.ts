import { McpAgentClient } from '@tldraw/dotcom-shared'
import { toRichText } from '@tldraw/tlschema'
import { jsonArrayFrom } from 'kysely/helpers/postgres'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { getRoomDurableObject } from '../../utils/durableObjects'
import {
	CommentRow,
	CommentTarget,
	CommentThreadRow,
	CommentWriteRefusal,
	ToolResult,
	getCommentRefusalMessage,
	toolError,
} from './boardTools'

/**
 * One page's live comment threads and their live comments, in one statement. Resolved threads are
 * left out unless `includeResolved`, in the query rather than after it: a busy review page's
 * resolved threads can outnumber its open ones.
 *
 * Read from Postgres rather than the file's Durable Object: the object would have to boot the room
 * to answer, and Postgres is the comment lane's durable store, a drain behind the room at most —
 * which write_comment waits out for its own comments.
 */
export async function readPageCommentRows(
	env: Environment,
	fileId: string,
	pageId: string,
	{ includeResolved }: { includeResolved: boolean }
): Promise<{ threads: CommentThreadRow[]; comments: CommentRow[] }> {
	const db = createPostgresConnectionPool(env, 'sync-worker/readPageCommentRows')
	try {
		const { threadRows, commentRows } = await db
			.selectNoFrom((eb) => [
				jsonArrayFrom(
					eb
						.selectFrom('comment_thread as t')
						.select(['t.id', 't.anchor', 't.resolvedAt', 't.createdAt'])
						.where('t.fileId', '=', fileId)
						.where('t.pageId', '=', pageId)
						.where('t.isDeleted', '=', false)
						.$if(!includeResolved, (q) => q.where('t.resolvedAt', 'is', null))
				).as('threadRows'),
				// Joined to the thread rather than by the comment's own pageId, which is denormalized
				// from it, so the page, deleted and resolved conditions are written once, on the thread.
				jsonArrayFrom(
					eb
						.selectFrom('comment as c')
						.innerJoin('comment_thread as t', 't.id', 'c.threadId')
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
						.where('t.fileId', '=', fileId)
						.where('t.pageId', '=', pageId)
						.where('t.isDeleted', '=', false)
						.$if(!includeResolved, (q) => q.where('t.resolvedAt', 'is', null))
				).as('commentRows'),
			])
			.executeTakeFirstOrThrow()
		return {
			threads: threadRows.map((row) => ({
				id: row.id,
				anchor: row.anchor,
				resolvedAt: row.resolvedAt == null ? null : Number(row.resolvedAt),
				createdAt: Number(row.createdAt),
			})),
			comments: commentRows.map((row) => ({
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
	| { ok: true; threadId: string; commentId: string; pageId: string; newThread: boolean }
	| { ok: false; reason: CommentWriteRefusal['reason']; result: ToolResult }

/**
 * Posts `text` as `userId`, marked as an agent's, through the file's Durable Object — the one
 * place a comment can be written so that connected collaborators see it and it reaches Postgres.
 *
 * The object makes the access call itself, with the same query `hasReadAccessToFile` runs, so the
 * route doesn't ask Postgres first. An id the caller cannot see wakes an object, but it answers
 * not_found before it loads or stores anything.
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
		body: toRichText(text),
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
