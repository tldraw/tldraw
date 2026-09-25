import { createMutators, TlaMutators } from '@tldraw/dotcom-shared'
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
})

describe('restrictMcpMutators', () => {
	const tx = {} as any

	function setup() {
		const all = createMutators('user_1')
		const fileUpdate = vi.spyOn(all.file, 'update').mockResolvedValue(undefined)
		const createFile = vi.spyOn(all, 'createFile').mockResolvedValue(undefined)
		const fileStateUpdate = vi.spyOn(all.file_state, 'update').mockResolvedValue(undefined)
		return { mcp: restrictMcpMutators(all as TlaMutators), fileUpdate, createFile, fileStateUpdate }
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

	it('refuses arguments that are not an object', async () => {
		const { mcp } = setup()
		await expect(mcp.file.update(tx, null as any)).rejects.toThrow('bad_request')
	})
})
