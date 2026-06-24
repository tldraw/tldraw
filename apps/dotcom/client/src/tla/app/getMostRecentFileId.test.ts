import { describe, expect, it } from 'vitest'
import { getFileRecencyDate, TldrawApp } from './TldrawApp'

// Stub the three members `getMostRecentFileId` reads on a bare prototype instance, avoiding a full
// TldrawApp (Zero/Clerk/router). Same approach as getWorkspaceFilesSorted.test.ts.
function createAppStub({
	fileStates = [] as any[],
	myFiles = [] as any[],
	workspaceFiles = {} as Record<string, any[]>,
	userId = 'user:home',
} = {}) {
	const app = Object.create(TldrawApp.prototype)
	Object.assign(app, {
		userId,
		fileStates$: { get: () => fileStates },
		getMyFiles: () => myFiles,
		getWorkspaceFilesSorted: (id: string) => workspaceFiles[id] ?? [],
	})
	return app as TldrawApp
}

function makeState(fileId: string, overrides: Partial<any> = {}) {
	const { file: fileOverride, ...rest } = overrides
	// `file: undefined` stays undefined to model an inaccessible file; a partial merges onto defaults.
	const file =
		'file' in overrides
			? fileOverride && { id: fileId, isDeleted: false, createdAt: 1000, ...fileOverride }
			: { id: fileId, isDeleted: false, createdAt: 1000 }
	return {
		fileId,
		userId: 'user:home',
		firstVisitAt: null,
		lastEditAt: null,
		lastVisitAt: null,
		file,
		...rest,
	}
}

describe('getFileRecencyDate', () => {
	it('prefers lastVisitAt over lastEditAt, firstVisitAt, and createdAt', () => {
		const state = { lastVisitAt: 4, lastEditAt: 3, firstVisitAt: 2 } as any
		expect(getFileRecencyDate(state, { createdAt: 1 } as any)).toBe(4)
	})

	it('falls through lastEditAt, then firstVisitAt, then createdAt, then 0', () => {
		expect(
			getFileRecencyDate({ lastEditAt: 3, firstVisitAt: 2 } as any, { createdAt: 1 } as any)
		).toBe(3)
		expect(getFileRecencyDate({ firstVisitAt: 2 } as any, { createdAt: 1 } as any)).toBe(2)
		expect(getFileRecencyDate({} as any, { createdAt: 1 } as any)).toBe(1)
		expect(getFileRecencyDate(undefined, undefined)).toBe(0)
	})
})

describe('getMostRecentFileId', () => {
	it('returns the globally most recent file across all workspaces', () => {
		const app = createAppStub({
			fileStates: [
				makeState('file:a', { lastVisitAt: 100 }),
				makeState('file:b', { lastVisitAt: 300 }),
				makeState('file:c', { lastVisitAt: 200 }),
			],
		})
		expect(app.getMostRecentFileId()).toBe('file:b')
	})

	it('skips deleted and inaccessible files and picks the next most recent available one', () => {
		const app = createAppStub({
			fileStates: [
				// Most recent, but the file is no longer accessible (relation resolved to undefined).
				makeState('file:gone', { lastVisitAt: 300, file: undefined }),
				// Next most recent, but deleted.
				makeState('file:deleted', { lastVisitAt: 200, file: { isDeleted: true } }),
				makeState('file:ok', { lastVisitAt: 100 }),
			],
		})
		expect(app.getMostRecentFileId()).toBe('file:ok')
	})

	it('falls back to the most recent home file when the user has no visited files', () => {
		const app = createAppStub({
			fileStates: [],
			myFiles: [{ fileId: 'file:home-top' }, { fileId: 'file:home-2' }],
		})
		expect(app.getMostRecentFileId()).toBe('file:home-top')
	})

	it('returns null when the user has no files at all', () => {
		expect(createAppStub().getMostRecentFileId()).toBe(null)
	})

	it('only considers files in the given workspace when scoped', () => {
		const app = createAppStub({
			workspaceFiles: { 'group:x': [{ fileId: 'file:1' }, { fileId: 'file:2' }] },
			fileStates: [
				makeState('file:1', { lastVisitAt: 100 }),
				makeState('file:2', { lastVisitAt: 500 }),
				// Most recent overall, but not in group:x — must be ignored.
				makeState('file:other', { lastVisitAt: 999 }),
			],
		})
		expect(app.getMostRecentFileId('group:x')).toBe('file:2')
	})

	it('falls back to the top of the workspace list when none of its files were visited', () => {
		const app = createAppStub({
			workspaceFiles: { 'group:x': [{ fileId: 'file:top' }, { fileId: 'file:2' }] },
			fileStates: [makeState('file:other', { lastVisitAt: 999 })],
		})
		expect(app.getMostRecentFileId('group:x')).toBe('file:top')
	})
})
