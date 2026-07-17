import { describe, expect, it } from 'vitest'
import { getTlsyncProtocolVersion } from './protocol'
import { TLRemoteSyncError } from './TLRemoteSyncError'
import { TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason } from './TLSyncClient'

describe('protocol constants and errors', () => {
	it('[PV1] getTlsyncProtocolVersion() returns 8', () => {
		expect(getTlsyncProtocolVersion()).toBe(8)
	})

	it('[PV2] TLSyncErrorCloseEventCode is 4099', () => {
		expect(TLSyncErrorCloseEventCode).toBe(4099)
	})

	describe('TLRemoteSyncError', () => {
		it('[PV3] has name RemoteSyncError', () => {
			expect(new TLRemoteSyncError(TLSyncErrorCloseEventReason.FORBIDDEN).name).toBe(
				'RemoteSyncError'
			)
		})

		it('[PV3] formats the message as "sync error: <reason>" and exposes .reason', () => {
			const error = new TLRemoteSyncError(TLSyncErrorCloseEventReason.NOT_AUTHENTICATED)
			expect(error.message).toBe('sync error: NOT_AUTHENTICATED')
			expect(error.reason).toBe('NOT_AUTHENTICATED')
			expect(error).toBeInstanceOf(Error)
		})

		it('[PV3] works with every TLSyncErrorCloseEventReason value', () => {
			for (const reason of Object.values(TLSyncErrorCloseEventReason)) {
				const error = new TLRemoteSyncError(reason)
				expect(error.reason).toBe(reason)
				expect(error.message).toBe(`sync error: ${reason}`)
			}
		})

		it('[PV3] works with custom reason strings', () => {
			const error = new TLRemoteSyncError('ROOM_ARCHIVED')
			expect(error.reason).toBe('ROOM_ARCHIVED')
			expect(error.message).toBe('sync error: ROOM_ARCHIVED')
		})
	})
})
