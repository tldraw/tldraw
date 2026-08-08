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
	ownerId: string
	owningGroupId: string | null
	shared: boolean
	isDeleted: boolean
}

// Stubs `pool.selectFrom('file').select(...).where(...).executeTakeFirst()` plus `pool.destroy()`.
function mockFileRow(row: Partial<FileRow> | undefined) {
	const value: FileRow | undefined = row && {
		ownerId: 'owner',
		owningGroupId: null,
		shared: false,
		isDeleted: false,
		...row,
	}
	vi.mocked(createPostgresConnectionPool).mockReturnValue({
		selectFrom: () => ({
			select: () => ({
				where: () => ({ executeTakeFirst: async () => value }),
			}),
		}),
		destroy,
	} as any)
}

afterEach(() => vi.clearAllMocks())

// The read-side counterpart of requireWriteAccessToFile, and what the MCP server's per-user gate is
// built on. It answers with a boolean rather than throwing a status error, because a caller that
// supplies the file id must not be able to tell "no such file" from "not yours".
describe('hasReadAccessToFile', () => {
	it('admits the owner', async () => {
		mockFileRow({ ownerId: 'user-1' })
		expect(await hasReadAccessToFile(env, 'user-1', 'file-1')).toBe(true)
	})

	// Unlike the write check, `sharedLinkType` is irrelevant: a link shared for editing is also one
	// that can be viewed, and this only ever grants viewing.
	it('admits anyone for a link-shared file, whatever the link type', async () => {
		mockFileRow({ ownerId: 'someone-else', shared: true })
		expect(await hasReadAccessToFile(env, 'user-1', 'file-1')).toBe(true)
	})

	it('admits a group member who can access the group’s files', async () => {
		mockFileRow({ ownerId: 'someone-else', owningGroupId: 'group-1' })
		vi.mocked(getRole).mockResolvedValue('member' as any)
		expect(await hasReadAccessToFile(env, 'user-1', 'file-1')).toBe(true)
	})

	it('refuses a group member whose role cannot access files', async () => {
		mockFileRow({ ownerId: 'someone-else', owningGroupId: 'group-1' })
		vi.mocked(getRole).mockResolvedValue(null as any)
		expect(await hasReadAccessToFile(env, 'user-1', 'file-1')).toBe(false)
	})

	it('refuses a stranger’s unshared file', async () => {
		mockFileRow({ ownerId: 'someone-else' })
		expect(await hasReadAccessToFile(env, 'user-1', 'file-1')).toBe(false)
	})

	it('refuses a file that does not exist', async () => {
		mockFileRow(undefined)
		expect(await hasReadAccessToFile(env, 'user-1', 'nope')).toBe(false)
	})

	// Checked before ownership, so a soft-deleted board stops being readable for its owner too — the
	// board is in the trash, and a screenshot of it is not something to serve out of the MCP tools.
	it('refuses a deleted file even for its owner', async () => {
		mockFileRow({ ownerId: 'user-1', isDeleted: true })
		expect(await hasReadAccessToFile(env, 'user-1', 'file-1')).toBe(false)
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
