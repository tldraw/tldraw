import { describe, expect, it } from 'vitest'
import {
	createBindingId,
	isBinding,
	isBindingId,
	rootBindingMigrations,
	TLBinding,
	TLBindingId,
} from './TLBinding'
import { TLShapeId } from './TLShape'

describe('TLBinding', () => {
	describe('isBinding type guard', () => {
		it('should return true for binding records', () => {
			const binding: TLBinding = {
				id: 'binding:test' as TLBindingId,
				typeName: 'binding',
				type: 'arrow',
				fromId: 'shape:from1' as TLShapeId,
				toId: 'shape:to1' as TLShapeId,
				props: {},
				meta: {},
			}

			expect(isBinding(binding)).toBe(true)
		})

		it('should return false for non-binding records', () => {
			const shapeRecord = {
				typeName: 'shape',
			}

			expect(isBinding(shapeRecord as any)).toBe(false)
			expect(isBinding(undefined)).toBe(false)
		})
	})

	describe('isBindingId type guard', () => {
		it('should return true for valid binding IDs', () => {
			expect(isBindingId('binding:abc123')).toBe(true)
			expect(isBindingId('binding:')).toBe(true)
		})

		it('should return false for invalid binding IDs', () => {
			expect(isBindingId('shape:abc123')).toBe(false)
			expect(isBindingId('binding')).toBe(false)
			expect(isBindingId('')).toBe(false)
			expect(isBindingId(undefined)).toBe(false)
		})
	})

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
