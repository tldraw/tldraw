import { DB, MAX_NUMBER_OF_FILES } from '@tldraw/dotcom-shared'
import {
	CompiledQuery,
	DatabaseConnection,
	Kysely,
	PostgresAdapter,
	PostgresIntrospector,
	PostgresQueryCompiler,
	QueryResult,
} from 'kysely'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'

vi.mock('../../postgres', () => ({ createPostgresConnectionPool: vi.fn() }))

// The write goes through the real createFile mutator against a fake transaction, so these tests pin
// what gets inserted where rather than that some mocked mutator was called.
const inserts: Array<{ table: string; row: Record<string, unknown> }> = []
vi.mock('@rocicorp/zero/server/adapters/postgresjs', () => ({
	zeroPostgresJS: () => ({
		transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
			const insertInto = (table: string) => ({
				insert: async (row: Record<string, unknown>) => {
					inserts.push({ table, row })
				},
			})
			// The mutator reads in a fixed order: no existing file with this id, then the caller's
			// membership row (which it skips for the home workspace).
			const reads: unknown[] = [undefined, { role: 'member' }]
			return callback({
				location: 'server',
				run: async () => reads.shift(),
				mutate: {
					file: insertInto('file'),
					group_file: insertInto('group_file'),
					file_state: insertInto('file_state'),
				},
			})
		},
	}),
}))

const poke = vi.fn(async () => {})
vi.mock('../../utils/durableObjects', () => ({ getFileEffectProcessor: () => ({ poke }) }))

const { createPostgresConnectionPool } = await import('../../postgres')
const { createBoardForUser } = await import('./createBoard')

const env = { BOTCOM_POSTGRES_POOLED_CONNECTION_STRING: 'postgres://test' } as Environment

// A real Kysely on a driver that records the SQL and hands back queued result sets in order — the
// same harness searchBoards.test.ts uses. The first read is the workspaces, the second the count.
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

// Real-length ids: the mutator refuses anything outside 16–32 characters.
const USER_ID = 'user_2abcdefghijklmno'
const DESIGN_ID = 'group_design_000001'

const WORKSPACE_ROWS = [
	// The home workspace can come back with no group_user row, hence no role.
	{ id: USER_ID, name: 'My workspace', role: null },
	{ id: DESIGN_ID, name: 'Design', role: 'member' },
	// A role string the roles table does not know grants nothing, `addFiles` included.
	{ id: 'group_legacy_000001', name: 'Legacy', role: 'viewer' },
]

function makeCtx() {
	const waitUntil = vi.fn()
	return { ctx: { waitUntil } as unknown as ExecutionContext, waitUntil }
}

beforeEach(() => {
	inserts.length = 0
})

afterEach(() => vi.clearAllMocks())

describe('createBoardForUser', () => {
	it('creates the board in the personal workspace when none is named', async () => {
		mockPool([WORKSPACE_ROWS, [{ count: '3' }]])
		const { ctx, waitUntil } = makeCtx()

		const created = await createBoardForUser(
			env,
			USER_ID,
			{ name: 'Roadmap', workspace: null },
			ctx
		)

		expect(created).toMatchObject({
			ok: true,
			workspace: { id: USER_ID, name: 'My workspace', personal: true },
		})
		if (!created.ok) throw new Error('unreachable')
		expect(inserts.map((i) => i.table)).toEqual(['file', 'group_file', 'file_state'])
		expect(inserts[0].row).toMatchObject({
			id: created.boardId,
			name: 'Roadmap',
			owningGroupId: USER_ID,
			createSource: null,
		})
		expect(inserts[2].row).toMatchObject({ fileId: created.boardId, userId: USER_ID })
		expect(waitUntil).toHaveBeenCalledTimes(1)
		expect(poke).toHaveBeenCalledTimes(1)
	})

	it('creates the board in a named workspace the caller can add to', async () => {
		mockPool([WORKSPACE_ROWS, [{ count: '0' }]])
		const created = await createBoardForUser(env, USER_ID, {
			name: 'Roadmap',
			workspace: 'design',
		})
		expect(created).toMatchObject({ ok: true, workspace: { id: DESIGN_ID } })
		expect(inserts[0].row).toMatchObject({ owningGroupId: DESIGN_ID })
	})

	it('refuses a workspace the caller cannot add boards to', async () => {
		mockPool([WORKSPACE_ROWS])
		const created = await createBoardForUser(env, USER_ID, {
			name: 'Roadmap',
			workspace: 'Legacy',
		})
		expect(created).toMatchObject({ ok: false, reason: 'workspace_not_found' })
		expect(inserts).toEqual([])
	})

	it('refuses a workspace that is already at the file limit', async () => {
		mockPool([WORKSPACE_ROWS, [{ count: String(MAX_NUMBER_OF_FILES) }]])
		const created = await createBoardForUser(env, USER_ID, { name: 'Roadmap', workspace: null })
		expect(created).toMatchObject({ ok: false, reason: 'workspace_full' })
		expect(inserts).toEqual([])
	})

	it('reads only undeleted workspaces the caller belongs to, or their own', async () => {
		const { queries } = mockPool([WORKSPACE_ROWS, [{ count: '0' }]])
		await createBoardForUser(env, USER_ID, { name: 'Roadmap', workspace: null })
		expect(queries[0].sql).toContain('"group"."isDeleted" = $')
		expect(queries[0].parameters).toEqual([USER_ID, false, USER_ID, USER_ID])
		expect(queries[1].sql).toContain('"file"."owningGroupId" = $')
		expect(queries[1].parameters).toEqual([USER_ID, false])
	})
})
