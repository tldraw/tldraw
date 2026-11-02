import { createMutators, TlaMutators, USER_PREFERENCE_KEYS } from '@tldraw/dotcom-shared'
import { describe, expect, it, vi } from 'vitest'
import { createMcpMutators, restrictMcpMutators } from './mcpMutators'

describe('createMcpMutators', () => {
	const all = createMutators('user_1')
	const mcp = createMcpMutators('user_1')

	it('keeps the board mutators', () => {
		expect(Object.keys(mcp)).toEqual([
			'file',
			'file_state',
			'createFile',
			'pinFile',
			'unpinFile',
			'removeFileFromWorkspace',
			'onEnterFile',
			'updateUserPreferences',
		])
		expect(Object.keys(mcp.file)).toEqual(Object.keys(all.file))
		expect(Object.keys(mcp.file_state)).toEqual(Object.keys(all.file_state))
	})

	it('leaves out workspace administration', () => {
		const left = Object.keys(all).filter((name) => !(name in mcp))
		expect(left).toEqual(
			expect.arrayContaining([
				'createWorkspace',
				'updateWorkspace',
				'regenerateWorkspaceInviteSecret',
				'setWorkspaceInviteLinkEnabled',
				'setWorkspaceMemberRole',
				'removeWorkspaceMember',
				'leaveWorkspace',
				'deleteWorkspace',
				'moveFileToWorkspace',
			])
		)
	})

	it('leaves out the user row, beyond its editor preferences', () => {
		expect(mcp).not.toHaveProperty('user')
	})
})

describe('restrictMcpMutators', () => {
	const tx = {} as any

	function setup() {
		const all = createMutators('user_1')
		const fileUpdate = vi.spyOn(all.file, 'update').mockResolvedValue(undefined)
		const createFile = vi.spyOn(all, 'createFile').mockResolvedValue(undefined)
		const fileStateUpdate = vi.spyOn(all.file_state, 'update').mockResolvedValue(undefined)
		const updateUserPreferences = vi
			.spyOn(all, 'updateUserPreferences')
			.mockResolvedValue(undefined)
		return {
			mcp: restrictMcpMutators(all as TlaMutators),
			fileUpdate,
			createFile,
			fileStateUpdate,
			updateUserPreferences,
		}
	}

	it('lets an agent rename a board', async () => {
		const { mcp, fileUpdate } = setup()
		await mcp.file.update(tx, { id: 'file_1', name: 'Renamed' })
		expect(fileUpdate).toHaveBeenCalledWith(tx, { id: 'file_1', name: 'Renamed' })
	})

	it('refuses sharing, publishing and every other file column', async () => {
		const { mcp, fileUpdate } = setup()
		for (const change of [
			{ shared: true },
			{ sharedLinkType: 'edit' },
			{ published: true },
			{ lastPublished: 1 },
			{ publishedSlug: 'slug' },
			{ isDeleted: true },
			{ owningGroupId: 'group_2' },
			{ thumbnail: 'x' },
			{ ownerName: 'x' },
		]) {
			await expect(mcp.file.update(tx, { id: 'file_1', ...change } as any)).rejects.toThrow(
				'forbidden'
			)
		}
		expect(fileUpdate).not.toHaveBeenCalled()
	})

	it('refuses an unlisted key alongside allowed ones', async () => {
		const { mcp, fileUpdate } = setup()
		await expect(
			mcp.file.update(tx, { id: 'file_1', name: 'Renamed', published: true } as any)
		).rejects.toThrow('forbidden')
		expect(fileUpdate).not.toHaveBeenCalled()
	})

	it('passes the listed keys through on the other mutators', async () => {
		const { mcp, createFile, fileStateUpdate } = setup()
		const create = {
			fileId: 'file_1',
			workspaceId: 'group_1',
			name: 'Board',
			time: 1,
			createSource: null,
		}
		await mcp.createFile(tx, create)
		expect(createFile).toHaveBeenCalledWith(tx, create)

		const state = { userId: 'user_1', fileId: 'file_1', lastVisitAt: 1 }
		await mcp.file_state.update(tx, state)
		expect(fileStateUpdate).toHaveBeenCalledWith(tx, state)
	})

	it('lets an agent set editor preferences, but not the name or colour scheme', async () => {
		const { mcp, updateUserPreferences } = setup()
		const prefs = { isSnapMode: true, inputMode: 'mouse', color: '#ff0000' } as const
		await mcp.updateUserPreferences(tx, prefs)
		expect(updateUserPreferences).toHaveBeenCalledWith(tx, prefs)

		updateUserPreferences.mockClear()
		for (const change of [{ name: 'Someone else' }, { colorScheme: 'dark' }]) {
			await expect(mcp.updateUserPreferences(tx, change as any)).rejects.toThrow('forbidden')
		}
		expect(updateUserPreferences).not.toHaveBeenCalled()
	})

	it('accepts every preference updateUserPreferences accepts', async () => {
		const { mcp, updateUserPreferences } = setup()
		for (const key of USER_PREFERENCE_KEYS) {
			await mcp.updateUserPreferences(tx, { [key]: null })
		}
		expect(updateUserPreferences).toHaveBeenCalledTimes(USER_PREFERENCE_KEYS.length)
	})

	it('refuses arguments that are not an object', async () => {
		const { mcp } = setup()
		await expect(mcp.file.update(tx, null as any)).rejects.toThrow('bad_request')
	})
})
