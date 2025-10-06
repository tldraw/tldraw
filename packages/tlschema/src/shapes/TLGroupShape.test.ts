import { describe, expect, it } from 'vitest'
import { createShapeValidator } from './TLBaseShape'
import { groupShapeMigrations, groupShapeProps } from './TLGroupShape'

describe('TLGroupShape', () => {
	describe('groupShapeProps', () => {
		it('should be an empty object', () => {
			expect(groupShapeProps).toEqual({})
		})
	})

	describe('groupShapeMigrations', () => {
		it('should have empty migration sequence', () => {
			expect(groupShapeMigrations.sequence).toEqual([])
		})
	})

	describe('group shape validation', () => {
		const groupValidator = createShapeValidator('group', groupShapeProps)

		it('should validate valid group shapes', () => {
			const validGroup = {
				id: 'shape:test',
				typeName: 'shape',
				type: 'group',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 1,
				props: {},
				meta: {},
			}

			expect(() => groupValidator.validate(validGroup)).not.toThrow()
		})

		it('should reject shapes with non-empty props', () => {
			const invalidGroup = {
				id: 'shape:invalid',
				typeName: 'shape',
				type: 'group',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 1,
				props: { invalid: 'prop' },
				meta: {},
			}

			expect(() => groupValidator.validate(invalidGroup)).toThrow()
		})
	})
})
