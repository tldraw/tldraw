import { describe, expect, it } from 'vitest'
import { TL_HANDLE_TYPES } from './TLHandle'

describe('TLHandle', () => {
	describe('TL_HANDLE_TYPES', () => {
		it('should contain all expected handle types', () => {
			const expectedHandleTypes = ['vertex', 'virtual', 'create', 'clone']

			expectedHandleTypes.forEach((handleType) => {
				expect(TL_HANDLE_TYPES.has(handleType as any)).toBe(true)
			})
			expect(TL_HANDLE_TYPES.size).toBe(4)
		})
	})
})
