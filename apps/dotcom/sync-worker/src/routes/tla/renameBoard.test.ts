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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { RENAME_BOARD_FORBIDDEN_MESSAGE, RENAME_BOARD_NOT_FOUND_MESSAGE } from './boardTools'

vi.mock('../../postgres', () => ({ createPostgresConnectionPool: vi.fn() }))

// The real file.update mutator runs against a fake Zero transaction wrapped around the recording
// Kysely transaction, the same way createBoard.test.ts drives createFile.
const updates: Array<Record<string, unknown>> = []
let mutatorReads: unknown[] = []
vi.mock('@rocicorp/zero/server/adapters/kysely', () => ({
	zeroKysely: (_schema: unknown, db: Kysely<DB>) => ({
		transaction: (callback: (tx: unknown) => Promise<unknown>) =>
			db.transaction().execute((trx) =>
				callback({
					location: 'server',
					run: async () => mutatorReads.shift(),
					dbTransaction: { wrappedTransaction: trx },
					mutate: {
						file: {
							update: async (row: Record<string, unknown>) => {
								updates.push(row)
							},
						},
					},
				})
			),
	}),
}))

const poke = vi.fn(async () => {})
vi.mock('../../utils/durableObjects', () => ({ getFileEffectProcessor: () => ({ poke }) }))

const { createPostgresConnectionPool } = await import('../../postgres')
const { renameBoardForUser } = await import('./renameBoard')

const env = { BOTCOM_POSTGRES_POOLED_CONNECTION_STRING: 'postgres://test' } as Environment

// A real Kysely on a driver that records the SQL and hands back queued result sets in order.
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

const USER_ID = 'user_2abcdefghijklmno'
const DESIGN_ID = 'group_design_000001'
const BOARD_ID = 'board_abcdefghijklm'

// What the mutator's own reads return: the file, then (outside the home workspace) the caller's
// group_user row.
function fileRecord(owningGroupId: string) {
	return { id: BOARD_ID, name: 'Old', owningGroupId, shared: true, isDeleted: false }
}

function makeCtx() {
	const waitUntil = vi.fn()
	return { ctx: { waitUntil } as unknown as ExecutionContext, waitUntil }
}

function errorText(outcome: Awaited<ReturnType<typeof renameBoardForUser>>) {
	if (outcome.ok) throw new Error('Expected a refusal')
	const block = outcome.result.content[0]
	if (block.type !== 'text') throw new Error('Expected a text block')
	return block.text
}

beforeEach(() => {
	updates.length = 0
	mutatorReads = []
})

afterEach(() => vi.clearAllMocks())

describe('renameBoardForUser', () => {
	it('renames a board in the personal workspace and wakes the outbox', async () => {
		mockPool([[{ name: 'Old', shared: false, owningGroupId: USER_ID, role: null }]])
		mutatorReads = [fileRecord(USER_ID)]
		const { ctx, waitUntil } = makeCtx()

		const renamed = await renameBoardForUser(
			env,
			USER_ID,
			{ boardId: BOARD_ID, name: 'Roadmap' },
			ctx
		)

		expect(renamed).toEqual({ ok: true, previousName: 'Old' })
		expect(updates).toEqual([{ id: BOARD_ID, name: 'Roadmap' }])
		expect(waitUntil).toHaveBeenCalledTimes(1)
		expect(poke).toHaveBeenCalledTimes(1)
	})

	it('renames a board owned by a workspace the caller belongs to', async () => {
		mockPool([[{ name: 'Old', shared: false, owningGroupId: DESIGN_ID, role: 'member' }]])
		mutatorReads = [fileRecord(DESIGN_ID), { role: 'member' }]
		const renamed = await renameBoardForUser(env, USER_ID, { boardId: BOARD_ID, name: 'Roadmap' })
		expect(renamed).toEqual({ ok: true, previousName: 'Old' })
		expect(updates).toEqual([{ id: BOARD_ID, name: 'Roadmap' }])
	})

	it('reads a missing or deleted board as not found', async () => {
		mockPool([[]])
		const renamed = await renameBoardForUser(env, USER_ID, { boardId: BOARD_ID, name: 'Roadmap' })
		expect(renamed).toMatchObject({ ok: false, reason: 'board_not_found' })
		expect(errorText(renamed)).toBe(RENAME_BOARD_NOT_FOUND_MESSAGE)
		expect(updates).toEqual([])
	})

	// Telling "exists but not yours" from "does not exist" would let ids be probed for existence.
	it('reads a private board in someone else’s workspace as not found', async () => {
		mockPool([[{ name: 'Old', shared: false, owningGroupId: DESIGN_ID, role: null }]])
		const renamed = await renameBoardForUser(env, USER_ID, { boardId: BOARD_ID, name: 'Roadmap' })
		expect(renamed).toMatchObject({ ok: false, reason: 'board_not_found' })
		expect(updates).toEqual([])
	})

	it('refuses a board only shared with the caller, and says why', async () => {
		mockPool([[{ name: 'Old', shared: true, owningGroupId: DESIGN_ID, role: null }]])
		const { ctx, waitUntil } = makeCtx()
		const renamed = await renameBoardForUser(
			env,
			USER_ID,
			{ boardId: BOARD_ID, name: 'Roadmap' },
			ctx
		)
		expect(renamed).toMatchObject({ ok: false, reason: 'rename_forbidden' })
		expect(errorText(renamed)).toBe(RENAME_BOARD_FORBIDDEN_MESSAGE)
		expect(updates).toEqual([])
		expect(waitUntil).not.toHaveBeenCalled()
	})

	it('reads access inside one transaction on one pool, then closes it', async () => {
		const { queries, destroy } = mockPool([
			[{ name: 'Old', shared: false, owningGroupId: USER_ID, role: null }],
		])
		mutatorReads = [fileRecord(USER_ID)]
		await renameBoardForUser(env, USER_ID, { boardId: BOARD_ID, name: 'Roadmap' })

		expect(createPostgresConnectionPool).toHaveBeenCalledTimes(1)
		expect(queries.map((q) => q.sql.split(' ')[0])).toEqual(['begin', 'select', 'commit'])
		expect(queries[1].sql).toContain('left join "group_user"')
		expect(queries[1].parameters).toEqual([USER_ID, BOARD_ID, false])
		expect(destroy).toHaveBeenCalledTimes(1)
	})
})
