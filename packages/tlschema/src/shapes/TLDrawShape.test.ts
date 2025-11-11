import { T } from '@tldraw/validate'
import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { DrawShapeSegment, drawShapeProps, drawShapeVersions } from './TLDrawShape'

describe('TLDrawShape', () => {
	describe('DrawShapeSegment validator', () => {
		it('should validate valid segment structures', () => {
			const validSegments = [
				{ type: 'free', firstPoint: { x: 0, y: 0 }, points: [] },
				{ type: 'straight', firstPoint: { x: 0, y: 0, z: 0.5 }, points: [10, 20, 5] },
				{ type: 'free', firstPoint: { x: 0, y: 0 }, points: [50, 50] },
			]

			validSegments.forEach((segment) => {
				expect(() => DrawShapeSegment.validate(segment)).not.toThrow()
			})
		})

		it('should reject invalid segment types and points', () => {
			const invalidSegments = [
				{ type: 'invalid', firstPoint: { x: 0, y: 0 }, points: [] },
				{ type: 'free', firstPoint: { x: 0, y: 0 }, points: ['invalid'] },
				{ type: 'free', firstPoint: { x: 0, y: 0 }, points: 'not-array' },
				{}, // Missing required fields
				{ type: 'free', points: [{ x: 0, y: 0 }] }, // Missing firstPoint
			]

			invalidSegments.forEach((segment) => {
				expect(() => DrawShapeSegment.validate(segment)).toThrow()
			})
		})
	})

	describe('drawShapeProps validation schema', () => {
		it('should validate complete valid props object', () => {
			const fullValidator = T.object(drawShapeProps)

			const validProps = {
				color: 'red' as const,
				fill: 'solid' as const,
				dash: 'dashed' as const,
				size: 'l' as const,
				segments: [
					{
						type: 'free' as const,
						firstPoint: { x: 0, y: 0, z: 0.5 },
						points: [],
					},
				],
				isComplete: true,
				isClosed: true,
				isPen: true,
				scale: 1.5,
				zoom: 1,
			}

			expect(() => fullValidator.validate(validProps)).not.toThrow()
		})

		it('should reject invalid property values', () => {
			// Test key invalid cases that matter for business logic
			expect(() => drawShapeProps.scale.validate(0)).toThrow() // zero scale invalid
			expect(() => drawShapeProps.scale.validate(-1)).toThrow() // negative scale invalid
			expect(() => drawShapeProps.zoom.validate(0)).toThrow() // zero zoom invalid
			expect(() => drawShapeProps.zoom.validate(-1)).toThrow() // negative zoom invalid
			expect(() => drawShapeProps.segments.validate('not-array')).toThrow()
			expect(() => drawShapeProps.segments.validate([{ type: 'invalid' }])).toThrow()
		})

		it('should use correct default style validators', () => {
			expect(drawShapeProps.color).toBe(DefaultColorStyle)
			expect(drawShapeProps.fill).toBe(DefaultFillStyle)
			expect(drawShapeProps.dash).toBe(DefaultDashStyle)
			expect(drawShapeProps.size).toBe(DefaultSizeStyle)
		})
	})

	describe('AddInPen migration', () => {
		const { up } = getTestMigration(drawShapeVersions.AddInPen)

		it('should detect pen from non-standard pressure values', () => {
			const recordWithPen = {
				props: {
					segments: [
						{
							type: 'free',
							points: [
								{ x: 0, y: 0, z: 0.3 }, // Non-standard pressure
								{ x: 10, y: 10, z: 0.7 }, // Non-standard pressure
							],
						},
					],
				},
			}

			const result = up(recordWithPen)
			expect(result.props.isPen).toBe(true)
		})

		it('should not detect pen from standard pressure values', () => {
			const recordWithoutPen = {
				props: {
					segments: [
						{
							type: 'free',
							points: [
								{ x: 0, y: 0, z: 0 }, // Standard mouse pressure
								{ x: 10, y: 10, z: 0.5 }, // Standard touch pressure
							],
						},
					],
				},
			}

			const result = up(recordWithoutPen)
			expect(result.props.isPen).toBe(false)
		})

		it('should handle empty segments', () => {
			const recordEmpty = {
				props: {
					segments: [{ type: 'free', points: [] }],
				},
			}

			const result = up(recordEmpty)
			expect(result.props.isPen).toBe(false)
		})

		it('should require both points to have non-standard pressure', () => {
			const recordMixed = {
				props: {
					segments: [
						{
							type: 'free',
							points: [
								{ x: 0, y: 0, z: 0.3 }, // Non-standard
								{ x: 10, y: 10, z: 0.5 }, // Standard
							],
						},
					],
				},
			}

			const result = up(recordMixed)
			expect(result.props.isPen).toBe(false)
		})
	})

	describe('AddScale migration', () => {
		const { up, down } = getTestMigration(drawShapeVersions.AddScale)

		it('should add scale property with default value 1', () => {
			const oldRecord = {
				props: {
					color: 'blue',
					segments: [
						{
							type: 'free',
							firstPoint: { x: 0, y: 0 },
							points: [],
						},
					],
					isPen: false,
				},
			}

			const result = up(oldRecord)
			expect(result.props.scale).toBe(1)
		})

		it('should remove scale property on down migration', () => {
			const newRecord = {
				props: {
					color: 'blue',
					segments: [
						{
							type: 'free',
							firstPoint: { x: 0, y: 0 },
							points: [],
						},
					],
					isPen: false,
					scale: 1.5,
				},
			}

			const result = down(newRecord)
			expect(result.props.scale).toBeUndefined()
			expect(result.props.color).toBe('blue') // Other props preserved
		})
	})

	describe('AddEfficiency migration', () => {
		const { up, down } = getTestMigration(drawShapeVersions.AddEfficiency)

		test('up works as expected for pen shape', () => {
			const oldShape = {
				props: {
					isPen: true,
					segments: [
						{
							type: 'free' as const,
							points: [
								{ x: 10, y: 20, z: 0.5 },
								{ x: 15, y: 25, z: 0.6 },
								{ x: 20, y: 30, z: 0.7 },
							],
						},
					],
				},
			}

			const newShape = {
				props: {
					isPen: true,
					zoom: 1,
					segments: [
						{
							type: 'free' as const,
							firstPoint: { x: 10, y: 20, z: 0.5 },
							points: [0, 0, 0, 50, 50, 1, 50, 50, 1],
						},
					],
				},
			}

			expect(up(oldShape)).toEqual(newShape)
		})

		test('up works as expected for non-pen shape', () => {
			const oldShape = {
				props: {
					isPen: false,
					segments: [
						{
							type: 'free' as const,
							points: [
								{ x: 10, y: 20 },
								{ x: 15, y: 25 },
								{ x: 20, y: 30 },
							],
						},
					],
				},
			}

			const newShape = {
				props: {
					isPen: false,
					zoom: 1,
					segments: [
						{
							type: 'free' as const,
							firstPoint: { x: 10, y: 20 },
							points: [0, 0, 50, 50, 50, 50],
						},
					],
				},
			}

			expect(up(oldShape)).toEqual(newShape)
		})

		test('down works as expected for pen shape', () => {
			const newShape = {
				props: {
					isPen: true,
					zoom: 1,
					segments: [
						{
							type: 'free' as const,
							firstPoint: { x: 10, y: 20, z: 0.5 },
							points: [0, 0, 0, 50, 50, 1, 50, 50, 1],
						},
					],
				},
			}

			const oldShape = {
				props: {
					isPen: true,
					segments: [
						{
							type: 'free' as const,
							points: [
								{ x: 10, y: 20, z: 0.5 },
								{ x: 15, y: 25, z: 0.6 },
								{ x: 20, y: 30, z: 0.7 },
							],
						},
					],
				},
			}

			expect(down(newShape)).toEqual(oldShape)
		})

		test('down works as expected for non-pen shape', () => {
			const newShape = {
				props: {
					isPen: false,
					zoom: 1,
					segments: [
						{
							type: 'free' as const,
							firstPoint: { x: 10, y: 20 },
							points: [0, 0, 50, 50, 50, 50],
						},
					],
				},
			}

			const oldShape = {
				props: {
					isPen: false,
					segments: [
						{
							type: 'free' as const,
							points: [
								{ x: 10, y: 20 },
								{ x: 15, y: 25 },
								{ x: 20, y: 30 },
							],
						},
					],
				},
			}

			expect(down(newShape)).toEqual(oldShape)
		})
	})
})
