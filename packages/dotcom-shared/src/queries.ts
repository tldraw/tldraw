import { createBuilder, defineQueriesWithType, defineQueryWithType } from '@rocicorp/zero'
import { schema, TlaSchema } from './tlaSchema'

const zql = createBuilder(schema)

/** Context provided by server - contains authenticated user ID */
export interface ZeroContext {
	userId: string
}

/** Typed defineQuery with schema and context */
const defineQuery = defineQueryWithType<TlaSchema, ZeroContext>()

/** Typed defineQueries with schema */
const defineQueries = defineQueriesWithType<TlaSchema>()

/** Upper bound on the comments notifications feed, so the synced set stays finite as files accrue. */
const RECENT_COMMENTS_LIMIT = 50

/** Bound on the reactions feed, counted in reaction rows; the byline's "and N others" absorbs
 *  undercounts, but a comment with 200+ recent reactions can push every other comment's rows out
 *  of the window entirely, not just shrink a byline. */
export const RECENT_REACTIONS_LIMIT = 200

/**
 * Upper bound on the per-file @-mention roster of past viewers, so a heavily-viewed public board
 * doesn't stream an unbounded set to every collaborator. The composer's autocomplete only ever
 * shows a handful (see filterMentionMembers / MAX_SUGGESTIONS); this caps what reaches the client,
 * most-recent viewers first.
 */
const MENTIONABLE_VISITORS_LIMIT = 100

/**
 * Synced Queries with permission logic.
 * These replace the old definePermissions API.
 * Permissions are enforced via ctx.userId which is set server-side.
 */
