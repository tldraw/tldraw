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
 * Real Kysely whose driver records SQL (incl. begin/commit/rollback) and returns the queued result
 * sets in order, then empty ones. Real, not a stub builder: the SQL itself (joins, `COLLATE "C"`)
 * is usually what's under test.
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
