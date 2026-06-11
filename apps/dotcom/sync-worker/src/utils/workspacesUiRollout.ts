import { DB } from '@tldraw/dotcom-shared'
import { Kysely, sql } from 'kysely'

/**
 * How many users still need the groups_frontend flag for `percentage` of all
 * users to have it. Computed from current db counts, so reruns are idempotent
 * and a higher percentage just tops up the difference.
 */
export function computeUsersToEnroll({
	totalUsers,
	unenrolledUsers,
	percentage,
}: {
	totalUsers: number
	unenrolledUsers: number
	percentage: number
}): number {
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

export async function enrollUsersInWorkspacesUi(
	db: Kysely<DB>,
	userIds: string[]
): Promise<number> {
	if (userIds.length === 0) return 0
	const result = await buildEnrollUsersQuery(db, userIds).executeTakeFirst()
	return Number(result.numUpdatedRows)
}

/**
 * How many users must lose the groups_frontend flag to get back down to
 * `percentage` of all users. Zero when at or below the target.
 */
export function computeUsersToUnenroll({
	totalUsers,
	unenrolledUsers,
	percentage,
}: {
	totalUsers: number
	unenrolledUsers: number
	percentage: number
}): number {
	const targetEnrolled = Math.floor((totalUsers * percentage) / 100)
	return Math.max(0, totalUsers - unenrolledUsers - targetEnrolled)
}

export function buildUnenrollUsersQuery(db: Kysely<DB>, userIds: string[]) {
	return db
		.updateTable('user')
		.set({
			// Rebuild the list minus the flag — handles comma and space
			// separators and normalizes to commas
			flags: sql<string>`array_to_string(array_remove(array_remove(regexp_split_to_array(flags, '[,\\s]+'), 'groups_frontend'), ''), ',')`,
		})
		.where('id', 'in', userIds)
		.where('flags', 'like', '%groups_frontend%')
}

export async function unenrollUsersFromWorkspacesUi(
	db: Kysely<DB>,
	userIds: string[]
): Promise<number> {
	if (userIds.length === 0) return 0
	const result = await buildUnenrollUsersQuery(db, userIds).executeTakeFirst()
	return Number(result.numUpdatedRows)
}
