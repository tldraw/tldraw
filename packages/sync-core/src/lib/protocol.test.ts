import { describe, expect, it } from 'vitest'
import { TLIncompatibilityReason, getTlsyncProtocolVersion } from './protocol'

describe('protocol', () => {
	describe('getTlsyncProtocolVersion', () => {
		it('should return version 7 as the current version', () => {
			expect(getTlsyncProtocolVersion()).toBe(7)
		})
	})

	describe('TLIncompatibilityReason', () => {
		it('should contain all expected incompatibility reason constants', () => {
			expect(TLIncompatibilityReason.ClientTooOld).toBe('clientTooOld')
			expect(TLIncompatibilityReason.ServerTooOld).toBe('serverTooOld')
			expect(TLIncompatibilityReason.InvalidRecord).toBe('invalidRecord')
			expect(TLIncompatibilityReason.InvalidOperation).toBe('invalidOperation')
		})
	})
})
