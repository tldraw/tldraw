import { DB } from '@tldraw/dotcom-shared'
import { Kysely, sql } from 'kysely'

/**
 * How many users still need the groups_frontend flag for `percentage` of all
 * users to have it. Computed from current db counts, so reruns are idempotent
 * and a higher percentage just tops up the difference.
 */
export function computeUsersToEnroll(
	totalUsers: number,
	unenrolledUsers: number,
	percentage: number
): number {
	const targetEnrolled = Math.floor((totalUsers * percentage) / 100)
	return Math.max(0, targetEnrolled - (totalUsers - unenrolledUsers))
}

export function buildEnrollUsersQuery(db: Kysely<DB>, userIds: string[]) {
	return db
		.updateTable('user')
		.set({
			flags: sql<string>`case when coalesce(flags, '') = '' then 'groups_frontend' else flags || ',groups_frontend' end`,
		})
		.where('id', 'in', userIds)
		.where((eb) => eb.or([eb('flags', 'not like', '%groups_frontend%'), eb('flags', 'is', null)]))
}

export async function enrollUsersInGroupsUi(db: Kysely<DB>, userIds: string[]): Promise<number> {
	if (userIds.length === 0) return 0
	const result = await buildEnrollUsersQuery(db, userIds).executeTakeFirst()
	return Number(result.numUpdatedRows)
}
