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
	 * Recent comments that concern the current user, for the app-level notifications feed. A
	 * comment qualifies when it isn't the user's own and matches at least one of three categories:
	 *
	 * - it's on a file the user owns
	 * - it's in a thread the user is a part of (started, or has commented in) — a reply
	 * - it `@`-mentions the user (via the `comment_mention` rows the file's Durable Object
	 *   extracts from the body, since mentions live inside rich-text JSON that ZQL can't reach),
	 *   provided the user can access the file: they have a file_state for it, or it belongs to a
	 *   workspace they're a member of. The other two categories carry their own access evidence
	 *   (ownership; having commented), so only mentions need the explicit gate.
	 *
	 * Filtering here (server-side) rather than on the client is what keeps out-of-category
	 * comments off the wire entirely — the unread badge is a pure function of the synced set.
	 *
	 * Bounded to the most recent {@link RECENT_COMMENTS_LIMIT} so the synced set stays finite as a
	 * workspace ages, rather than growing without limit. This is a display feed — the canvas comment
	 * layer reads {@link fileComments} instead, which is scoped to one file and unbounded so every
	 * unread pin resolves regardless of age.
	 */
	comments: defineQuery(({ ctx }) =>
		zql.comment
			.where('authorId', '!=', ctx.userId)
			.where(({ and, or, exists }) =>
				or(
					// on a board the user owns
					exists('file', (f) => f.where('ownerId', '=', ctx.userId)),
					// a reply: in a thread the user started or has commented in
					exists('thread', (t) =>
						t.where(({ cmp, or, exists }) =>
							or(
								cmp('createdBy', '=', ctx.userId),
								exists('comments', (c) => c.where('authorId', '=', ctx.userId))
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
			.related('author', (author) => author.one())
			.related('file', (file) => file.one())
			.related('thread', (thread) => thread.one())
			// the caller's read receipt (at most one row: PK is (userId, commentId) and we filter
			// on userId); absent (for others' comments) = unread
			.related('read', (read) => read.where('userId', '=', ctx.userId).one())
			.orderBy('createdAt', 'desc')
			.limit(RECENT_COMMENTS_LIMIT)
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
			.whereExists('file', (file) =>
				file.whereExists('states', (s) => s.where('userId', '=', ctx.userId))
			)
			.related('author', (author) => author.one())
			.related('read', (read) => read.where('userId', '=', ctx.userId).one())
	),
})

export type TlaQueries = typeof queries
