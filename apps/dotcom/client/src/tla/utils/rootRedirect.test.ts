import { describe, expect, it } from 'vitest'
import { resolveRootRedirect } from './rootRedirect'

const none = {
	redirectTo: null,
	hasPendingImport: false,
	shouldSlurp: false,
	cachedFileId: null,
}

describe('resolveRootRedirect', () => {
	it('goes to the cached file when nothing else is pending', () => {
		expect(resolveRootRedirect({ ...none, cachedFileId: 'file-1' })).toEqual({
			kind: 'cached-file',
			fileId: 'file-1',
		})
	})

	it('waits for the app when there is no cached file', () => {
		expect(resolveRootRedirect(none)).toEqual({ kind: 'wait-for-app' })
	})

	it('honors an OAuth redirect over the cache', () => {
		expect(
			resolveRootRedirect({ ...none, redirectTo: '/f/other', cachedFileId: 'file-1' })
		).toEqual({ kind: 'redirect-to', to: '/f/other' })
	})

	it('ignores an OAuth redirect that is not a path', () => {
		expect(
			resolveRootRedirect({ ...none, redirectTo: 'https://evil.example', cachedFileId: 'file-1' })
		).toEqual({ kind: 'cached-file', fileId: 'file-1' })
	})

	it('waits for the app when an import is pending, even with a cache', () => {
		expect(
			resolveRootRedirect({ ...none, hasPendingImport: true, cachedFileId: 'file-1' })
		).toEqual({ kind: 'wait-for-app' })
	})

	it('waits for the app when a scratch file needs slurping, even with a cache', () => {
		expect(resolveRootRedirect({ ...none, shouldSlurp: true, cachedFileId: 'file-1' })).toEqual({
			kind: 'wait-for-app',
		})
	})
})
