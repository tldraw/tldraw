import { jsonArrayFrom } from 'kysely/helpers/postgres'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { getRoomDurableObject } from '../../utils/durableObjects'
import { hasReadAccessToFile } from '../../utils/tla/getAuth'
import {
	CommentRow,
	CommentTarget,
	CommentThreadRow,
	CommentWriteRefusal,
	ToolResult,
	buildAgentCommentBody,
	getCommentRefusalMessage,
	toolError,
} from './boardTools'

/**
 * One page's live comment threads and their live comments, in one statement.
 *
 * Read from Postgres rather than the file's Durable Object: the object would have to boot the room
 * to answer, and Postgres is the comment lane's durable store, a drain behind the room at most —
 * which write_comment waits out for its own comments.
 */
export async function readPageCommentRows(
	env: Environment,
	fileId: string,
	pageId: string
): Promise<{ threads: CommentThreadRow[]; comments: CommentRow[] }> {
	const db = createPostgresConnectionPool(env, 'sync-worker/readPageCommentRows')
	try {
		const { threadRows, commentRows } = await db
			.selectNoFrom((eb) => [
				jsonArrayFrom(
					eb
						.selectFrom('comment_thread')
						.select(['id', 'anchor', 'resolvedAt', 'createdAt'])
						.where('fileId', '=', fileId)
						.where('pageId', '=', pageId)
						.where('isDeleted', '=', false)
				).as('threadRows'),
				// By thread rather than by the comment's own pageId, which is denormalized from it.
				jsonArrayFrom(
					eb
						.selectFrom('comment')
						.select(['id', 'threadId', 'authorId', 'authorName', 'body', 'createdAt'])
						.where('fileId', '=', fileId)
						.where('isDeleted', '=', false)
						.where('threadId', 'in', (sub) =>
							sub
								.selectFrom('comment_thread')
								.select('id')
								.where('fileId', '=', fileId)
								.where('pageId', '=', pageId)
								.where('isDeleted', '=', false)
						)
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
 * Posts `text` as `userId`, under the agent header, through the file's Durable Object — the one
 * place a comment can be written so that connected collaborators see it and it reaches Postgres.
 *
 * The read access check runs first so an id the caller cannot see never wakes an object, and reads
 * as missing the way it does for every other tool. Whether they may *comment* is the object's call.
 */
export async function writeCommentForUser(
	env: Environment,
	userId: string,
	{ boardId, text, target }: { boardId: string; text: string; target: CommentTarget }
): Promise<WriteCommentOutcome> {
	const access = await hasReadAccessToFile(env, userId, boardId)
	if (!access.ok) return refused({ reason: 'not_found' })

	const written = await getRoomDurableObject(env, boardId).writeMcpComment({
		fileId: boardId,
		userId,
		body: buildAgentCommentBody(text),
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