export const queries = defineQueries({
	/** Current user's own record (single) */
	user: defineQuery(({ ctx }) => zql.user.where('id', '=', ctx.userId).one()),

	/** User's file states with related file data */
	fileStates: defineQuery(({ ctx }) =>
		zql.file_state.where('userId', '=', ctx.userId).related('file', (file) => file.one())
	),

	/** User's workspace memberships with related group, files, and members */
	workspaceMemberships: defineQuery(({ ctx }) =>
		zql.group_user
			.where('userId', '=', ctx.userId)
			.related('group', (group) => group.one())
			.related('groupFiles', (gf) => gf.related('file', (file) => file.one()))
			.related('groupMembers')
	),

	/**
	 * Recent comments that concern the current user, for the app-level notifications feed. Someone
	 * else's comment qualifies when it matches at least one of three categories:
	 *
	 * - it's on a file the user owns
	 * - it's in a thread the user is a part of (started, or has commented in) and on a file they
	 *   can still access — a reply
	 * - it `@`-mentions the user (via the `comment_mention` rows the file's Durable Object
	 *   extracts from the body, since mentions live inside rich-text JSON that ZQL can't reach),
	 *   provided the user can access the file: they have a file_state for it, or it belongs to a
	 *   workspace they're a member of. Ownership carries its own access evidence; replies and
	 *   mentions need an explicit current-access gate because historical thread participation can
	 *   outlive access to the file.
	 *
	 * "Reacted to your comment" entries come from the separate {@link reactions} query, not here.
	 *
	 * Filtering here (server-side) rather than on the client is what keeps out-of-category
	 * comments off the wire entirely. One gate stays client-side: `categorizeCommentNotifications`
	 * drops reply-category comments from before the user joined the thread (ZQL can't compare
	 * createdAt across correlated rows).
	 *
	 * Bounded to the most recent {@link RECENT_COMMENTS_LIMIT} so the synced set stays finite as a
	 * workspace ages, rather than growing without limit. This is a display feed — the canvas comment
	 * layer reads {@link fileComments} instead, which is scoped to one file and unbounded so every
	 * unread pin resolves regardless of age.
	 */
	comments: defineQuery(({ ctx }) =>
		zql.comment
			.where('authorId', '!=', ctx.userId)
			// soft-deleted comments and comments of soft-deleted threads stay in Postgres (see
			// TLComment.isDeleted) but must never surface as notifications
			.where('isDeleted', '=', false)
			.whereExists('thread', (t) => t.where('isDeleted', '=', false))
			// same for soft-deleted boards: their comment rows persist, but a notification would
			// navigate to a file the user can no longer open
			.whereExists('file', (f) => f.where('isDeleted', '=', false))
			.where(({ and, or, exists }) =>
				or(
					// on a board the user owns
					exists('file', (f) => f.where('ownerId', '=', ctx.userId)),
					// a reply: in a thread the user started or has commented in, on a file they
					// can still access
					and(
						exists('thread', (t) =>
							t.where(({ cmp, or, exists }) =>
								or(
									cmp('createdBy', '=', ctx.userId),
									// live comments only: soft-deleted rows persist, and deleting your
									// last comment in a thread must end the reply subscription with it
									exists('comments', (c) =>
										c.where('authorId', '=', ctx.userId).where('isDeleted', '=', false)
									)
								)
							)
						),
						exists('file', (f) =>
							f.where(({ or, exists }) =>
								or(
									exists('states', (s) => s.where('userId', '=', ctx.userId)),
									exists('groupFiles', (gf) =>
										gf.whereExists('groupMembers', (gm) => gm.where('userId', '=', ctx.userId))
									)
								)
							)
						)
					),
					// @-mentions the user, on a file they can access (opened it, or workspace member)
					and(
						exists('mentions', (m) => m.where('userId', '=', ctx.userId)),
						exists('file', (f) =>
							f.where(({ or, exists }) =>
								or(
									exists('states', (s) => s.where('userId', '=', ctx.userId)),
									exists('groupFiles', (gf) =>
										gf.whereExists('groupMembers', (gm) => gm.where('userId', '=', ctx.userId))
									)
								)
							)
						)
					)
				)
			)
			.related('file', (file) => file.one())
			// only the caller's own comments, so the client can tell when they joined the thread.
			// The client gate depends on this relation — a client shipped without a worker that
			// syncs it drops reply notifications for threads the user didn't start
			.related('thread', (thread) =>
				thread
					.one()
					.related('comments', (c) =>
						c.where('authorId', '=', ctx.userId).where('isDeleted', '=', false)
					)
			)
			// the caller's read receipt (at most one row: PK is (userId, commentId) and we filter
			// on userId); absent (for others' comments) = unread
			.related('read', (read) => read.where('userId', '=', ctx.userId).one())
			// every reaction to the comment, for the inert reaction pills on notification rows. A
			// comment's reactions are naturally few, so the set syncs unbounded
			.related('reactions')
			.orderBy('createdAt', 'desc')
			.limit(RECENT_COMMENTS_LIMIT)
	),

	/**
	 * Reactions to the user's comments, for the notifications feed. Rooted at comment_reaction and
	 * ordered by reaction time, not comment time, so a fresh reaction on an old comment still syncs.
	 * Access gates mirror the comments query; grouping into per-comment entries is client-side.
	 */
	reactions: defineQuery(({ ctx }) =>
		zql.comment_reaction
			.where('userId', '!=', ctx.userId)
			.whereExists('comment', (c) =>
				c
					.where('authorId', '=', ctx.userId)
					.where('isDeleted', '=', false)
					.whereExists('thread', (t) => t.where('isDeleted', '=', false))
					.whereExists('file', (f) =>
						f.where(({ and, cmp, or, exists }) =>
							and(
								cmp('isDeleted', '=', false),
								or(
									cmp('ownerId', '=', ctx.userId),
									exists('states', (s) => s.where('userId', '=', ctx.userId)),
									exists('groupFiles', (gf) =>
										gf.whereExists('groupMembers', (gm) => gm.where('userId', '=', ctx.userId))
									)
								)
							)
						)
					)
			)
			// the reacted-to comment, with what the notification row renders
			.related('comment', (c) =>
				c
					.one()
					.related('file', (f) => f.one())
					.related('thread', (t) => t.one())
					.related('read', (r) => r.where('userId', '=', ctx.userId).one())
					// every reaction incl. the caller's own: pills need exact counts and the own-reaction
					// highlight, which the window-capped feed rows can't provide
					.related('reactions')
			)
			.orderBy('createdAt', 'desc')
			.limit(RECENT_REACTIONS_LIMIT)
	),

	/**
	 * Every comment on a single file, for the canvas comment layer's read receipts and author-name
	 * resolution. Scoped to the file the user is viewing and access-checked against their file_state,
	 * and deliberately unbounded — one file's comments are naturally finite, and the canvas must
	 * resolve an unread pin for every comment however old. The cross-file feed uses {@link comments}.
	 */
	fileComments: defineQuery(({ ctx, args }: { ctx: ZeroContext; args: { fileId: string } }) =>
		zql.comment
			.where('fileId', '=', args.fileId)
			// soft-deleted comments and comments of soft-deleted threads stay in Postgres but
			// never reach the canvas layer
			.where('isDeleted', '=', false)
			.whereExists('thread', (t) => t.where('isDeleted', '=', false))
			.whereExists('file', (file) =>
				file.whereExists('states', (s) => s.where('userId', '=', ctx.userId))
			)
			.related('read', (read) => read.where('userId', '=', ctx.userId).one())
			// so the canvas can flag own comments with fresh foreign reactions as unread, and its
			// thread-view auto-mark-read can clear the reaction notification on view
			.related('reactions')
	),

	/**
	 * Everyone (besides the caller) who has opened a single file, for the comment composer's
	 * @-mention roster — so signed-in board viewers, not just workspace members, can be mentioned.
	 * Reads from file_visitor, a shareable projection of file_state maintained by Postgres triggers
	 * (migration 044): a deliberately separate table, because file_state also holds private per-user
	 * data (lastSessionState, visit timestamps) that whole-row sync would leak to every collaborator.
	 * A file_visitor row exists only for an authenticated user who opened the file, so this is
	 * inherently signed-in-only; anonymous visitors have none. Identity is denormalized onto the row,
	 * so no private user row is joined or synced.
	 *
	 * Access-gated exactly like {@link fileComments}: the viewer list is exposed only to someone who
	 * has themselves opened the file. Bounded to {@link MENTIONABLE_VISITORS_LIMIT} most-recent
	 * viewers so the synced set stays finite on heavily-viewed public boards.
	 */
	fileVisitors: defineQuery(({ ctx, args }: { ctx: ZeroContext; args: { fileId: string } }) =>
		zql.file_visitor
			.where('fileId', '=', args.fileId)
			.where('userId', '!=', ctx.userId)
			.whereExists('file', (file) =>
				file.whereExists('states', (s) => s.where('userId', '=', ctx.userId))
			)
			.orderBy('lastVisitAt', 'desc')
			.limit(MENTIONABLE_VISITORS_LIMIT)
	),
})

export type TlaQueries = typeof queries
