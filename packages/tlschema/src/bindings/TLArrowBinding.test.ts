import { T } from '@tldraw/validate'
import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { ElbowArrowSnap, arrowBindingProps, arrowBindingVersions } from './TLArrowBinding'

describe('TLArrowBinding', () => {
	describe('ElbowArrowSnap', () => {
		it('should validate valid snap values', () => {
			const validValues = ['center', 'edge-point', 'edge', 'none']
			validValues.forEach((value) => {
				expect(() => ElbowArrowSnap.validate(value)).not.toThrow()
			})
		})

		it('should reject invalid snap values', () => {
			const invalidValues = ['invalid', 'CENTER', '', null, undefined, 123]
			invalidValues.forEach((value) => {
				expect(() => ElbowArrowSnap.validate(value)).toThrow()
			})
		})
	})

	describe('arrowBindingProps validation', () => {
		it('should validate terminal values', () => {
			expect(() => arrowBindingProps.terminal.validate('start')).not.toThrow()
			expect(() => arrowBindingProps.terminal.validate('end')).not.toThrow()
			expect(() => arrowBindingProps.terminal.validate('invalid')).toThrow()
		})

		it('should validate normalizedAnchor coordinates', () => {
			expect(() => arrowBindingProps.normalizedAnchor.validate({ x: 0.5, y: 0.5 })).not.toThrow()
			expect(() => arrowBindingProps.normalizedAnchor.validate({ x: 'invalid', y: 0 })).toThrow()
			expect(() => arrowBindingProps.normalizedAnchor.validate({ x: 0 })).toThrow()
		})

		it('should validate complete arrow binding props', () => {
			const fullValidator = T.object(arrowBindingProps)
			const validProps = {
				terminal: 'end' as const,
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: true,
				snap: 'edge' as const,
			}

			expect(() => fullValidator.validate(validProps)).not.toThrow()
		})
	})

	describe('AddSnap migration', () => {
		const { up, down } = getTestMigration(arrowBindingVersions.AddSnap)

		it('should add snap property with default value "none"', () => {
			const oldRecord = {
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: true,
					isPrecise: false,
				},
			}

			const result = up(oldRecord)
			expect(result.props.snap).toBe('none')
			expect(result.props.terminal).toBe('end')
		})

		it('should remove snap property on down migration', () => {
			const newRecord = {
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: true,
					isPrecise: false,
					snap: 'center',
				},
			}

			const result = down(newRecord)
			expect(result.props.snap).toBeUndefined()
			expect(result.props.terminal).toBe('end')
		})

		it('should be reversible', () => {
			const originalRecord = {
				props: {
					terminal: 'start',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: true,
					isPrecise: false,
				},
			}

			const upResult = up(originalRecord)
			const downResult = down(upResult)
			expect(downResult.props).toEqual(originalRecord.props)
		})
	})
})
