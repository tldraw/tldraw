import { DB } from '@tldraw/dotcom-shared'
import {
	DummyDriver,
	Kysely,
	PostgresAdapter,
	PostgresIntrospector,
	PostgresQueryCompiler,
} from 'kysely'
import { describe, expect, it } from 'vitest'
import { buildEnrollUsersQuery, computeUsersToEnroll } from './groupsUiRollout'

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
		expect(computeUsersToEnroll(100, 100, 0)).toBe(0)
	})

	it('enrolls everyone at 100%', () => {
		expect(computeUsersToEnroll(100, 100, 100)).toBe(100)
	})

	it('tops up to the target share', () => {
		// 100 already enrolled, target is 500
		expect(computeUsersToEnroll(1000, 900, 50)).toBe(400)
	})

	it('returns 0 when already at or above the target', () => {
		expect(computeUsersToEnroll(1000, 500, 50)).toBe(0)
		expect(computeUsersToEnroll(1000, 100, 50)).toBe(0)
	})

	it('floors fractional targets', () => {
		expect(computeUsersToEnroll(101, 101, 50)).toBe(50)
	})

	it('handles an empty database', () => {
		expect(computeUsersToEnroll(0, 0, 100)).toBe(0)
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
