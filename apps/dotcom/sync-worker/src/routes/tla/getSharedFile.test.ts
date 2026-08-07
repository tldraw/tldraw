import { describe, expect, it } from 'vitest'
import { SharedFileInfo, isFileAnonymouslyViewable, isFileRenderable } from './getSharedFile'

function makeFile(overrides: Partial<SharedFileInfo> = {}): SharedFileInfo {
	return { id: 'file-abc', shared: true, isDeleted: false, ...overrides }
}

// The two gates, and the one difference between them: sharing. Rendering happens for every board so
// an owner-facing surface has a thumbnail; serving to an anonymous caller does not.
describe('isFileRenderable', () => {
	it('allows a private file — privacy gates serving, not rendering', () => {
		expect(isFileRenderable(makeFile({ shared: false }))).toBe(true)
		expect(isFileAnonymouslyViewable(makeFile({ shared: false }))).toBe(false)
	})

	it('refuses a missing file', () => {
		expect(isFileRenderable(null)).toBe(false)
	})

	// A deleted board has nothing worth depicting, shared or not.
	it('refuses a deleted file', () => {
		expect(isFileRenderable(makeFile({ isDeleted: true }))).toBe(false)
		expect(isFileRenderable(makeFile({ isDeleted: true, shared: false }))).toBe(false)
	})

	// Reading a test file needs admin auth, so it has no business being pulled through the render page
	// even though nothing would serve the result anonymously.
	it('refuses a test file', () => {
		expect(isFileRenderable(makeFile({ id: 'test_abc' }))).toBe(false)
	})
})

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
