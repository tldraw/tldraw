import { createBuilder, defineQueriesWithType, defineQueryWithType, Query } from '@rocicorp/zero'
import { schema, TlaSchema } from './tlaSchema'

const zql = createBuilder(schema)

/** Set server-side from the authenticated session; queries trust `userId`. */
export interface ZeroContext {
	userId: string
}

const defineQuery = defineQueryWithType<TlaSchema, ZeroContext>()
const defineQueries = defineQueriesWithType<TlaSchema>()

/**
 * The file-access gate: the user has opened the file (has a file_state) or belongs to a workspace
 * it's in. Ownership is checked separately by callers. Always applied directly under `exists('file')`
 * from the query root — see the depth note on the `reactions` query.
 */
const canAccessFile = (userId: string) => (file: Query<'file', TlaSchema>) =>
	file.where(({ or, exists }) =>
		or(
			exists('states', (s) => s.where('userId', '=', userId)),
			exists('groupFiles', (gf) =>
				gf.whereExists('groupMembers', (gm) => gm.where('userId', '=', userId))
			)
		)
	)

/** Upper bound on the comments notifications feed, so the synced set stays finite as files accrue. */
const RECENT_COMMENTS_LIMIT = 50

/** Bound on the reactions feed, counted in reacted-to comments — one row per comment of the
 *  caller's that someone else has reacted to, however many reactions it carries. */
export const REACTED_COMMENTS_LIMIT = 200

/**
 * Upper bound on the per-file @-mention roster of past viewers, so a heavily-viewed public board
 * doesn't stream an unbounded set to every collaborator. The composer's autocomplete only ever
 * shows a handful (see filterMentionMembers / MAX_SUGGESTIONS); this caps what reaches the client,
 * most-recent viewers first.
 */
const MENTIONABLE_VISITORS_LIMIT = 100

/** Synced queries; permissions are enforced here through `ctx.userId` (replacing definePermissions). */
export const queries = defineQueries({
	user: defineQuery(({ ctx }) => zql.user.where('id', '=', ctx.userId).one()),

	fileStates: defineQuery(({ ctx }) =>
		zql.file_state.where('userId', '=', ctx.userId).related('file', (file) => file.one())
	),

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
						exists('file', canAccessFile(ctx.userId))
					),
					// @-mentions the user, on a file they can access (opened it, or workspace member)
					and(
						exists('mentions', (m) => m.where('userId', '=', ctx.userId)),
						exists('file', canAccessFile(ctx.userId))
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
	 * The caller's own comments that someone else has reacted to, for the notifications feed's
	 * "reacted to your comment" entries. Uses the same access building blocks as {@link comments}
	 * (owner, file state, group membership). Ordering by reaction time is client-side:
	 * `buildReactionNotifications` stamps each entry with its newest foreign reaction and
	 * `mergeNotifications` sorts on it.
	 *
	 * Rooted at `comment`, *not* at `comment_reaction`, so the file-access gate sits one hop from
	 * the root exactly as it does in {@link comments}. Rooting at the reaction put the gate a hop
	 * deeper, the fileId correlation stopped being pushed into `file`'s `states`/`groupFiles`
	 * relations, and the query traversed those tables wholesale: ~150s to materialize in production
	 * with ~50 reaction rows, outrunning the 60s auth token so no client could finish a first sync.
	 * The cost is set by how deep the gate sits, not by how much comment data exists; the shape is
	 * pinned by `accessGateDepth` in queries.test.ts.
	 *
	 * Bounded to {@link REACTED_COMMENTS_LIMIT} by comment recency rather than reaction recency, so
	 * a reaction on a comment older than the window doesn't surface. The window counts only the
	 * caller's own reacted-to comments, so it's far slacker than the reaction-counted bound it
	 * replaced.
	 */
	reactions: defineQuery(({ ctx }) =>
		zql.comment
			.where('authorId', '=', ctx.userId)
			// soft-deleted comments and comments of soft-deleted threads stay in Postgres but must
			// never surface as notifications, same as in `comments`
			.where('isDeleted', '=', false)
			.whereExists('thread', (t) => t.where('isDeleted', '=', false))
			.whereExists('file', (f) => f.where('isDeleted', '=', false))
			// somebody else reacted — the entry's whole reason for existing. Without this the feed
			// would sync the caller's most recent comments whether or not anyone reacted
			.whereExists('reactions', (r) => r.where('userId', '!=', ctx.userId))
			// having authored a comment doesn't outlive access to the board it's on
			.where(({ or, exists }) =>
				or(
					exists('file', (f) => f.where('ownerId', '=', ctx.userId)),
					exists('file', canAccessFile(ctx.userId))
				)
			)
			.related('file', (file) => file.one())
			.related('thread', (thread) => thread.one())
			.related('read', (read) => read.where('userId', '=', ctx.userId).one())
			// every reaction incl. the caller's own: pills need exact counts and the own-reaction
			// highlight
			.related('reactions')
			.orderBy('createdAt', 'desc')
			.limit(REACTED_COMMENTS_LIMIT)
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
