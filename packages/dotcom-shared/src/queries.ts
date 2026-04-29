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

	/** User's group memberships with related group, files, and members */
	groupUsers: defineQuery(({ ctx }) =>
		zql.group_user
			.where('userId', '=', ctx.userId)
			.related('group', (group) => group.one())
			.related('groupFiles', (gf) => gf.related('file', (file) => file.one()))
			.related('groupMembers')
	),
})

export type TlaQueries = typeof queries
