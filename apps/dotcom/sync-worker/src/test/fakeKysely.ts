import { DB } from '@tldraw/dotcom-shared'
import {
	CompiledQuery,
	DatabaseConnection,
	Kysely,
	PostgresAdapter,
	PostgresIntrospector,
	PostgresQueryCompiler,
	QueryResult,
} from 'kysely'
import { vi } from 'vitest'

/**
 * A real Kysely on a driver that records the SQL instead of sending it, and hands back the queued
 * result sets in order (then empty ones). Transaction boundaries are recorded as `begin` / `commit`
 * / `rollback` queries so a test can see what ran inside one.
 *
 * Real rather than a stub builder because the thing under test is usually the SQL itself: which
 * tables a query joins, or whether a column carries `COLLATE "C"`, isn't visible in a recording of
 * which builder methods were called.
 */
export function createFakeKysely(resultSets: unknown[][] = []) {
	const queries: CompiledQuery[] = []
	const queued = [...resultSets]
	const destroy = vi.fn(async () => {})
	const connection: DatabaseConnection = {
		async executeQuery<R>(compiled: CompiledQuery<unknown>): Promise<QueryResult<R>> {
			queries.push(compiled)
			return { rows: (queued.shift() ?? []) as R[] }
		},
		async *streamQuery() {},
	}
	const db = new Kysely<DB>({
		dialect: {
			createAdapter: () => new PostgresAdapter(),
			createIntrospector: (instance) => new PostgresIntrospector(instance),
			createQueryCompiler: () => new PostgresQueryCompiler(),
			createDriver: () => ({
				async init() {},
				async acquireConnection() {
					return connection
				},
				async beginTransaction() {
					queries.push(CompiledQuery.raw('begin'))
				},
				async commitTransaction() {
					queries.push(CompiledQuery.raw('commit'))
				},
				async rollbackTransaction() {
					queries.push(CompiledQuery.raw('rollback'))
				},
				async releaseConnection() {},
				destroy,
			}),
		},
	})
	return { db, queries, destroy }
}
