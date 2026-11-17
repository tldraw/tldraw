import { describe, expect, it } from 'vitest'
import { TldrawApp } from './TldrawApp'

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

function makeFile(id: string, owningGroupId: string | null) {
	return { id, owningGroupId, name: id, isDeleted: false, createdAt: 1000, updatedAt: 1000 }
}

function makeMembership(groupId: string, files: any[]) {
	return {
		groupId,
		group: { id: groupId },
		groupFiles: files.map((file) => ({ fileId: file.id, groupId, index: null, file })),
	}
}

describe('getSearchableFiles', () => {
	it('lists files from every workspace with the workspace they belong to', () => {
		const app = createAppStub([
			makeMembership('user:home', [makeFile('file:mine', 'user:home')]),
			makeMembership('group:team', [makeFile('file:team', 'group:team')]),
		])
		expect(app.getSearchableFiles()).toEqual([
			{ fileId: 'file:mine', workspaceId: 'user:home' },
			{ fileId: 'file:team', workspaceId: 'group:team' },
		])
	})

	it('lists a guest file under home', () => {
		const app = createAppStub([
			makeMembership('user:home', [makeFile('file:guest', 'group:not-a-member')]),
		])
		expect(app.getSearchableFiles()).toEqual([{ fileId: 'file:guest', workspaceId: 'user:home' }])
	})

	it('leaves out a home row for a file owned by a workspace the user is a member of', () => {
		const teamFile = makeFile('file:team', 'group:team')
		const app = createAppStub([
			makeMembership('user:home', [teamFile]),
			makeMembership('group:team', [teamFile]),
		])
		expect(app.getSearchableFiles()).toEqual([{ fileId: 'file:team', workspaceId: 'group:team' }])
	})

	it('skips rows whose file is missing', () => {
		const membership = makeMembership('user:home', [])
		membership.groupFiles.push({
			fileId: 'file:orphan',
			groupId: 'user:home',
			index: null,
			file: undefined,
		} as any)
		expect(createAppStub([membership]).getSearchableFiles()).toEqual([])
	})
})

describe('getFile', () => {
	it('finds files across workspaces and returns null otherwise', () => {
		const app = createAppStub([
			makeMembership('user:home', [makeFile('file:mine', 'user:home')]),
			makeMembership('group:team', [makeFile('file:team', 'group:team')]),
		])
		expect(app.getFile('file:team')?.id).toBe('file:team')
		expect(app.getFile('file:missing')).toBeNull()
		expect(app.getFile(undefined)).toBeNull()
	})
})
