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
	return { groupId, groupFiles, group: { id: groupId } }
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

	it('keeps archived files in the list and flags them', () => {
		const homeId = 'user:home'
		const membership = makeMembership(homeId, [
			{
				fileId: 'file:archived',
				groupId: homeId,
				index: null,
				archivedAt: 5000,
				file: makeFile({ id: 'file:archived', owningGroupId: homeId, updatedAt: 3000 }),
			},
			{
				fileId: 'file:active',
				groupId: homeId,
				index: null,
				archivedAt: null,
				file: makeFile({ id: 'file:active', owningGroupId: homeId, updatedAt: 2000 }),
			},
		])
		const app = createAppStub([membership], homeId)

		expect(
			app.getWorkspaceFilesSorted(homeId).map(({ fileId, isArchived }) => ({ fileId, isArchived }))
		).toEqual([
			{ fileId: 'file:archived', isArchived: true },
			{ fileId: 'file:active', isArchived: false },
		])
		expect(app.isArchived('file:archived', homeId)).toBe(true)
		expect(app.isArchived('file:active', homeId)).toBe(false)
	})
})

describe('getWorkspaceMembership', () => {
	it('ignores a membership whose group row is gone', () => {
		// what the comment feeds' access gate can leave behind after the user leaves a workspace
		const app = createAppStub([
			{ ...makeMembership('group:left', []), group: undefined },
			makeMembership('group:kept', []),
		])
		expect(app.getWorkspaceMembership('group:left')).toBeUndefined()
		expect(app.getWorkspaceMembership('group:kept')?.groupId).toBe('group:kept')
		expect(app.getWorkspaceMemberships().map((m) => m.groupId)).toEqual(['group:kept'])
	})
})
