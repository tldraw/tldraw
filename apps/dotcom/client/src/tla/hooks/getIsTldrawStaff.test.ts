import type { UserResource } from '@clerk/types'
import { describe, expect, it } from 'vitest'
import { getIsTldrawStaff } from './useUser'

function userWith(email: string | undefined, status: string | undefined): UserResource {
	return {
		primaryEmailAddress: email
			? {
					emailAddress: email,
					verification: status ? { status } : undefined,
				}
			: null,
	} as unknown as UserResource
}

describe('getIsTldrawStaff', () => {
	it('is false for null/undefined users', () => {
		expect(getIsTldrawStaff(null)).toBe(false)
		expect(getIsTldrawStaff(undefined)).toBe(false)
	})

	it('is true for a verified @tldraw.com email', () => {
		expect(getIsTldrawStaff(userWith('jane@tldraw.com', 'verified'))).toBe(true)
	})

	it('is false for a verified non-tldraw email', () => {
		expect(getIsTldrawStaff(userWith('jane@gmail.com', 'verified'))).toBe(false)
	})

	it('is false for an unverified @tldraw.com email', () => {
		expect(getIsTldrawStaff(userWith('jane@tldraw.com', 'unverified'))).toBe(false)
	})

	it('is false (not throwing) when verification is missing', () => {
		expect(getIsTldrawStaff(userWith('jane@tldraw.com', undefined))).toBe(false)
	})

	it('is false when there is no primary email', () => {
		expect(getIsTldrawStaff(userWith(undefined, undefined))).toBe(false)
	})
})
