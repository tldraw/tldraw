import { describe, expect, it } from 'vitest'
import { createBindingId, rootBindingMigrations } from './TLBinding'

describe('TLBinding', () => {
	describe('createBindingId function', () => {
		it('should generate IDs starting with binding:', () => {
			const id = createBindingId()
			expect(id.startsWith('binding:')).toBe(true)
		})

		it('should use custom ID when provided', () => {
			expect(createBindingId('test')).toBe('binding:test')
		})
	})

	describe('rootBindingMigrations', () => {
		it('should have correct structure', () => {
			expect(rootBindingMigrations.sequenceId).toBe('com.tldraw.binding')
			expect(Array.isArray(rootBindingMigrations.sequence)).toBe(true)
		})
	})
})
