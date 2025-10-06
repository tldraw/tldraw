import { T } from '@tldraw/validate'
import { describe, expect, it } from 'vitest'
import { createShapeValidator, parentIdValidator, shapeIdValidator } from './TLBaseShape'

describe('TLBaseShape', () => {
	describe('parentIdValidator', () => {
		it('should accept valid page and shape parent IDs', () => {
			expect(() => parentIdValidator.validate('page:main')).not.toThrow()
			expect(() => parentIdValidator.validate('shape:frame1')).not.toThrow()
			expect(parentIdValidator.validate('page:main')).toBe('page:main')
		})

		it('should reject invalid parent ID prefixes', () => {
			expect(() => parentIdValidator.validate('invalid:123')).toThrow(
				'Parent ID must start with "page:" or "shape:"'
			)
			expect(() => parentIdValidator.validate('asset:123')).toThrow(
				'Parent ID must start with "page:" or "shape:"'
			)
			expect(() => parentIdValidator.validate('page-main')).toThrow(
				'Parent ID must start with "page:" or "shape:"'
			)
		})
	})

	describe('shapeIdValidator', () => {
		it('should accept valid shape IDs', () => {
			expect(() => shapeIdValidator.validate('shape:abc123')).not.toThrow()
			expect(shapeIdValidator.validate('shape:test')).toBe('shape:test')
		})

		it('should reject non-shape IDs', () => {
			expect(() => shapeIdValidator.validate('page:123')).toThrow(
				'shape ID must start with "shape:"'
			)
			expect(() => shapeIdValidator.validate('asset:123')).toThrow(
				'shape ID must start with "shape:"'
			)
			expect(() => shapeIdValidator.validate('shape-abc123')).toThrow(
				'shape ID must start with "shape:"'
			)
		})
	})

	describe('createShapeValidator', () => {
		it('should create validator for shape with no custom props', () => {
			const validator = createShapeValidator('simple')

			const validShape = {
				id: 'shape:simple123',
				typeName: 'shape',
				type: 'simple',
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 0.8,
				props: {},
				meta: {},
			}

			expect(() => validator.validate(validShape)).not.toThrow()
		})

		it('should create validator for shape with custom props', () => {
			const validator = createShapeValidator('custom', {
				width: T.number,
				height: T.number,
				color: T.string,
			})

			const validShape = {
				id: 'shape:custom456',
				typeName: 'shape',
				type: 'custom',
				x: 50,
				y: 75,
				rotation: 1.0,
				index: 'a2',
				parentId: 'shape:frame1',
				isLocked: true,
				opacity: 0.5,
				props: {
					width: 150,
					height: 100,
					color: 'blue',
				},
				meta: {},
			}

			expect(() => validator.validate(validShape)).not.toThrow()
		})

		it('should reject shapes with wrong type', () => {
			const validator = createShapeValidator('test')

			const invalidShape = {
				id: 'shape:test',
				typeName: 'shape',
				type: 'wrong',
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

			expect(() => validator.validate(invalidShape)).toThrow()
		})

		it('should reject shapes with invalid custom props', () => {
			const validator = createShapeValidator('custom', {
				width: T.number,
				height: T.number,
				color: T.string,
			})

			const invalidShape = {
				id: 'shape:custom123',
				typeName: 'shape',
				type: 'custom',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 1,
				meta: {},
				props: { width: '100' }, // Wrong type - should be number
			}

			expect(() => validator.validate(invalidShape)).toThrow()
		})
	})
})
