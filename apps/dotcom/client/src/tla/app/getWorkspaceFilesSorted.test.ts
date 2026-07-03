import { describe, expect, it } from 'vitest'
import { TldrawApp } from './TldrawApp'

// `getWorkspaceFilesSorted` reads only these four members off `this`, so we can drive the real
// method (and the sibling methods it calls) against a lightweight stub instead of constructing a
// full TldrawApp, which needs Zero, Clerk, and a router.
function createAppStub(memberships: any[], userId = 'user:home') {
	const app = Object.create(TldrawApp.prototype)
	Object.assign(app, {
		userId,
		workspaceMemberships$: { get: () => memberships },
		fileStates$: { get: () => [] },
		lastWorkspaceFileOrderings: new Map(),
	})
	return app as TldrawApp
}

function makeFile(overrides: Partial<any> = {}) {
	return {
		id: 'file:1',
		owningGroupId: null,
		isDeleted: false,
		createdAt: 1000,
		updatedAt: 1000,
		...overrides,
	}
}

function makeMembership(groupId: string, groupFiles: any[]) {
	return { groupId, groupFiles }
}

describe('getWorkspaceFilesSorted', () => {
	it('drops group_file rows whose file is missing instead of crashing', () => {
		const homeId = 'user:home'
		const ownedFile = makeFile({ id: 'file:owned', owningGroupId: homeId })
		// A group_file row can outlive (or arrive before) its file when the file is deleted, not yet
		// synced, or filtered out server-side. The orphan is listed first so a regressed guard would
		// throw inside the filter at the exact line that crashed in production.
		const membership = makeMembership(homeId, [
			{ fileId: 'file:orphan', groupId: homeId, index: null, file: undefined },
			{ fileId: 'file:owned', groupId: homeId, index: null, file: ownedFile },
		])
		const app = createAppStub([membership], homeId)

		const result = app.getWorkspaceFilesSorted(homeId)

		expect(result.map((r) => r.fileId)).toEqual(['file:owned'])
	})

	it('returns an empty list when every group_file row is orphaned', () => {
		const homeId = 'user:home'
		const membership = makeMembership(homeId, [
			{ fileId: 'file:a', groupId: homeId, index: null, file: undefined },
			{ fileId: 'file:b', groupId: homeId, index: null, file: undefined },
		])
		const app = createAppStub([membership], homeId)

		expect(app.getWorkspaceFilesSorted(homeId)).toEqual([])
	})
})

describe('isPinned', () => {
	it('checks the workspace group_file row directly', () => {
		const workspaceId = 'group:workspace'
		const pinnedFile = makeFile({ id: 'file:pinned', owningGroupId: workspaceId })
		const unpinnedFile = makeFile({ id: 'file:unpinned', owningGroupId: workspaceId })
		const app = createAppStub([
			makeMembership(workspaceId, [
				{ fileId: 'file:pinned', groupId: workspaceId, index: 'a1', file: pinnedFile },
				{ fileId: 'file:unpinned', groupId: workspaceId, index: null, file: unpinnedFile },
			]),
		])

		expect(app.isPinned('file:pinned', workspaceId)).toBe(true)
		expect(app.isPinned('file:unpinned', workspaceId)).toBe(false)
	})

	it('ignores missing workspaces and orphaned group_file rows', () => {
		const workspaceId = 'group:workspace'
		const app = createAppStub([
			makeMembership(workspaceId, [
				{ fileId: 'file:orphan', groupId: workspaceId, index: 'a1', file: undefined },
			]),
		])

		expect(app.isPinned('file:orphan', workspaceId)).toBe(false)
		expect(app.isPinned('file:orphan', '')).toBe(false)
		expect(app.isPinned('file:orphan', 'group:missing')).toBe(false)
	})
})
