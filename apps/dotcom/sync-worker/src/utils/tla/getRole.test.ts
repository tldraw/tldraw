import { DB } from '@tldraw/dotcom-shared'
import {
	CompiledQuery,
	DatabaseConnection,
	Kysely,
	PostgresAdapter,
	PostgresIntrospector,
	PostgresQueryCompiler,
} from 'kysely'
import { describe, expect, it } from 'vitest'
import { getFileRecordWithRole } from './getRole'

function makeDb(rows: Record<string, unknown>[]) {
	const queries: CompiledQuery[] = []
	const connection: DatabaseConnection = {
		async executeQuery(query: CompiledQuery) {
			queries.push(query)
			return { rows } as any
		},
		streamQuery() {
			throw new Error('not implemented')
		},
	}
	const db = new Kysely<DB>({
		dialect: {
			createAdapter: () => new PostgresAdapter(),
			createDriver: () => ({
				init: async () => {},
				acquireConnection: async () => connection,
				beginTransaction: async () => {},
				commitTransaction: async () => {},
				rollbackTransaction: async () => {},
				releaseConnection: async () => {},
				destroy: async () => {},
			}),
			createIntrospector: (db) => new PostgresIntrospector(db),
			createQueryCompiler: () => new PostgresQueryCompiler(),
		},
	})
	return { db, queries }
}

describe('getFileRecordWithRole', () => {
	it('resolves the role in the same query, correlated on the owning group', async () => {
		const { db, queries } = makeDb([])
		await getFileRecordWithRole(db, 'file1', 'user1')
		expect(queries).toHaveLength(1)
		expect(queries[0].sql).toBe(
			'select "file".*, (select "group_user"."role" from "group_user" where "group_user"."groupId" = "file"."owningGroupId" and "group_user"."userId" = $1) as "role" from "file" where "file"."id" = $2'
		)
		expect(queries[0].parameters).toEqual(['user1', 'file1'])
	})

	it('splits the role off the file row', async () => {
		const { db } = makeDb([{ id: 'file1', owningGroupId: 'group1', role: 'admin' }])
		expect(await getFileRecordWithRole(db, 'file1', 'user1')).toEqual({
			file: { id: 'file1', owningGroupId: 'group1' },
			role: 'admin',
		})
	})

	it('returns a null role for non-members', async () => {
		const { db } = makeDb([{ id: 'file1', owningGroupId: 'group1', role: null }])
		expect(await getFileRecordWithRole(db, 'file1', 'user1')).toEqual({
			file: { id: 'file1', owningGroupId: 'group1' },
			role: null,
		})
	})

	it('returns null when the file row is missing', async () => {
		const { db } = makeDb([])
		expect(await getFileRecordWithRole(db, 'file1', 'user1')).toBeNull()
	})
})
