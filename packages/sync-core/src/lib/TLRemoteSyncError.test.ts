import { describe, expect, it } from 'vitest'
import { TLRemoteSyncError } from './TLRemoteSyncError'
import { TLSyncErrorCloseEventReason } from './TLSyncClient'

describe('TLRemoteSyncError', () => {
	describe('constructor', () => {
		it('should create error with predefined reason', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.NOT_FOUND)

			expect(error).toBeInstanceOf(TLRemoteSyncError)
			expect(error.reason).toBe('NOT_FOUND')
			expect(error.message).toBe('sync error: NOT_FOUND')
		})

		it('should create error with custom string reason', () => {
			const customReason = 'CUSTOM_VALIDATION_ERROR'
			const error = new TLRemoteSyncError(customReason)

			expect(error.reason).toBe(customReason)
			expect(error.message).toBe(`sync error: ${customReason}`)
		})
	})

	describe('error handling patterns', () => {
		it('can be caught and identified with instanceof', () => {
			const throwError = () => {
				throw new TLRemoteSyncError(TLSyncErrorCloseEventReason.FORBIDDEN)
			}

			try {
				throwError()
			} catch (error) {
				expect(error).toBeInstanceOf(TLRemoteSyncError)
				if (error instanceof TLRemoteSyncError) {
					expect(error.reason).toBe('FORBIDDEN')
				}
			}
		})

		it('works in switch statements with reason property', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
			let handled = false

			switch (error.reason) {
				case TLSyncErrorCloseEventReason.CLIENT_TOO_OLD:
					handled = true
					break
				default:
					break
			}

			expect(handled).toBe(true)
		})
	})
})
