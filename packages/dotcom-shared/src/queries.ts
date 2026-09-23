import {
	createBuilder,
	defineQueriesWithType,
	defineQueryWithType,
	ExpressionBuilder,
	Query,
} from '@rocicorp/zero'
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

/**
 * The file-access gate for comment-rooted queries: the caller has opened the comment's file
 * (file_state) or is in a workspace it belongs to (group_file → group_user; home included).
 * Correlated straight on the comment's fileId, not via `file`, and applied once at the root, so
 * Zero's planner can flip it and start from the caller's own rows. Over 9 EXISTS in a query
 * (MAX_FLIPPABLE_JOINS) the planner bails and it runs comment-first over every comment in the
 * database (tldraw-internal#2032).
 */
const canAccessCommentFile =
	(userId: string) =>
	({ or, exists }: ExpressionBuilder<'comment', TlaSchema>) =>
		or(
			exists('fileStates', (s) => s.where('userId', '=', userId)),
			exists('groupFiles', (gf) =>
				gf.whereExists('groupMembers', (gm) => gm.where('userId', '=', userId))
			)
		)

/** The access gate as the deprecated `comments` query reaches it, through `file`. */
const legacyCanAccessFile = (userId: string) => (file: Query<'file', TlaSchema>) =>
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
 * The notification feeds' common base: someone else's live comment, in a live thread, on a board
 * the caller can currently access. Access first and once — see {@link canAccessCommentFile}. It
 * also covers soft-deleted boards without a separate `file.isDeleted` check: deleting a file drops
 * its file_state and group_file rows (cleanup_deleted_file, migration 023).
 *
 * A feed whose reason lives on the thread passes it as `thread`, so it shares the one thread
 * EXISTS instead of adding a second: every EXISTS doubles the plans costed per hydration.
 */
const feedComments = (
	userId: string,
	thread?: (t: Query<'comment_thread', TlaSchema>) => Query<'comment_thread', TlaSchema>
) =>
	zql.comment
		.where('authorId', '!=', userId)
		// soft-deleted comments and comments of soft-deleted threads stay in Postgres (see
		// TLComment.isDeleted) but must never surface as notifications
		.where('isDeleted', '=', false)
		.where(canAccessCommentFile(userId))
		.whereExists('thread', (t) => {
			const live = t.where('isDeleted', '=', false)
			return thread ? thread(live) : live
		})

