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
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'

vi.mock('../../postgres', () => ({ createPostgresConnectionPool: vi.fn() }))

const { createPostgresConnectionPool } = await import('../../postgres')
const { escapeLikePattern, searchAccessibleBoards, selectAccessibleGroupIds } =
	await import('./searchBoards')

const env = {} as Environment

/**
 * A real Kysely on a driver that records the SQL instead of sending it, and hands back the queued
 * result sets in order.
 *
 * Real rather than a stub builder because the thing under test *is* the SQL: whether the query
 * joins `file_state` decides whether the ordering can ever be index-served, and whether `id`
 * carries `COLLATE "C"` decides whether the database agrees with the JS comparator. Neither is
 * visible in a recording of which builder methods were called.
 */
function mockPool(resultSets: unknown[][]) {
	const queries: CompiledQuery[] = []
	const queued = [...resultSets]
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
				async beginTransaction() {},
				async commitTransaction() {},
				async rollbackTransaction() {},
				async releaseConnection() {},
				async destroy() {},
			}),
		},
	})
	vi.mocked(createPostgresConnectionPool).mockReturnValue(db)
	return { queries }
}

/** The file query is the second one; the first is the workspace-membership lookup. */
function fileQuery(queries: CompiledQuery[]) {
	return queries[1]
}

/** The caller's home group: its id is their user id, which is what makes a board theirs. */
const HOME_MEMBERSHIP = [{ groupId: 'user-1', role: 'owner' }]

const FILE_ROW = {
	id: 'board-1',
	name: 'Roadmap',
	createdAt: '1699999000000',
	updatedAt: '1700000000000',
	ownerName: 'My workspace',
	owningGroupId: 'user-1',
}

afterEach(() => vi.clearAllMocks())

// `%` and `_` are LIKE wildcards. A search for `%` that reached Postgres unescaped would match
// every board the caller has, which is the opposite of a search.
describe('escapeLikePattern', () => {
	it('escapes both wildcards and the escape character itself', () => {
		expect(escapeLikePattern('100%')).toBe('100\\%')
		expect(escapeLikePattern('a_b')).toBe('a\\_b')
		expect(escapeLikePattern('c:\\temp')).toBe('c:\\\\temp')
	})

	it('leaves an ordinary term alone', () => {
		expect(escapeLikePattern('roadmap')).toBe('roadmap')
	})
})

// Capability, never role name: `can` is the one place a role's meaning lives, and an unknown role
// string out of the database answers false rather than throwing.
describe('selectAccessibleGroupIds', () => {
	it('keeps roles that can access files', () => {
		expect(
			selectAccessibleGroupIds([
				{ groupId: 'g1', role: 'owner' },
				{ groupId: 'g2', role: 'member' },
			])
		).toEqual(['g1', 'g2'])
	})

	it('drops an unknown role rather than trusting it', () => {
		expect(selectAccessibleGroupIds([{ groupId: 'g3', role: 'spectator' }])).toEqual([])
	})
})

