import { ClerkOfflineError } from '@clerk/react/errors'
import { describe, expect, it } from 'vitest'
import { tokenOrUndefinedWhenOffline } from './auth'

describe('tokenOrUndefinedWhenOffline', () => {
	it('passes a token through and maps null to undefined', async () => {
		expect(await tokenOrUndefinedWhenOffline(async () => 'tok')).toBe('tok')
		expect(await tokenOrUndefinedWhenOffline(async () => null)).toBeUndefined()
	})

	it('returns undefined when Clerk is offline', async () => {
		const offline = async () => {
			throw new ClerkOfflineError('offline')
		}
		expect(await tokenOrUndefinedWhenOffline(offline)).toBeUndefined()
	})

	it('rethrows other errors', async () => {
		const failing = async () => {
			throw new Error('boom')
		}
		await expect(tokenOrUndefinedWhenOffline(failing)).rejects.toThrow('boom')
	})
})
