import { describe, expect, it } from 'vitest'
import { resolveHistoryEnabled } from './useVersionHistoryEnabled'

describe('resolveHistoryEnabled', () => {
	it('staff always on', () => {
		expect(resolveHistoryEnabled({ signedIn: true, isStaff: true, flag: undefined })).toBe(true)
	})
	it('unknown until the flag has resolved', () => {
		expect(
			resolveHistoryEnabled({ signedIn: true, isStaff: false, flag: undefined })
		).toBeUndefined()
	})
	it('follows the flag once resolved', () => {
		expect(resolveHistoryEnabled({ signedIn: true, isStaff: false, flag: true })).toBe(true)
		expect(resolveHistoryEnabled({ signedIn: true, isStaff: false, flag: false })).toBe(false)
	})
	it('signed out is off', () => {
		expect(resolveHistoryEnabled({ signedIn: false, isStaff: false, flag: true })).toBe(false)
	})
})
