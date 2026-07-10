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
	 * Comments on files the current user can access, for the app-level /comments view. Access is
	 * scoped to files the user has a file_state for (i.e. has opened/owns), mirroring the fileStates
	 * query. The in-document view reads comments from the tldraw file room, not this query. (Group
	 * files the user hasn't opened are out of scope for now.)
	 */
	comments: defineQuery(({ ctx }) =>
		zql.comment
			.whereExists('file', (file) =>
				file.whereExists('states', (s) => s.where('userId', '=', ctx.userId))
			)
			.related('author', (author) => author.one())
			.related('file', (file) => file.one())
			.related('thread', (thread) => thread.one())
			// only the caller's read receipts; reads.length === 0 (for others' comments) = unread
			.related('reads', (reads) => reads.where('userId', '=', ctx.userId))
	),
})

export type TlaQueries = typeof queries
