import { afterEach, describe, expect, it, vi } from 'vitest'
import { Environment } from '../../types'
import { hasReadAccessToFile } from './getAuth'

vi.mock('../../postgres', () => ({ createPostgresConnectionPool: vi.fn() }))
vi.mock('./getRole', () => ({ getRole: vi.fn() }))

const { createPostgresConnectionPool } = await import('../../postgres')
const { getRole } = await import('./getRole')

const env = {} as Environment
const destroy = vi.fn(async () => {})

interface FileRow {
	id: string
	ownerId: string
	owningGroupId: string | null
	shared: boolean
	isDeleted: boolean
}

// What the stub was actually asked, so the query itself can be asserted rather than assumed. Without
// this the stub discards its arguments: change the predicate to `where('ownerId', '=', fileId)` and
// every case below still passes while the check reads the wrong row entirely.
let lastQuery: { table?: string; columns?: unknown; where?: unknown[] } = {}

// Stubs `pool.selectFrom('file').select(...).where(...).executeTakeFirst()` plus `pool.destroy()`.
function mockFileRow(row: Partial<FileRow> | undefined) {
	const value: FileRow | undefined = row && {
		id: 'file-1',
		ownerId: 'owner',
		owningGroupId: null,
		shared: false,
		isDeleted: false,
		...row,
	}
	lastQuery = {}
	vi.mocked(createPostgresConnectionPool).mockReturnValue({
		selectFrom: (table: string) => {
			lastQuery.table = table
			return {
				select: (columns: unknown) => {
					lastQuery.columns = columns
					return {
						where: (...args: unknown[]) => {
							lastQuery.where = args
							return { executeTakeFirst: async () => value }
						},
					}
				},
			}
		},
		destroy,
	} as any)
}

afterEach(() => vi.clearAllMocks())

const granted = (id = 'file-1') => ({
	ok: true,
	file: { id, shared: expect.any(Boolean), isDeleted: false },
})
const DENIED = { ok: false }

// The read-side counterpart of requireWriteAccessToFile, and what the MCP server's per-user gate is
// built on. It answers with a boolean rather than throwing a status error, because a caller that
// supplies the file id must not be able to tell "no such file" from "not yours".
describe('hasReadAccessToFile', () => {
	// The decision table below is only worth anything if the row it decides on is the right one, and
	// the stub cannot tell: it returns the same value whatever it is asked. Asserted once, here.
	it('reads the named file, by id', async () => {
		mockFileRow({ ownerId: 'user-1' })
		await hasReadAccessToFile(env, 'user-1', 'file-1')

		expect(lastQuery.table).toBe('file')
		expect(lastQuery.where).toEqual(['id', '=', 'file-1'])
		// Every column the decision below reads, plus the id handed back to the caller.
		expect(lastQuery.columns).toEqual(['id', 'owningGroupId', 'shared', 'isDeleted'])
	})

	// Unlike the write check, `sharedLinkType` is irrelevant: a link shared for editing is also one
	// that can be viewed, and this only ever grants viewing.
	it('admits anyone for a link-shared file, whatever the link type', async () => {
		mockFileRow({ ownerId: 'someone-else', shared: true })
		expect(await hasReadAccessToFile(env, 'user-1', 'file-1')).toEqual(granted())
	})

	it('admits a group member who can access the group’s files', async () => {
		mockFileRow({ ownerId: 'someone-else', owningGroupId: 'group-1' })
		vi.mocked(getRole).mockResolvedValue('member' as any)
		expect(await hasReadAccessToFile(env, 'user-1', 'file-1')).toEqual(granted())
	})

	it('refuses a group member whose role cannot access files', async () => {
		mockFileRow({ ownerId: 'someone-else', owningGroupId: 'group-1' })
		vi.mocked(getRole).mockResolvedValue(null as any)
		expect(await hasReadAccessToFile(env, 'user-1', 'file-1')).toEqual(DENIED)
	})

	it('refuses a stranger’s unshared file', async () => {
		mockFileRow({ ownerId: 'someone-else' })
		expect(await hasReadAccessToFile(env, 'user-1', 'file-1')).toEqual(DENIED)
	})

	it('refuses a file that does not exist', async () => {
		mockFileRow(undefined)
		expect(await hasReadAccessToFile(env, 'user-1', 'nope')).toEqual(DENIED)
	})

	// Checked before workspace access, so a soft-deleted board stops being readable for the members
	// of its own workspace too — the board is in the trash, and a screenshot of it is not something
	// to serve out of the MCP tools.
	it('refuses a deleted file even for a workspace member', async () => {
		mockFileRow({ owningGroupId: 'group-1', isDeleted: true })
		vi.mocked(getRole).mockResolvedValue('member' as any)
		expect(await hasReadAccessToFile(env, 'user-1', 'file-1')).toEqual(DENIED)
	})

	// Handed back so the resolution that follows can re-apply the gate to it rather than dialling
	// Postgres again for a strict subset of the same columns.
	it('hands back the row it read', async () => {
		mockFileRow({ ownerId: 'user-1', shared: true })
		expect(await hasReadAccessToFile(env, 'user-1', 'file-1')).toEqual({
			ok: true,
			file: { id: 'file-1', shared: true, isDeleted: false },
		})
	})

	// createPostgresConnectionPool news up a pg.Pool per call, so a leaked one accumulates in the
	// isolate across every MCP resolve.
	it('closes the pool on both outcomes', async () => {
		mockFileRow({ ownerId: 'user-1' })
		await hasReadAccessToFile(env, 'user-1', 'file-1')
		mockFileRow(undefined)
		await hasReadAccessToFile(env, 'user-1', 'file-1')
		expect(destroy).toHaveBeenCalledTimes(2)
	})
})