/** What a notification row needs alongside the comment, plus the feed's ordering and bound. */
const withFeedRelations = (query: ReturnType<typeof feedComments>, userId: string) =>
	query
		.related('file', (file) => file.one())
		// only the caller's own comments, so the client can tell when they joined the thread. The
		// client gate depends on this relation — a client shipped without a worker that syncs it
		// drops reply notifications for threads the user didn't start
		.related('thread', (thread) =>
			thread
				.one()
				.related('comments', (c) => c.where('authorId', '=', userId).where('isDeleted', '=', false))
		)
		// the caller's read receipt (at most one row: PK is (userId, commentId) and we filter on
		// userId); absent (for others' comments) = unread
		.related('read', (read) => read.where('userId', '=', userId).one())
		// every reaction to the comment, for the inert reaction pills on notification rows. A
		// comment's reactions are naturally few, so the set syncs unbounded
		.related('reactions')
		.orderBy('createdAt', 'desc')
		.limit(RECENT_COMMENTS_LIMIT)

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
	 * Recent comments that concern the current user, for the app-level notifications feed, in four
	 * feeds the client merges ({@link homeBoardComments}, {@link threadStarterComments},
	 * {@link threadParticipantComments}, {@link mentionComments}). Each takes someone else's live
	 * comment on a board the user can currently access ({@link canAccessCommentFile}: opened it, or
	 * a member of its workspace, home included) and adds one reason it concerns them. The gate is
	 * what keeps stale participation out: having replied in a thread, or been mentioned, doesn't
	 * outlive losing access to the board.
	 *
	 * One feed per reason rather than one query with an OR of reasons: a comment that qualifies only
	 * once a later row lands (its `comment_mention` row is written after the comment itself) is
	 * dropped by zero 1.9's union fan-in when the planner has flipped a branch of that OR, so it
	 * reached the feed only on reload. Each feed is a plain AND chain, which delivers it live.
	 *
	 * "Reacted to your comment" entries come from the separate {@link reactions} query, not here.
	 *
	 * Filtering here (server-side) rather than on the client is what keeps out-of-category
	 * comments off the wire entirely. One gate stays client-side: `categorizeCommentNotifications`
	 * drops reply-category comments from before the user joined the thread (ZQL can't compare
	 * createdAt across correlated rows).
	 *
	 * Each feed is bounded to the most recent {@link RECENT_COMMENTS_LIMIT} so the synced set stays
	 * finite as a workspace ages. This is a display feed — the canvas comment layer reads
	 * {@link fileComments} instead, which is scoped to one file and unbounded so every unread pin
	 * resolves regardless of age.
	 */
	homeBoardComments: defineQuery(({ ctx }) =>
		withFeedRelations(
			// on a board in the user's own home workspace (home group id === user id)
			feedComments(ctx.userId).whereExists('file', (f) =>
				f.where('owningGroupId', '=', ctx.userId)
			),
			ctx.userId
		)
	),

	/**
	 * A reply in a thread the user started. See {@link homeBoardComments}. Started and commented-in
	 * are two feeds rather than one OR inside the thread subquery: an OR there has no single seek,
	 * so the planner's cheapest plan walks every comment_thread row and the cost tracks total thread
	 * volume. Each half seeks from the caller's side: comment_thread(createdBy) via
	 * comment_thread_created_by_idx (migration 053) here, comment(authorId) via
	 * comment_author_id_idx in {@link threadParticipantComments}.
	 */
	threadStarterComments: defineQuery(({ ctx }) =>
		withFeedRelations(
			feedComments(ctx.userId, (t) => t.where('createdBy', '=', ctx.userId)),
			ctx.userId
		)
	),

	/**
	 * A reply in a thread the user has commented in. See {@link threadStarterComments}. Live
	 * comments only: soft-deleted rows persist, and deleting your last comment in a thread must
	 * end the reply subscription with it.
	 */
	threadParticipantComments: defineQuery(({ ctx }) =>
		withFeedRelations(
			feedComments(ctx.userId, (t) =>
				t.whereExists('comments', (c) =>
					c.where('authorId', '=', ctx.userId).where('isDeleted', '=', false)
				)
			),
			ctx.userId
		)
	),

	/**
	 * `@`-mentions the user, via the `comment_mention` rows the file's Durable Object extracts from
	 * the body (mentions live inside rich-text JSON that ZQL can't reach). See
	 * {@link homeBoardComments}.
	 */
	mentionComments: defineQuery(({ ctx }) =>
		withFeedRelations(
			feedComments(ctx.userId).whereExists('mentions', (m) => m.where('userId', '=', ctx.userId)),
			ctx.userId
		)
	),

	/**
	 * The caller's own comments that someone else has reacted to, for the notifications feed's
	 * "reacted to your comment" entries. Uses the same access building blocks as
	 * {@link homeBoardComments} (file state, group membership). Ordering by reaction time is
	 * client-side: `buildReactionNotifications` stamps each entry with its newest foreign reaction
	 * and `mergeNotifications` sorts on it.
	 *
	 * Rooted at `comment`, *not* at `comment_reaction`, so the access gate sits one hop from the
	 * root as in {@link feedComments}, where the fileId correlation is pushed into it. Any deeper and
	 * the gate walks file_state / group_file wholesale (hundreds of thousands of rows) however few
	 * reactions exist.
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
			// never surface as notifications, same as in the comment feeds
			.where('isDeleted', '=', false)
			.whereExists('thread', (t) => t.where('isDeleted', '=', false))
			// somebody else reacted — the entry's whole reason for existing. Without this the feed
			// would sync the caller's most recent comments whether or not anyone reacted
			.whereExists('reactions', (r) => r.where('userId', '!=', ctx.userId))
			// having authored a comment doesn't outlive access to the board it's on; soft-deleted
			// boards drop out here too, as in `feedComments`
			.where(canAccessCommentFile(ctx.userId))
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
	 * resolve an unread pin for every comment however old. The cross-file feeds are
	 * {@link homeBoardComments} and siblings.
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

	/**
	 * The notifications feed as the previous client bundle requests it, by this name. A tab that
	 * was open across the deploy keeps asking for `comments`; an unknown name is a per-query error
	 * on the server, which leaves that tab's feed empty with nothing prompting a reload. Kept for
	 * one release so those tabs behave exactly as before until they refresh. Not planned (14
	 * EXISTS), so excluded from the shape guards in queries.test.ts.
	 *
	 * @deprecated Remove in the release after the one that ships the per-reason feeds.
	 */
	comments: defineQuery(({ ctx }) =>
		zql.comment
			.where('authorId', '!=', ctx.userId)
			.where('isDeleted', '=', false)
			.whereExists('thread', (t) => t.where('isDeleted', '=', false))
			.whereExists('file', (f) => f.where('isDeleted', '=', false))
			.where(({ and, or, exists }) =>
				or(
					exists('file', (f) => f.where('owningGroupId', '=', ctx.userId)),
					and(
						exists('thread', (t) =>
							t.where(({ cmp, or, exists }) =>
								or(
									cmp('createdBy', '=', ctx.userId),
									exists('comments', (c) =>
										c.where('authorId', '=', ctx.userId).where('isDeleted', '=', false)
									)
								)
							)
						),
						exists('file', legacyCanAccessFile(ctx.userId))
					),
					and(
						exists('mentions', (m) => m.where('userId', '=', ctx.userId)),
						exists('file', legacyCanAccessFile(ctx.userId))
					)
				)
			)
			.related('file', (file) => file.one())
			.related('thread', (thread) =>
				thread
					.one()
					.related('comments', (c) =>
						c.where('authorId', '=', ctx.userId).where('isDeleted', '=', false)
					)
			)
			.related('read', (read) => read.where('userId', '=', ctx.userId).one())
			.related('reactions')
			.orderBy('createdAt', 'desc')
			.limit(RECENT_COMMENTS_LIMIT)
	),
})

export type TlaQueries = typeof queries
