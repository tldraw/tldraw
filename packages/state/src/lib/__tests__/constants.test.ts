import { describe, expect, it } from 'vitest'
import { GLOBAL_START_EPOCH } from '../constants'

describe('constants', () => {
	describe('GLOBAL_START_EPOCH', () => {
		it('should be -1', () => {
			expect(GLOBAL_START_EPOCH).toBe(-1)
		})

		it('should be exactly one less than the initial global epoch', () => {
			// According to the documentation, global epoch starts at GLOBAL_START_EPOCH + 1 = 0
			const initialGlobalEpoch = GLOBAL_START_EPOCH + 1
			expect(initialGlobalEpoch).toBe(0)
		})

		it('should ensure dirty state comparison works correctly', () => {
			// Simulating how the constant is used in dirty checking
			const currentEpoch = 5
			const lastChangedEpoch = GLOBAL_START_EPOCH

			// This comparison determines if a signal needs recomputation
			const needsComputation = lastChangedEpoch < currentEpoch
			expect(needsComputation).toBe(true)
		})

		it('should work correctly in epoch-based dirty checking scenarios', () => {
			// Simulate typical usage patterns from the codebase
			const scenarios = [
				{ currentEpoch: 0, expectedDirty: true },
				{ currentEpoch: 1, expectedDirty: true },
				{ currentEpoch: 10, expectedDirty: true },
				{ currentEpoch: 1000000, expectedDirty: true },
			]

			scenarios.forEach(({ currentEpoch, expectedDirty }) => {
				const isDirty = GLOBAL_START_EPOCH < currentEpoch
				expect(isDirty).toBe(expectedDirty)
			})
		})
	})
})