describe('searchAccessibleBoards', () => {
	// Since the groups model this is the only arm that returns a caller's own boards — their home
	// group's id is their user id. A home group flagged deleted therefore empties search entirely
	// while every other tool on this server keeps working, so the predicate has to be pinned.
	it('excludes deleted workspaces from the membership lookup', async () => {
		const { queries } = mockPool([HOME_MEMBERSHIP, []])
		await searchAccessibleBoards(env, 'user-1', { terms: [], cursor: null })
		expect(queries[0].sql).toContain('"group"."isDeleted" = $2')
		expect(queries[0].parameters).toEqual(['user-1', false])
	})

	it('asks for one row more than a page, newest created first', async () => {
		const { queries } = mockPool([HOME_MEMBERSHIP, [FILE_ROW]])
		await searchAccessibleBoards(env, 'user-1', { terms: [], cursor: null })
		expect(fileQuery(queries).sql).toContain(
			'order by "file"."createdAt" desc, file.id collate "C" desc limit'
		)
		expect(fileQuery(queries).parameters.at(-1)).toBe(21)
	})

	// The sort key has to come from `file` alone. A key read through a join can never be
	// index-ordered, so the join is what forced Postgres to materialise and sort the caller's whole
	// candidate set on every page — and `file_state` is also the table that would quietly widen the
	// scope to link-shared boards.
	it('reads the whole query from the file table, joining nothing', async () => {
		const { queries } = mockPool([HOME_MEMBERSHIP, []])
		await searchAccessibleBoards(env, 'user-1', { terms: [], cursor: null })
		expect(fileQuery(queries).sql).not.toContain('file_state')
		expect(fileQuery(queries).sql).not.toContain('join')
	})

	it('matches every term as an escaped, case-insensitive substring', async () => {
		const { queries } = mockPool([HOME_MEMBERSHIP, []])
		await searchAccessibleBoards(env, 'user-1', { terms: ['design', '50%'], cursor: null })
		expect(fileQuery(queries).sql).toContain('"file"."name" ilike $4 and "file"."name" ilike $5')
		expect(fileQuery(queries).parameters).toContain('%design%')
		expect(fileQuery(queries).parameters).toContain('%50\\%%')
	})

	// Test files need admin auth to read, so they are not the caller's to find. Filtered in SQL,
	// not after: filtering afterwards would let one consume a slot on the page.
	it('excludes deleted and test files in the query', async () => {
		const { queries } = mockPool([HOME_MEMBERSHIP, []])
		await searchAccessibleBoards(env, 'user-1', { terms: [], cursor: null })
		expect(fileQuery(queries).sql).toContain('"file"."isDeleted" = $1')
		expect(fileQuery(queries).sql).toContain('"file"."id" not like $2')
		expect(fileQuery(queries).parameters).toContain('test\\_%')
	})

	it('scopes to the workspaces the caller can access files in', async () => {
		const { queries } = mockPool([[{ groupId: 'g1', role: 'member' }], []])
		await searchAccessibleBoards(env, 'user-1', { terms: [], cursor: null })
		expect(fileQuery(queries).sql).toContain('"file"."owningGroupId" in ($3)')
		expect(fileQuery(queries).parameters).toContain('g1')
	})

	// `hasReadAccessToFile` has no `ownerId` branch since #10391, and a legacy row carrying one would
	// be found here and refused by every tool the model reached for next. It is also what kept the
	// ordering unindexable: a top-level `OR` makes Postgres answer with an unordered `BitmapOr`.
	it('mentions ownerId nowhere in the query', async () => {
		const { queries } = mockPool([HOME_MEMBERSHIP, []])
		await searchAccessibleBoards(env, 'user-1', { terms: [], cursor: null })
		expect(fileQuery(queries).sql).not.toContain('ownerId')
		expect(fileQuery(queries).sql).not.toContain(' or ')
	})

	// An `in ()` against an empty list is a SQL error, and a caller in no workspace can reach no
	// boards anyway, so there is nothing to ask Postgres.
	it('runs no file query when the caller is in no workspace', async () => {
		const { queries } = mockPool([[]])
		expect(await searchAccessibleBoards(env, 'user-1', { terms: [], cursor: null })).toEqual([])
		expect(queries).toHaveLength(1)
	})

	// Descending order means the next page is strictly *below* the cursor, and the tie arm is what
	// stops boards created in one batch, which share a createdAt, from being skipped or repeated
	// across a page boundary.
	it('seeks past the cursor rather than counting an offset', async () => {
		const { queries } = mockPool([HOME_MEMBERSHIP, []])
		await searchAccessibleBoards(env, 'user-1', {
			terms: [],
			cursor: { createdAt: 1_700_000_000_000, id: 'board-9' },
		})
		expect(fileQuery(queries).sql).toContain(
			'("file"."createdAt" < $4 or ("file"."createdAt" = $5 and file.id collate "C" < $6))'
		)
		expect(fileQuery(queries).parameters).toContain('board-9')
	})

	it('adds no cursor predicate on the first page', async () => {
		const { queries } = mockPool([HOME_MEMBERSHIP, []])
		await searchAccessibleBoards(env, 'user-1', { terms: [], cursor: null })
		expect(fileQuery(queries).sql).not.toContain('"file"."createdAt" <')
	})

	// `compareBoardSearchOrder` compares ids by UTF-16 code unit, and a tldraw id is drawn from
	// `A-Za-z0-9_-` — exactly where an ICU or glibc collation parts company with code-unit order.
	// Without the declared collation the eval harness pages differently from production.
	it('orders and seeks ids under the same collation the JS comparator uses', async () => {
		const { queries } = mockPool([HOME_MEMBERSHIP, []])
		await searchAccessibleBoards(env, 'user-1', {
			terms: [],
			cursor: { createdAt: 1, id: 'board-9' },
		})
		const sql = fileQuery(queries).sql
		expect(sql.match(/file\.id collate "C"/g)).toHaveLength(2)
	})

	// Both timestamps arrive from pg as strings, because they are int8 columns. Left as strings the
	// sort key would compare lexicographically and the cursor would encode a quoted number.
	it('returns the sort key and the edit time as numbers', async () => {
		mockPool([HOME_MEMBERSHIP, [FILE_ROW]])
		const rows = await searchAccessibleBoards(env, 'user-1', { terms: [], cursor: null })
		expect(rows).toEqual([
			{
				id: 'board-1',
				name: 'Roadmap',
				createdAt: 1_699_999_000_000,
				updatedAt: 1_700_000_000_000,
				workspaceName: 'My workspace',
				isPersonal: true,
			},
		])
	})

	// A board is the caller's own when its owning group is their home group, whose id is their user
	// id. `getBoardSearchResults` reports the workspace name only for the boards that are not.
	it('marks a board personal when its owning group is the caller', async () => {
		mockPool([
			HOME_MEMBERSHIP,
			[FILE_ROW, { ...FILE_ROW, id: 'board-2', owningGroupId: 'group-9' }],
		])
		const rows = await searchAccessibleBoards(env, 'user-1', { terms: [], cursor: null })
		expect(rows.map((row) => ({ id: row.id, isPersonal: row.isPersonal }))).toEqual([
			{ id: 'board-1', isPersonal: true },
			{ id: 'board-2', isPersonal: false },
		])
	})

	// The pool is per call, so a query that throws must still return its connection or pools pile
	// up in the isolate.
	it('destroys the pool even when the query throws', async () => {
		const destroy = vi.fn(async () => {})
		vi.mocked(createPostgresConnectionPool).mockReturnValue({
			selectFrom: () => {
				throw new Error('connection refused')
			},
			destroy,
		} as any)
		await expect(
			searchAccessibleBoards(env, 'user-1', { terms: [], cursor: null })
		).rejects.toThrow('connection refused')
		expect(destroy).toHaveBeenCalled()
	})
})
