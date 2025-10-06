import { T } from '@tldraw/validate'
import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { frameShapeProps, frameShapeVersions } from './TLFrameShape'

describe('TLFrameShape', () => {
	describe('frameShapeProps validation', () => {
		it('should validate valid frame props', () => {
			const validProps = {
				w: 400,
				h: 300,
				name: 'Test Frame',
				color: 'blue' as const,
			}

			const validator = T.object(frameShapeProps)
			expect(() => validator.validate(validProps)).not.toThrow()
		})

		it('should reject invalid dimensions', () => {
			// Zero and negative values should be rejected
			expect(() => frameShapeProps.w.validate(0)).toThrow()
			expect(() => frameShapeProps.h.validate(-1)).toThrow()
		})

		it('should reject invalid colors', () => {
			// Invalid color values
			expect(() => frameShapeProps.color.validate('invalid-color')).toThrow()
			expect(() => frameShapeProps.color.validate('')).toThrow()
		})
	})

	describe('AddColorProp migration', () => {
		const { up, down } = getTestMigration(frameShapeVersions.AddColorProp)

		it('should add color property with default value "black"', () => {
			const oldRecord = {
				id: 'shape:frame1',
				props: {
					w: 400,
					h: 300,
					name: 'Test Frame',
				},
			}

			const result = up(oldRecord)
			expect(result.props.color).toBe('black')
			expect(result.props.w).toBe(400)
			expect(result.props.h).toBe(300)
			expect(result.props.name).toBe('Test Frame')
		})

		it('should remove color property on down migration', () => {
			const newRecord = {
				id: 'shape:frame1',
				props: {
					w: 400,
					h: 300,
					name: 'Test Frame',
					color: 'blue',
				},
			}

			const result = down(newRecord)
			expect(result.props.color).toBeUndefined()
			expect(result.props.w).toBe(400)
			expect(result.props.h).toBe(300)
			expect(result.props.name).toBe('Test Frame')
		})
	})
})
