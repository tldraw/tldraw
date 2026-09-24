import { createMutators } from '@tldraw/dotcom-shared'
import { describe, expect, it } from 'vitest'
import { createMcpMutators } from './mcpMutators'

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
