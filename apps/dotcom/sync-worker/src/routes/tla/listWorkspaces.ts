import { DB } from '@tldraw/dotcom-shared'
import { Kysely, sql } from 'kysely'
import { createPostgresConnectionPool } from '../../postgres'
import { Environment } from '../../types'
import { WorkspaceMembershipRow } from './boardTools'

// The database half of list_workspaces. The model-facing half — the tool definition and how the
// result is shaped — lives in boardTools.ts.

export async function listWorkspacesForUser(
	env: Environment,
	userId: string
): Promise<WorkspaceMembershipRow[]> {
	const db = createPostgresConnectionPool(env, 'sync-worker/listWorkspacesForUser')
	try {
		return await getWorkspaceMemberships(db, userId)
	} finally {
		await db.destroy()
	}
}

// Every workspace the caller belongs to, with their role in it. The home workspace is read by its id
// as well, and as its owner, the way the mutator's getRole treats it, because it can exist without a
// group_user row.
//
// Two index-served arms rather than one join filtered on `group_user."userId" = $1 OR "group".id = $1`:
// an OR across both sides of a left join can only be applied after the join, which walks every row of
// `group` — one per user. The home workspace usually comes back from both arms, so rows are deduped.
export async function getWorkspaceMemberships(
	db: Kysely<DB>,
	userId: string
): Promise<WorkspaceMembershipRow[]> {
	const rows = await db
		.selectFrom('group_user')
		.innerJoin('group', 'group.id', 'group_user.groupId')
		.select(['group.id', 'group.name', 'group_user.role'])
		.where('group_user.userId', '=', userId)
		.where('group.isDeleted', '=', false)
		.unionAll(
			db
				.selectFrom('group')
				.select(['group.id', 'group.name', sql<'owner'>`'owner'`.as('role')])
				.where('group.id', '=', userId)
				.where('group.isDeleted', '=', false)
		)
		.execute()

	const seen = new Set<string>()
	return rows.filter((row) => !seen.has(row.id) && seen.add(row.id))
}
