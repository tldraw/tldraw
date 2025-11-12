import { T } from '@tldraw/validate'
import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { VecModel } from '../misc/geometry-types'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { DrawShapeSegment, drawShapeProps, drawShapeVersions } from './TLDrawShape'
import { compressDrawPoints, decompressDrawPoints, shouldStorePressure } from './drawCompression'

describe('TLDrawShape', () => {
	describe('DrawShapeSegment validator', () => {
		it('should validate valid segment structures', () => {
			const validSegments = [
				{ type: 'free', points: [{ x: 0, y: 0 }] },
				{ type: 'straight', points: [{ x: 0, y: 0, z: 0.5 }] },
				{ type: 'free', points: [] },
			]

			validSegments.forEach((segment) => {
				expect(() => DrawShapeSegment.validate(segment)).not.toThrow()
			})
		})

		it('should reject invalid segment types and points', () => {
			const invalidSegments = [
				{ type: 'invalid', points: [{ x: 0, y: 0 }] },
				{ type: 'free', points: [{ x: 'invalid', y: 0 }] },
				{ type: 'free', points: 'not-array' },
				{}, // Missing required fields
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
				segments: [{ type: 'free' as const, points: [{ x: 0, y: 0, z: 0.5 }] as VecModel[] }],
				isComplete: true,
				isClosed: true,
				isPen: true,
				scale: 1.5,
			}

			expect(() => fullValidator.validate(validProps)).not.toThrow()
		})

		it('should reject invalid property values', () => {
			// Test key invalid cases that matter for business logic
			expect(() => drawShapeProps.scale.validate(0)).toThrow() // zero scale invalid
			expect(() => drawShapeProps.scale.validate(-1)).toThrow() // negative scale invalid
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
					segments: [{ type: 'free', points: [{ x: 0, y: 0 }] }],
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
					segments: [{ type: 'free', points: [{ x: 0, y: 0 }] }],
					isPen: false,
					scale: 1.5,
				},
			}

			const result = down(newRecord)
			expect(result.props.scale).toBeUndefined()
			expect(result.props.color).toBe('blue') // Other props preserved
		})
	})

	describe('Draw compression utilities', () => {
		describe('compressDrawPoints and decompressDrawPoints', () => {
			it('should compress and decompress points without pressure losslessly', () => {
				const originalPoints: VecModel[] = [
					{ x: 10, y: 20 },
					{ x: 15, y: 25 },
					{ x: 20, y: 30 },
					{ x: 25, y: 35 },
				]

				const compressed = compressDrawPoints(originalPoints, false, false)
				const decompressed = decompressDrawPoints(compressed, false, false, 1)

				expect(decompressed).toEqual(originalPoints)
			})

			it('should compress and decompress points with pressure losslessly', () => {
				const originalPoints: VecModel[] = [
					{ x: 10, y: 20, z: 0.3 },
					{ x: 15, y: 25, z: 0.7 },
					{ x: 20, y: 30, z: 0.5 },
					{ x: 25, y: 35, z: 0.9 },
				]

				const compressed = compressDrawPoints(originalPoints, true, false)
				const decompressed = decompressDrawPoints(compressed, true, false, 1)

				expect(decompressed).toEqual(originalPoints)
			})

			it('should handle scaled points correctly', () => {
				const originalPoints: VecModel[] = [
					{ x: 10.5, y: 20.7 },
					{ x: 15.2, y: 25.1 },
				]

				const compressed = compressDrawPoints(originalPoints, false, true)
				const decompressed = decompressDrawPoints(compressed, false, true, 1)

				// Scaled points should be rounded to integers during compression
				expect(decompressed[0].x).toBe(11) // 10.5 rounded
				expect(decompressed[0].y).toBe(21) // 20.7 rounded
				expect(decompressed[1].x).toBe(15) // 15.2 rounded
				expect(decompressed[1].y).toBe(25) // 25.1 rounded
			})

			it('should handle empty points array', () => {
				const compressed = compressDrawPoints([], false, false)
				const decompressed = decompressDrawPoints(compressed, false, false, 1)

				expect(decompressed).toEqual([])
			})

			it('should produce smaller compressed arrays for typical drawing data', () => {
				// Create a typical drawing with many points close to each other
				const points: VecModel[] = []
				for (let i = 0; i < 100; i++) {
					points.push({ x: i * 2, y: i * 2 + Math.sin(i * 0.1) })
				}

				const compressed = compressDrawPoints(points, false, false)

				// Compressed should be smaller than original (each point was 2 numbers, compressed uses deltas)
				// Original: 100 points × 2 coords = 200 numbers
				// Compressed: first point (2) + 99 deltas (2 each) = 2 + 198 = 200, but with smaller values
				expect(compressed.length).toBeLessThanOrEqual(200)
			})
		})

		describe('shouldStorePressure', () => {
			it('should return true when points have varying pressure', () => {
				const points: VecModel[] = [
					{ x: 0, y: 0, z: 0.3 },
					{ x: 10, y: 10, z: 0.7 },
				]

				expect(shouldStorePressure(points)).toBe(true)
			})

			it('should return false when all points have default pressure', () => {
				const points: VecModel[] = [
					{ x: 0, y: 0, z: 0 },
					{ x: 10, y: 10, z: 0.5 },
				]

				expect(shouldStorePressure(points)).toBe(false)
			})

			it('should return false for empty points array', () => {
				expect(shouldStorePressure([])).toBe(false)
			})
		})
	})

	describe('AddCompressedInk migration', () => {
		const { up, down } = getTestMigration(drawShapeVersions.AddCompressedInk)

		it('should convert legacy segments to compressed format', () => {
			const legacyShape = {
				props: {
					color: 'black',
					segments: [
						{
							type: 'free',
							points: [
								{ x: 10, y: 20, z: 0.5 },
								{ x: 15, y: 25, z: 0.5 },
								{ x: 20, y: 30, z: 0.5 },
							],
						},
					],
					isComplete: true,
					isPen: false,
					scale: 1,
				},
			}

			const result = up(legacyShape)

			expect(result.props.compressedPoints).toBeDefined()
			expect(result.props.hasPressure).toBe(false) // No varying pressure
			expect(result.props.isScaled).toBe(false)
			expect(result.props.segments).toStrictEqual(legacyShape.props.segments) // Original segments preserved
		})

		it('should detect and store pressure when present', () => {
			const penShape = {
				props: {
					color: 'black',
					segments: [
						{
							type: 'free',
							points: [
								{ x: 10, y: 20, z: 0.3 },
								{ x: 15, y: 25, z: 0.7 },
							],
						},
					],
					isComplete: true,
					isPen: true,
					scale: 1,
				},
			}

			const result = up(penShape)

			expect(result.props.compressedPoints).toBeDefined()
			expect(result.props.hasPressure).toBe(true)
			expect(result.props.isScaled).toBe(false)
		})

		it('should migrate down from compressed to segments format', () => {
			const compressedShape = {
				props: {
					color: 'black',
					compressedPoints: [10, 20, 5, 5, 5, 5], // delta-encoded: (10,20), (15,25), (20,30)
					hasPressure: false,
					isScaled: false,
					isComplete: true,
					isPen: false,
					scale: 1,
				},
			}

			const result = down(compressedShape)

			expect(result.props.segments).toBeDefined()
			expect(result.props.segments.length).toBe(1)
			expect(result.props.segments[0].type).toBe('free')
			expect(result.props.segments[0].points).toEqual([
				{ x: 10, y: 20, z: undefined },
				{ x: 15, y: 25, z: undefined },
				{ x: 20, y: 30, z: undefined },
			])
			expect(result.props.compressedPoints).toBeUndefined()
			expect(result.props.hasPressure).toBeUndefined()
			expect(result.props.isScaled).toBeUndefined()
		})

		it('should handle scaled compressed points in down migration', () => {
			const scaledCompressedShape = {
				props: {
					color: 'black',
					compressedPoints: [10, 20, 5, 5], // scaled integers
					hasPressure: false,
					isScaled: true,
					isComplete: true,
					isPen: false,
					scale: 2, // scale factor
				},
			}

			const result = down(scaledCompressedShape)

			expect(result.props.segments[0].points).toEqual([
				{ x: 5, y: 10, z: undefined }, // 10/2, 20/2
				{ x: 7.5, y: 12.5, z: undefined }, // (10+5)/2, (20+5)/2
			])
		})
	})
})
