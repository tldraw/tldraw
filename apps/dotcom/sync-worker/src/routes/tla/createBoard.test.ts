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

// The real createFile mutator runs against a fake Zero transaction wrapped around the recording
// Kysely transaction, so these tests pin what gets inserted where, and that every read shares the
// one connection and transaction.
const inserts: Array<{ table: string; row: Record<string, unknown> }> = []
vi.mock('@rocicorp/zero/server/adapters/kysely', () => ({
	zeroKysely: (_schema: unknown, db: Kysely<DB>) => ({
		transaction: (callback: (tx: unknown) => Promise<unknown>) =>
			db.transaction().execute((trx) => {
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
					dbTransaction: { wrappedTransaction: trx },
					mutate: {
						file: insertInto('file'),
						group_file: insertInto('group_file'),
						file_state: insertInto('file_state'),
					},
				})
			}),
	}),
}))

const poke = vi.fn(async () => {})
vi.mock('../../utils/durableObjects', () => ({ getFileEffectProcessor: () => ({ poke }) }))

const { createPostgresConnectionPool } = await import('../../postgres')
const { createBoardForUser } = await import('./createBoard')

const env = { BOTCOM_POSTGRES_POOLED_CONNECTION_STRING: 'postgres://test' } as Environment

// A real Kysely on a driver that records the SQL and hands back queued result sets in order — the
// same harness searchBoards.test.ts uses. The reads are the workspaces, the group row lock, then the
// count. Transaction boundaries are recorded as queries too, so a test can see what ran inside one.
function mockPool(resultSets: unknown[][]) {
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
	vi.mocked(createPostgresConnectionPool).mockReturnValue(db)
	return { queries, destroy }
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
		mockPool([WORKSPACE_ROWS, [], [{ count: '3' }]])
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
		mockPool([WORKSPACE_ROWS, [], [{ count: '0' }]])
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
		mockPool([WORKSPACE_ROWS, [], [{ count: String(MAX_NUMBER_OF_FILES) }]])
		const created = await createBoardForUser(env, USER_ID, { name: 'Roadmap', workspace: null })
		expect(created).toMatchObject({ ok: false, reason: 'workspace_full' })
		expect(inserts).toEqual([])
	})

	it('reads, locks and counts inside one transaction on one pool, then closes it', async () => {
		const { queries, destroy } = mockPool([WORKSPACE_ROWS, [], [{ count: '0' }]])
		await createBoardForUser(env, USER_ID, { name: 'Roadmap', workspace: null })

		expect(createPostgresConnectionPool).toHaveBeenCalledTimes(1)
		expect(queries.map((q) => q.sql.split(' ')[0])).toEqual([
			'begin',
			'select',
			'select',
			'select',
			'commit',
		])
		const [, workspaces, lock, count] = queries
		expect(workspaces.sql).toContain('"group"."isDeleted" = $')
		expect(workspaces.parameters).toEqual([USER_ID, false, USER_ID, USER_ID])
		expect(lock.sql).toMatch(/for no key update$/)
		expect(lock.parameters).toEqual([USER_ID])
		expect(count.sql).toContain('"file"."owningGroupId" = $')
		expect(count.parameters).toEqual([USER_ID, false])
		expect(destroy).toHaveBeenCalledTimes(1)
	})

	it('does not wake the outbox when nothing was created', async () => {
		mockPool([WORKSPACE_ROWS])
		const { ctx, waitUntil } = makeCtx()
		await createBoardForUser(env, USER_ID, { name: 'Roadmap', workspace: 'Nope' }, ctx)
		expect(waitUntil).not.toHaveBeenCalled()
	})
})
