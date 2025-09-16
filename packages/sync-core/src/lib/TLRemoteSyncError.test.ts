import { describe, expect, it } from 'vitest'
import { TLRemoteSyncError } from './TLRemoteSyncError'
import { TLSyncErrorCloseEventReason } from './TLSyncClient'

describe('TLRemoteSyncError', () => {
	describe('constructor', () => {
		it('should create error with predefined reason', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.NOT_FOUND)

			expect(error).toBeInstanceOf(Error)
			expect(error).toBeInstanceOf(TLRemoteSyncError)
			expect(error.name).toBe('RemoteSyncError')
			expect(error.reason).toBe('NOT_FOUND')
			expect(error.message).toBe('sync error: NOT_FOUND')
		})

		it('should create error with custom string reason', () => {
			const customReason = 'CUSTOM_VALIDATION_ERROR'
			const error = new TLRemoteSyncError(customReason)

			expect(error).toBeInstanceOf(Error)
			expect(error).toBeInstanceOf(TLRemoteSyncError)
			expect(error.name).toBe('RemoteSyncError')
			expect(error.reason).toBe(customReason)
			expect(error.message).toBe(`sync error: ${customReason}`)
		})

		it('should handle empty string reason', () => {
			const error = new TLRemoteSyncError('')

			expect(error.reason).toBe('')
			expect(error.message).toBe('sync error: ')
		})
	})

	describe('predefined error reasons', () => {
		it('should work with NOT_FOUND reason', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.NOT_FOUND)
			expect(error.reason).toBe('NOT_FOUND')
			expect(error.message).toBe('sync error: NOT_FOUND')
		})

		it('should work with FORBIDDEN reason', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.FORBIDDEN)
			expect(error.reason).toBe('FORBIDDEN')
			expect(error.message).toBe('sync error: FORBIDDEN')
		})

		it('should work with NOT_AUTHENTICATED reason', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.NOT_AUTHENTICATED)
			expect(error.reason).toBe('NOT_AUTHENTICATED')
			expect(error.message).toBe('sync error: NOT_AUTHENTICATED')
		})

		it('should work with UNKNOWN_ERROR reason', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.UNKNOWN_ERROR)
			expect(error.reason).toBe('UNKNOWN_ERROR')
			expect(error.message).toBe('sync error: UNKNOWN_ERROR')
		})

		it('should work with CLIENT_TOO_OLD reason', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
			expect(error.reason).toBe('CLIENT_TOO_OLD')
			expect(error.message).toBe('sync error: CLIENT_TOO_OLD')
		})

		it('should work with SERVER_TOO_OLD reason', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.SERVER_TOO_OLD)
			expect(error.reason).toBe('SERVER_TOO_OLD')
			expect(error.message).toBe('sync error: SERVER_TOO_OLD')
		})

		it('should work with INVALID_RECORD reason', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.INVALID_RECORD)
			expect(error.reason).toBe('INVALID_RECORD')
			expect(error.message).toBe('sync error: INVALID_RECORD')
		})

		it('should work with RATE_LIMITED reason', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.RATE_LIMITED)
			expect(error.reason).toBe('RATE_LIMITED')
			expect(error.message).toBe('sync error: RATE_LIMITED')
		})

		it('should work with ROOM_FULL reason', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.ROOM_FULL)
			expect(error.reason).toBe('ROOM_FULL')
			expect(error.message).toBe('sync error: ROOM_FULL')
		})
	})

	describe('error properties', () => {
		it('should have reason property', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.FORBIDDEN)

			// The readonly modifier is a TypeScript compile-time feature, not runtime
			// The property descriptor will show it as writable at runtime
			const descriptor = Object.getOwnPropertyDescriptor(error, 'reason')
			expect(descriptor?.value).toBe('FORBIDDEN')
			expect(descriptor?.enumerable).toBe(true)

			// TypeScript readonly prevents modification at compile time, but at runtime
			// the property is still technically writable (though shouldn't be modified)
			expect(error.reason).toBe('FORBIDDEN')
		})

		it('should override name property from Error', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.NOT_FOUND)

			expect(error.name).toBe('RemoteSyncError')
			expect(error.name).not.toBe('Error')
		})

		it('should preserve Error prototype chain', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.UNKNOWN_ERROR)

			expect(error instanceof Error).toBe(true)
			expect(error instanceof TLRemoteSyncError).toBe(true)
			expect(Object.getPrototypeOf(error)).toBe(TLRemoteSyncError.prototype)
		})

		it('should have stack trace', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.UNKNOWN_ERROR)

			expect(error.stack).toBeDefined()
			expect(typeof error.stack).toBe('string')
			expect(error.stack).toContain('TLRemoteSyncError')
		})
	})

	describe('error handling patterns', () => {
		it('can be caught and identified with instanceof', () => {
			const throwError = () => {
				throw new TLRemoteSyncError(TLSyncErrorCloseEventReason.FORBIDDEN)
			}

			expect(() => throwError()).toThrow(TLRemoteSyncError)

			try {
				throwError()
			} catch (error) {
				expect(error).toBeInstanceOf(TLRemoteSyncError)
				if (error instanceof TLRemoteSyncError) {
					expect(error.reason).toBe('FORBIDDEN')
				}
			}
		})

		it('can be differentiated from other Error types', () => {
			const syncError = new TLRemoteSyncError(TLSyncErrorCloseEventReason.NOT_FOUND)
			const genericError = new Error('generic error')

			expect(syncError instanceof TLRemoteSyncError).toBe(true)
			expect(genericError instanceof TLRemoteSyncError).toBe(false)

			expect(syncError instanceof Error).toBe(true)
			expect(genericError instanceof Error).toBe(true)
		})

		it('works in switch statements with reason property', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
			let handled = false

			switch (error.reason) {
				case TLSyncErrorCloseEventReason.CLIENT_TOO_OLD:
					handled = true
					break
				case TLSyncErrorCloseEventReason.NOT_AUTHENTICATED:
					// Should not reach here
					break
				default:
					// Should not reach here
					break
			}

			expect(handled).toBe(true)
		})
	})

	describe('edge cases and special values', () => {
		it('should handle numeric strings as custom reasons', () => {
			const error = new TLRemoteSyncError('404')
			expect(error.reason).toBe('404')
			expect(error.message).toBe('sync error: 404')
		})

		it('should handle special characters in custom reasons', () => {
			const specialReason = 'CUSTOM_ERROR: @#$%^&*()'
			const error = new TLRemoteSyncError(specialReason)
			expect(error.reason).toBe(specialReason)
			expect(error.message).toBe(`sync error: ${specialReason}`)
		})

		it('should handle unicode characters in custom reasons', () => {
			const unicodeReason = 'SYNC_ERROR_用户未找到'
			const error = new TLRemoteSyncError(unicodeReason)
			expect(error.reason).toBe(unicodeReason)
			expect(error.message).toBe(`sync error: ${unicodeReason}`)
		})

		it('should handle very long custom reasons', () => {
			const longReason = 'A'.repeat(1000)
			const error = new TLRemoteSyncError(longReason)
			expect(error.reason).toBe(longReason)
			expect(error.message).toBe(`sync error: ${longReason}`)
		})
	})

	describe('serialization behavior', () => {
		it('should serialize to JSON properly', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.RATE_LIMITED)

			const serialized = JSON.stringify(error)
			const parsed = JSON.parse(serialized)

			// Note: Error objects don't serialize their inherited properties by default
			// but custom properties like 'reason' should be included
			expect(parsed.reason).toBe('RATE_LIMITED')
		})

		it('should convert to string properly', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.SERVER_TOO_OLD)

			const stringified = error.toString()
			expect(stringified).toBe('RemoteSyncError: sync error: SERVER_TOO_OLD')
		})
	})
})
