import { DB } from '@tldraw/dotcom-shared'
import {
	DummyDriver,
	Kysely,
	PostgresAdapter,
	PostgresIntrospector,
	PostgresQueryCompiler,
} from 'kysely'
import { describe, expect, it } from 'vitest'
import {
	buildEnrollUsersQuery,
	buildUnenrollUsersQuery,
	computeUsersToEnroll,
	computeUsersToUnenroll,
} from './workspacesUiRollout'

// Compiles queries without a database connection
const db = new Kysely<DB>({
	dialect: {
		createAdapter: () => new PostgresAdapter(),
		createDriver: () => new DummyDriver(),
		createIntrospector: (db) => new PostgresIntrospector(db),
		createQueryCompiler: () => new PostgresQueryCompiler(),
	},
})

describe('computeUsersToEnroll', () => {
	it('enrolls nobody at 0%', () => {
		expect(computeUsersToEnroll({ totalUsers: 100, unenrolledUsers: 100, percentage: 0 })).toBe(0)
	})

	it('enrolls everyone at 100%', () => {
		expect(computeUsersToEnroll({ totalUsers: 100, unenrolledUsers: 100, percentage: 100 })).toBe(
			100
		)
	})

	it('tops up to the target share', () => {
		// 100 already enrolled, target is 500
		expect(computeUsersToEnroll({ totalUsers: 1000, unenrolledUsers: 900, percentage: 50 })).toBe(
			400
		)
	})

	it('returns 0 when already at or above the target', () => {
		expect(computeUsersToEnroll({ totalUsers: 1000, unenrolledUsers: 500, percentage: 50 })).toBe(0)
		expect(computeUsersToEnroll({ totalUsers: 1000, unenrolledUsers: 100, percentage: 50 })).toBe(0)
	})

	it('floors fractional targets', () => {
		expect(computeUsersToEnroll({ totalUsers: 101, unenrolledUsers: 101, percentage: 50 })).toBe(50)
	})

	it('handles an empty database', () => {
		expect(computeUsersToEnroll({ totalUsers: 0, unenrolledUsers: 0, percentage: 100 })).toBe(0)
	})
})

describe('computeUsersToUnenroll', () => {
	it('unenrolls nobody when at or below the target', () => {
		expect(computeUsersToUnenroll({ totalUsers: 1000, unenrolledUsers: 500, percentage: 50 })).toBe(
			0
		)
		expect(computeUsersToUnenroll({ totalUsers: 1000, unenrolledUsers: 900, percentage: 50 })).toBe(
			0
		)
	})

	it('unenrolls down to the target share', () => {
		// 900 enrolled, target is 500
		expect(computeUsersToUnenroll({ totalUsers: 1000, unenrolledUsers: 100, percentage: 50 })).toBe(
			400
		)
	})

	it('unenrolls everyone at 0%', () => {
		expect(computeUsersToUnenroll({ totalUsers: 1000, unenrolledUsers: 0, percentage: 0 })).toBe(
			1000
		)
	})

	it('is mutually exclusive with enrolling', () => {
		const counts = { totalUsers: 1000, unenrolledUsers: 700, percentage: 30 }
		expect(computeUsersToEnroll(counts)).toBe(0)
		expect(computeUsersToUnenroll(counts)).toBe(0)
	})
})

describe('buildEnrollUsersQuery', () => {
	it('appends the flag and skips users that already have it', () => {
		const compiled = buildEnrollUsersQuery(db, ['user-1', 'user-2']).compile()

		expect(compiled.sql).toBe(
			`update "user" set "flags" = case when coalesce(flags, '') = '' then 'groups_frontend' else flags || ',groups_frontend' end where "id" in ($1, $2) and ("flags" not like $3 or "flags" is null)`
		)
		expect(compiled.parameters).toEqual(['user-1', 'user-2', '%groups_frontend%'])
	})
})

describe('buildUnenrollUsersQuery', () => {
	it('removes the flag and skips users that do not have it', () => {
		const compiled = buildUnenrollUsersQuery(db, ['user-1', 'user-2']).compile()

		expect(compiled.sql).toBe(
			`update "user" set "flags" = array_to_string(array_remove(array_remove(regexp_split_to_array(flags, '[,\\s]+'), 'groups_frontend'), ''), ',') where "id" in ($1, $2) and "flags" like $3`
		)
		expect(compiled.parameters).toEqual(['user-1', 'user-2', '%groups_frontend%'])
	})
})
