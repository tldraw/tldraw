import { createBuilder, defineQueriesWithType, defineQueryWithType } from '@rocicorp/zero'
import { schema, TlaSchema } from './tlaSchema'

const zql = createBuilder(schema)

/** Context provided by server - contains authenticated user ID */
export interface QueryContext {
	userId: string
}

/** Typed defineQuery with schema and context */
const defineQuery = defineQueryWithType<TlaSchema, QueryContext>()

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

	/** Files the user can access: owned, shared via file_state, or via group membership */
	files: defineQuery(({ ctx }) =>
		zql.file.where(({ or, cmp, exists }) =>
			or(
				cmp('ownerId', '=', ctx.userId),
				exists('states', (q) => q.where('userId', '=', ctx.userId)),
				exists('groupFiles', (q) =>
					q.whereExists('groupMembers', (q) => q.where('userId', '=', ctx.userId))
				)
			)
		)
	),

	/** User's file states with related file data */
	fileStates: defineQuery(({ ctx }) =>
		zql.file_state.where('userId', '=', ctx.userId).related('file', (file) => file.one())
	),

	/** Groups the user is a member of */
	groups: defineQuery(({ ctx }) =>
		zql.group.whereExists('groupMembers', (q) => q.where('userId', '=', ctx.userId))
	),

	/** User's group memberships with related group, files, and members */
	groupUsers: defineQuery(({ ctx }) =>
		zql.group_user
			.where('userId', '=', ctx.userId)
			.related('group', (group) => group.one())
			.related('groupFiles', (gf) => gf.related('file', (file) => file.one()))
			.related('groupMembers')
	),

	/** Group files for groups the user is a member of */
	groupFiles: defineQuery(({ ctx }) =>
		zql.group_file.whereExists('groupMembers', (q) => q.where('userId', '=', ctx.userId))
	),

	/** User's fairy access info (single) */
	userFairies: defineQuery(({ ctx }) => zql.user_fairies.where('userId', '=', ctx.userId).one()),

	/** File fairy states for files the user can access */
	fileFairies: defineQuery(({ ctx }) => zql.file_fairies.where('userId', '=', ctx.userId)),
})

export type TlaQueries = typeof queries
