import { describe, expect, it } from 'vitest'
import { SharedFileInfo, isFileAnonymouslyViewable } from './getSharedFile'

function makeFile(overrides: Partial<SharedFileInfo> = {}): SharedFileInfo {
	return { id: 'file-abc', shared: true, isDeleted: false, ...overrides }
}

describe('isFileAnonymouslyViewable', () => {
	it('allows a shared, non-deleted, non-test file', () => {
		expect(isFileAnonymouslyViewable(makeFile())).toBe(true)
	})

	it('refuses a missing file', () => {
		expect(isFileAnonymouslyViewable(null)).toBe(false)
	})

	it('refuses a private (unshared) file', () => {
		expect(isFileAnonymouslyViewable(makeFile({ shared: false }))).toBe(false)
	})

	it('refuses a deleted file even if still shared', () => {
		expect(isFileAnonymouslyViewable(makeFile({ isDeleted: true }))).toBe(false)
	})

	it('refuses a test file, which needs admin auth the anonymous tool never has', () => {
		expect(isFileAnonymouslyViewable(makeFile({ id: 'test_abc' }))).toBe(false)
	})
})
