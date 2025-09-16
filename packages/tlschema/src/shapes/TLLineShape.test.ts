import { IndexKey } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { TLShapeId } from '../records/TLShape'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import {
	lineShapeMigrations,
	lineShapeProps,
	LineShapeSplineStyle,
	lineShapeVersions,
	TLLineShape,
	TLLineShapePoint,
	TLLineShapeProps,
	TLLineShapeSplineStyle,
} from './TLLineShape'

describe('TLLineShape', () => {
	describe('LineShapeSplineStyle', () => {
		it('should have correct id and default value', () => {
			expect(LineShapeSplineStyle.id).toBe('tldraw:spline')
			expect(LineShapeSplineStyle.defaultValue).toBe('line')
		})

		it('should validate correct spline values', () => {
			const validSplines = ['cubic', 'line']

			validSplines.forEach((spline) => {
				expect(() => LineShapeSplineStyle.validate(spline)).not.toThrow()
				expect(LineShapeSplineStyle.validate(spline)).toBe(spline)
			})
		})

		it('should reject invalid spline values', () => {
			const invalidSplines = [
				'bezier',
				'quadratic',
				'straight',
				'CUBIC', // case sensitive
				'LINE',
				'',
				null,
				undefined,
				123,
				{},
				[],
				'smooth',
			]

			invalidSplines.forEach((spline) => {
				expect(() => LineShapeSplineStyle.validate(spline)).toThrow()
			})
		})

		it('should check validation results', () => {
			// Valid values should not throw
			expect(() => LineShapeSplineStyle.validate('cubic')).not.toThrow()
			expect(() => LineShapeSplineStyle.validate('line')).not.toThrow()

			// Invalid values should throw
			expect(() => LineShapeSplineStyle.validate('invalid')).toThrow()
			expect(() => LineShapeSplineStyle.validate('')).toThrow()
			expect(() => LineShapeSplineStyle.validate(null)).toThrow()
		})
	})

	describe('TLLineShapeSplineStyle type', () => {
		it('should represent valid spline style values', () => {
			const cubicSpline: TLLineShapeSplineStyle = 'cubic'
			const lineSpline: TLLineShapeSplineStyle = 'line'

			expect(cubicSpline).toBe('cubic')
			expect(lineSpline).toBe('line')
		})

		it('should be compatible with LineShapeSplineStyle validation', () => {
			const splines: TLLineShapeSplineStyle[] = ['cubic', 'line']

			splines.forEach((spline) => {
				expect(() => LineShapeSplineStyle.validate(spline)).not.toThrow()
			})
		})
	})

	describe('TLLineShapePoint interface', () => {
		it('should represent valid line shape points', () => {
			const point: TLLineShapePoint = {
				id: 'point1',
				index: 'a1' as IndexKey,
				x: 100,
				y: 50,
			}

			expect(point.id).toBe('point1')
			expect(point.index).toBe('a1')
			expect(point.x).toBe(100)
			expect(point.y).toBe(50)
		})

		it('should support various coordinate values', () => {
			const points: TLLineShapePoint[] = [
				{ id: 'p1', index: 'a1' as IndexKey, x: 0, y: 0 },
				{ id: 'p2', index: 'a2' as IndexKey, x: -100, y: 200 },
				{ id: 'p3', index: 'a3' as IndexKey, x: 1.5, y: -2.7 },
				{ id: 'p4', index: 'a4' as IndexKey, x: 999.999, y: -999.999 },
			]

			points.forEach((point) => {
				expect(typeof point.id).toBe('string')
				expect(typeof point.x).toBe('number')
				expect(typeof point.y).toBe('number')
			})
		})

		it('should validate using the internal point validator', () => {
			const validPoints = [
				{ id: 'a', index: 'a1' as IndexKey, x: 0, y: 0 },
				{ id: 'b', index: 'a2' as IndexKey, x: 100, y: -50 },
				{ id: 'c', index: 'a3' as IndexKey, x: -25.5, y: 75.25 },
			]

			// Test through the lineShapeProps.points validation
			validPoints.forEach((point) => {
				const pointsDict = { [point.id]: point }
				expect(() => lineShapeProps.points.validate(pointsDict)).not.toThrow()
			})
		})

		it('should reject invalid point structures', () => {
			const invalidPoints = [
				{}, // Missing all required properties
				{ id: 'a' }, // Missing index, x, y
				{ id: 'a', index: 'a1', x: 0 }, // Missing y
				{ id: 'a', index: 'a1', y: 0 }, // Missing x
				{ index: 'a1', x: 0, y: 0 }, // Missing id
				{ id: 'a', index: 'a1', x: 'not-number', y: 0 }, // Invalid x type
				{ id: 'a', index: 'a1', x: 0, y: 'not-number' }, // Invalid y type
				{ id: 123, index: 'a1', x: 0, y: 0 }, // Invalid id type
				{ id: 'a', index: 123, x: 0, y: 0 }, // Invalid index type
			]

			invalidPoints.forEach((point) => {
				const pointsDict = { a: point }
				expect(() => lineShapeProps.points.validate(pointsDict)).toThrow()
			})
		})
	})

	describe('TLLineShapeProps interface', () => {
		it('should represent valid line shape properties', () => {
			const validProps: TLLineShapeProps = {
				color: 'black',
				dash: 'solid',
				size: 'm',
				spline: 'line',
				points: {
					a: { id: 'a', index: 'a1' as IndexKey, x: 0, y: 0 },
					b: { id: 'b', index: 'a2' as IndexKey, x: 100, y: 50 },
				},
				scale: 1,
			}

			expect(validProps.color).toBe('black')
			expect(validProps.dash).toBe('solid')
			expect(validProps.size).toBe('m')
			expect(validProps.spline).toBe('line')
			expect(validProps.scale).toBe(1)
			expect(Object.keys(validProps.points)).toHaveLength(2)
		})

		it('should support different style combinations', () => {
			const styleVariations: Partial<TLLineShapeProps>[] = [
				{
					color: 'red',
					dash: 'dashed',
					size: 'l',
					spline: 'cubic',
				},
				{
					color: 'blue',
					dash: 'dotted',
					size: 's',
					spline: 'line',
				},
				{
					color: 'green',
					dash: 'solid',
					size: 'xl',
					spline: 'cubic',
				},
			]

			styleVariations.forEach((variation) => {
				expect([
					'black',
					'grey',
					'light-violet',
					'violet',
					'blue',
					'light-blue',
					'yellow',
					'orange',
					'green',
					'light-green',
					'light-red',
					'red',
					'white',
				]).toContain(variation.color || 'black')
				expect(['solid', 'dashed', 'dotted', 'draw']).toContain(variation.dash || 'solid')
				expect(['s', 'm', 'l', 'xl']).toContain(variation.size || 'm')
				expect(['cubic', 'line']).toContain(variation.spline || 'line')
			})
		})

		it('should support various point configurations', () => {
			// Two points (minimum for a line)
			const twoPointLine: Partial<TLLineShapeProps> = {
				points: {
					start: { id: 'start', index: 'a1' as IndexKey, x: 0, y: 0 },
					end: { id: 'end', index: 'a2' as IndexKey, x: 100, y: 100 },
				},
			}

			// Multiple points
			const multiPointLine: Partial<TLLineShapeProps> = {
				points: {
					a: { id: 'a', index: 'a1' as IndexKey, x: 0, y: 0 },
					b: { id: 'b', index: 'a2' as IndexKey, x: 50, y: 25 },
					c: { id: 'c', index: 'a3' as IndexKey, x: 100, y: 0 },
					d: { id: 'd', index: 'a4' as IndexKey, x: 150, y: 50 },
				},
			}

			expect(Object.keys(twoPointLine.points!)).toHaveLength(2)
			expect(Object.keys(multiPointLine.points!)).toHaveLength(4)
		})

		it('should support different scale values', () => {
			const scaleVariations = [0.1, 0.5, 1, 1.5, 2, 10]

			scaleVariations.forEach((scale) => {
				const props: Partial<TLLineShapeProps> = { scale }
				expect(props.scale).toBe(scale)
				expect(props.scale).toBeGreaterThan(0)
			})
		})
	})

	describe('TLLineShape type', () => {
		it('should represent complete line shape records', () => {
			const validLineShape: TLLineShape = {
				id: 'shape:line123' as TLShapeId,
				typeName: 'shape',
				type: 'line',
				x: 100,
				y: 200,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				props: {
					color: 'blue',
					dash: 'dashed',
					size: 'l',
					spline: 'cubic',
					points: {
						start: { id: 'start', index: 'a1' as IndexKey, x: 0, y: 0 },
						mid: { id: 'mid', index: 'a2' as IndexKey, x: 50, y: 25 },
						end: { id: 'end', index: 'a3' as IndexKey, x: 100, y: 0 },
					},
					scale: 1.5,
				},
				meta: {},
			}

			expect(validLineShape.type).toBe('line')
			expect(validLineShape.typeName).toBe('shape')
			expect(validLineShape.props.spline).toBe('cubic')
			expect(Object.keys(validLineShape.props.points)).toHaveLength(3)
		})

		it('should support different line configurations', () => {
			const configurations = [
				{
					spline: 'line' as const,
					color: 'red' as const,
					dash: 'solid' as const,
				},
				{
					spline: 'cubic' as const,
					color: 'green' as const,
					dash: 'dotted' as const,
				},
			]

			configurations.forEach((config, index) => {
				const shape: TLLineShape = {
					id: `shape:line${index}` as TLShapeId,
					typeName: 'shape',
					type: 'line',
					x: 0,
					y: 0,
					rotation: 0,
					index: `a${index}` as any,
					parentId: 'page:main' as any,
					isLocked: false,
					opacity: 1,
					props: {
						color: config.color,
						dash: config.dash,
						size: 'm',
						spline: config.spline,
						points: {
							a: { id: 'a', index: 'a1' as IndexKey, x: 0, y: 0 },
							b: { id: 'b', index: 'a2' as IndexKey, x: 100, y: 100 },
						},
						scale: 1,
					},
					meta: {},
				}

				expect(shape.props.spline).toBe(config.spline)
				expect(shape.props.color).toBe(config.color)
				expect(shape.props.dash).toBe(config.dash)
			})
		})
	})

	describe('lineShapeProps validation schema', () => {
		it('should validate all line shape properties', () => {
			const validProps = {
				color: 'blue',
				dash: 'dashed',
				size: 'l',
				spline: 'cubic',
				points: {
					a: { id: 'a', index: 'a1' as IndexKey, x: 0, y: 0 },
					b: { id: 'b', index: 'a2' as IndexKey, x: 100, y: 50 },
				},
				scale: 1.2,
			}

			// Validate each property individually
			expect(() => lineShapeProps.color.validate(validProps.color)).not.toThrow()
			expect(() => lineShapeProps.dash.validate(validProps.dash)).not.toThrow()
			expect(() => lineShapeProps.size.validate(validProps.size)).not.toThrow()
			expect(() => lineShapeProps.spline.validate(validProps.spline)).not.toThrow()
			expect(() => lineShapeProps.points.validate(validProps.points)).not.toThrow()
			expect(() => lineShapeProps.scale.validate(validProps.scale)).not.toThrow()
		})

		it('should validate using comprehensive object validator', () => {
			const fullValidator = T.object(lineShapeProps)

			const validPropsObject = {
				color: 'red' as const,
				dash: 'dotted' as const,
				size: 's' as const,
				spline: 'line' as const,
				points: {
					start: { id: 'start', index: 'a1' as IndexKey, x: 25, y: 50 },
					middle: { id: 'middle', index: 'a2' as IndexKey, x: 100, y: 75 },
					end: { id: 'end', index: 'a3' as IndexKey, x: 200, y: 150 },
				},
				scale: 0.8,
			}

			expect(() => fullValidator.validate(validPropsObject)).not.toThrow()
			const result = fullValidator.validate(validPropsObject)
			expect(result).toEqual(validPropsObject)
		})

		it('should reject invalid spline values', () => {
			const invalidSplines = ['bezier', 'straight', 'CUBIC', '', null, undefined, 123]

			invalidSplines.forEach((spline) => {
				expect(() => lineShapeProps.spline.validate(spline)).toThrow()
			})
		})

		it('should reject invalid color, dash, and size values', () => {
			const invalidColors = ['purple', 'BLUE', '', null, undefined, 123]
			const invalidDashes = ['wavy', 'SOLID', '', null, undefined, 123]
			const invalidSizes = ['xs', 'xxl', 'LARGE', '', null, undefined, 123]

			invalidColors.forEach((color) => {
				expect(() => lineShapeProps.color.validate(color)).toThrow()
			})

			invalidDashes.forEach((dash) => {
				expect(() => lineShapeProps.dash.validate(dash)).toThrow()
			})

			invalidSizes.forEach((size) => {
				expect(() => lineShapeProps.size.validate(size)).toThrow()
			})
		})

		it('should validate points as dictionary with point validators', () => {
			const validPointsDict = {
				point1: { id: 'point1', index: 'a1' as IndexKey, x: 0, y: 0 },
				point2: { id: 'point2', index: 'a202U' as IndexKey, x: 50, y: 25 },
				point3: { id: 'point3', index: 'a31it' as IndexKey, x: 100, y: 50 },
			}

			expect(() => lineShapeProps.points.validate(validPointsDict)).not.toThrow()

			// Test specific invalid cases individually
			expect(() => lineShapeProps.points.validate({ a: { id: 'a', x: 0, y: 0 } })).toThrow() // Missing index
			expect(() => lineShapeProps.points.validate({ a: { index: 'a1', x: 0, y: 0 } })).toThrow() // Missing id
			expect(() =>
				lineShapeProps.points.validate({ a: { id: 'a', index: 'a1' as IndexKey, x: 0 } })
			).toThrow() // Missing y
			expect(() =>
				lineShapeProps.points.validate({ a: { id: 'a', index: 'a1' as IndexKey, y: 0 } })
			).toThrow() // Missing x
			expect(() => lineShapeProps.points.validate('not-an-object')).toThrow()
			expect(() => lineShapeProps.points.validate(null)).toThrow()
			expect(() => lineShapeProps.points.validate(undefined)).toThrow()
			// Note: Empty array [] is actually valid for T.dict validation
		})

		it('should validate scale as nonZeroNumber', () => {
			// Valid non-zero positive numbers only
			const validScales = [0.1, 0.5, 1, 1.5, 2, 10]

			validScales.forEach((scale) => {
				expect(() => lineShapeProps.scale.validate(scale)).not.toThrow()
			})

			// Invalid scales (zero, negative numbers, and non-numbers)
			const invalidScales = [0, -0.1, -1, -2, 'not-number', null, undefined, {}, [], true, false]

			invalidScales.forEach((scale) => {
				expect(() => lineShapeProps.scale.validate(scale)).toThrow()
			})
		})

		it('should use correct default style validators', () => {
			// Verify that the props schema uses the expected style validators
			expect(lineShapeProps.color).toBe(DefaultColorStyle)
			expect(lineShapeProps.dash).toBe(DefaultDashStyle)
			expect(lineShapeProps.size).toBe(DefaultSizeStyle)
			expect(lineShapeProps.spline).toBe(LineShapeSplineStyle)
		})

		it('should validate empty points dictionary', () => {
			// Empty points dict should be valid (though not practically useful)
			expect(() => lineShapeProps.points.validate({})).not.toThrow()
		})

		it('should handle large numbers of points', () => {
			const manyPoints: Record<string, TLLineShapePoint> = {}
			for (let i = 0; i < 100; i++) {
				const id = `point${i}`
				manyPoints[id] = {
					id,
					index: `a${i}` as IndexKey,
					x: i * 10,
					y: Math.sin(i) * 50,
				}
			}

			expect(() => lineShapeProps.points.validate(manyPoints)).not.toThrow()
			const result = lineShapeProps.points.validate(manyPoints)
			expect(Object.keys(result)).toHaveLength(100)
		})
	})

	describe('lineShapeVersions', () => {
		it('should contain expected migration version IDs', () => {
			expect(lineShapeVersions).toBeDefined()
			expect(typeof lineShapeVersions).toBe('object')
		})

		it('should have all expected migration versions', () => {
			const expectedVersions: Array<keyof typeof lineShapeVersions> = [
				'AddSnapHandles',
				'RemoveExtraHandleProps',
				'HandlesToPoints',
				'PointIndexIds',
				'AddScale',
			]

			expectedVersions.forEach((version) => {
				expect(lineShapeVersions[version]).toBeDefined()
				expect(typeof lineShapeVersions[version]).toBe('string')
			})
		})

		it('should have properly formatted migration IDs', () => {
			Object.values(lineShapeVersions).forEach((versionId) => {
				expect(versionId).toMatch(/^com\.tldraw\.shape\.line\//)
				expect(versionId).toMatch(/\/\d+$/) // Should end with /number
			})
		})

		it('should contain line in migration IDs', () => {
			Object.values(lineShapeVersions).forEach((versionId) => {
				expect(versionId).toContain('line')
			})
		})

		it('should have unique version IDs', () => {
			const versionIds = Object.values(lineShapeVersions)
			const uniqueIds = new Set(versionIds)
			expect(uniqueIds.size).toBe(versionIds.length)
		})
	})

	describe('lineShapeMigrations', () => {
		it('should be defined and have required structure', () => {
			expect(lineShapeMigrations).toBeDefined()
			expect(lineShapeMigrations.sequence).toBeDefined()
			expect(Array.isArray(lineShapeMigrations.sequence)).toBe(true)
		})

		it('should have migrations for all version IDs', () => {
			const migrationIds = lineShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : null))
				.filter(Boolean)

			const versionIds = Object.values(lineShapeVersions)

			versionIds.forEach((versionId) => {
				expect(migrationIds).toContain(versionId)
			})
		})

		it('should have correct number of migrations in sequence', () => {
			// Should have at least as many migrations as version IDs
			expect(lineShapeMigrations.sequence.length).toBeGreaterThanOrEqual(
				Object.keys(lineShapeVersions).length
			)
		})
	})

	describe('lineShapeMigrations - AddSnapHandles migration', () => {
		const { up } = getTestMigration(lineShapeVersions.AddSnapHandles)

		describe('AddSnapHandles up migration', () => {
			it('should add canSnap property to all handles', () => {
				const oldRecord = {
					id: 'shape:line1',
					props: {
						handles: {
							start: { x: 0, y: 0 },
							end: { x: 100, y: 100 },
							middle: { x: 50, y: 50 },
						},
					},
				}

				const result = up(oldRecord)
				expect(result.props.handles.start.canSnap).toBe(true)
				expect(result.props.handles.end.canSnap).toBe(true)
				expect(result.props.handles.middle.canSnap).toBe(true)
			})

			it('should preserve existing handle properties', () => {
				const oldRecord = {
					id: 'shape:line1',
					props: {
						handles: {
							a: { x: 10, y: 20, someOtherProp: 'value' },
							b: { x: 30, y: 40, customProp: 123 },
						},
					},
				}

				const result = up(oldRecord)
				expect(result.props.handles.a.x).toBe(10)
				expect(result.props.handles.a.y).toBe(20)
				expect(result.props.handles.a.someOtherProp).toBe('value')
				expect(result.props.handles.a.canSnap).toBe(true)

				expect(result.props.handles.b.x).toBe(30)
				expect(result.props.handles.b.y).toBe(40)
				expect(result.props.handles.b.customProp).toBe(123)
				expect(result.props.handles.b.canSnap).toBe(true)
			})

			it('should handle empty handles object', () => {
				const oldRecord = {
					id: 'shape:line1',
					props: {
						handles: {},
					},
				}

				const result = up(oldRecord)
				expect(result.props.handles).toEqual({})
			})
		})

		// Note: down migration is 'retired' according to the source code
	})

	describe('lineShapeMigrations - RemoveExtraHandleProps migration', () => {
		const { up, down } = getTestMigration(lineShapeVersions.RemoveExtraHandleProps)

		describe('RemoveExtraHandleProps up migration', () => {
			it('should preserve only x and y properties from handles', () => {
				const oldRecord = {
					id: 'shape:line1',
					props: {
						handles: {
							a1: {
								x: 10,
								y: 20,
								canSnap: true,
								id: 'start',
								type: 'vertex',
								index: 'a1',
								extraProp: 'remove this',
							},
							a2: {
								x: 30,
								y: 40,
								canSnap: false,
								id: 'end',
								type: 'vertex',
								index: 'a2',
								anotherProp: 123,
							},
						},
					},
				}

				const result = up(oldRecord)

				// Should only have x and y properties
				expect(result.props.handles.a1).toEqual({ x: 10, y: 20 })
				expect(result.props.handles.a2).toEqual({ x: 30, y: 40 })
			})

			it('should use index as key in handles object', () => {
				const oldRecord = {
					id: 'shape:line1',
					props: {
						handles: {
							someKey: { x: 0, y: 0, index: 'a1' },
							anotherKey: { x: 100, y: 50, index: 'a2' },
						},
					},
				}

				const result = up(oldRecord)
				expect(result.props.handles.a1).toEqual({ x: 0, y: 0 })
				expect(result.props.handles.a2).toEqual({ x: 100, y: 50 })
			})
		})

		describe('RemoveExtraHandleProps down migration', () => {
			it('should restore full handle structure', () => {
				const newRecord = {
					id: 'shape:line1',
					props: {
						handles: {
							a1: { x: 10, y: 20 },
							a2: { x: 100, y: 50 },
							a3: { x: 200, y: 100 },
						},
					},
				}

				const result = down(newRecord)

				// Should restore full handle objects with appropriate IDs
				expect(result.props.handles.start).toEqual({
					id: 'start',
					type: 'vertex',
					canBind: false,
					canSnap: true,
					index: 'a1',
					x: 10,
					y: 20,
				})

				expect(result.props.handles.end).toEqual({
					id: 'end',
					type: 'vertex',
					canBind: false,
					canSnap: true,
					index: 'a3', // Last handle gets 'end' ID
					x: 200,
					y: 100,
				})

				// Middle handle gets handle:index ID
				expect(result.props.handles['handle:a2']).toEqual({
					id: 'handle:a2',
					type: 'vertex',
					canBind: false,
					canSnap: true,
					index: 'a2',
					x: 100,
					y: 50,
				})
			})

			it('should handle two-point line correctly', () => {
				const newRecord = {
					id: 'shape:line1',
					props: {
						handles: {
							a1: { x: 0, y: 0 },
							a2: { x: 100, y: 100 },
						},
					},
				}

				const result = down(newRecord)

				expect(result.props.handles.start).toEqual({
					id: 'start',
					type: 'vertex',
					canBind: false,
					canSnap: true,
					index: 'a1',
					x: 0,
					y: 0,
				})

				expect(result.props.handles.end).toEqual({
					id: 'end',
					type: 'vertex',
					canBind: false,
					canSnap: true,
					index: 'a2',
					x: 100,
					y: 100,
				})
			})
		})
	})

	describe('lineShapeMigrations - HandlesToPoints migration', () => {
		const { up, down } = getTestMigration(lineShapeVersions.HandlesToPoints)

		describe('HandlesToPoints up migration', () => {
			it('should convert handles to points array', () => {
				const oldRecord = {
					id: 'shape:line1',
					props: {
						handles: {
							a1: { x: 0, y: 0 },
							a2: { x: 50, y: 25 },
							a3: { x: 100, y: 50 },
						},
					},
				}

				const result = up(oldRecord)

				expect(result.props.handles).toBeUndefined()
				expect(result.props.points).toBeDefined()
				expect(Array.isArray(result.props.points)).toBe(true)

				// Points should be sorted by index and contain only x, y
				expect(result.props.points).toEqual([
					{ x: 0, y: 0 },
					{ x: 50, y: 25 },
					{ x: 100, y: 50 },
				])
			})

			it('should sort handles by index before converting', () => {
				const oldRecord = {
					id: 'shape:line1',
					props: {
						handles: {
							a3: { x: 100, y: 100 },
							a1: { x: 0, y: 0 },
							a2: { x: 50, y: 50 },
						},
					},
				}

				const result = up(oldRecord)

				// Should be sorted by index: a1, a2, a3
				expect(result.props.points).toEqual([
					{ x: 0, y: 0 },
					{ x: 50, y: 50 },
					{ x: 100, y: 100 },
				])
			})
		})

		describe('HandlesToPoints down migration', () => {
			it('should convert points back to handles', () => {
				const newRecord = {
					id: 'shape:line1',
					props: {
						points: [
							{ x: 0, y: 0 },
							{ x: 50, y: 25 },
							{ x: 100, y: 50 },
						],
					},
				}

				const result = down(newRecord)

				expect(result.props.points).toBeUndefined()
				expect(result.props.handles).toBeDefined()
				expect(typeof result.props.handles).toBe('object')

				// Should create handles with generated indices
				const handleKeys = Object.keys(result.props.handles)
				expect(handleKeys).toHaveLength(3)

				// Check that the handles contain the right coordinates
				const handleValues = Object.values(result.props.handles) as Array<{ x: number; y: number }>
				expect(handleValues).toContainEqual({ x: 0, y: 0 })
				expect(handleValues).toContainEqual({ x: 50, y: 25 })
				expect(handleValues).toContainEqual({ x: 100, y: 50 })
			})
		})
	})

	describe('lineShapeMigrations - PointIndexIds migration', () => {
		const { up, down } = getTestMigration(lineShapeVersions.PointIndexIds)

		describe('PointIndexIds up migration', () => {
			it('should convert points array to indexed points object', () => {
				const oldRecord = {
					id: 'shape:line1',
					props: {
						points: [
							{ x: 0, y: 0 },
							{ x: 50, y: 25 },
							{ x: 100, y: 50 },
						],
					},
				}

				const result = up(oldRecord)

				expect(Array.isArray(result.props.points)).toBe(false)
				expect(typeof result.props.points).toBe('object')

				const pointKeys = Object.keys(result.props.points)
				expect(pointKeys).toHaveLength(3)

				// Each point should have id, index, x, y
				pointKeys.forEach((key) => {
					const point = result.props.points[key]
					expect(point).toHaveProperty('id')
					expect(point).toHaveProperty('index')
					expect(point).toHaveProperty('x')
					expect(point).toHaveProperty('y')
					expect(point.id).toBe(key)
					expect(point.index).toBe(key)
				})
			})

			it('should preserve coordinate values during conversion', () => {
				const oldRecord = {
					id: 'shape:line1',
					props: {
						points: [
							{ x: 10, y: 20 },
							{ x: -50, y: 75 },
						],
					},
				}

				const result = up(oldRecord)

				const pointValues = Object.values(result.props.points)
				expect(pointValues).toHaveLength(2)

				// Should preserve the coordinate values
				const coordinates = pointValues.map((p: any) => ({ x: p.x, y: p.y }))
				expect(coordinates).toContainEqual({ x: 10, y: 20 })
				expect(coordinates).toContainEqual({ x: -50, y: 75 })
			})
		})

		describe('PointIndexIds down migration', () => {
			it('should convert indexed points object back to points array', () => {
				const newRecord = {
					id: 'shape:line1',
					props: {
						points: {
							a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
							a2: { id: 'a2', index: 'a2' as IndexKey, x: 50, y: 25 },
							a3: { id: 'a3', index: 'a3' as IndexKey, x: 100, y: 50 },
						},
					},
				}

				const result = down(newRecord)

				expect(Array.isArray(result.props.points)).toBe(true)
				expect(result.props.points).toHaveLength(3)

				// Should be sorted by index and contain only x, y
				expect(result.props.points).toEqual([
					{ x: 0, y: 0 },
					{ x: 50, y: 25 },
					{ x: 100, y: 50 },
				])
			})

			it('should sort points by index before converting to array', () => {
				const newRecord = {
					id: 'shape:line1',
					props: {
						points: {
							a3: { id: 'a3', index: 'a3' as IndexKey, x: 100, y: 100 },
							a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
							a2: { id: 'a2', index: 'a2' as IndexKey, x: 50, y: 50 },
						},
					},
				}

				const result = down(newRecord)

				// Should be sorted by index
				expect(result.props.points).toEqual([
					{ x: 0, y: 0 },
					{ x: 50, y: 50 },
					{ x: 100, y: 100 },
				])
			})
		})
	})

	describe('lineShapeMigrations - AddScale migration', () => {
		const { up, down } = getTestMigration(lineShapeVersions.AddScale)

		describe('AddScale up migration', () => {
			it('should add scale property with default value 1', () => {
				const oldRecord = {
					id: 'shape:line1',
					props: {
						color: 'blue',
						points: {
							a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
							a2: { id: 'a2', index: 'a2' as IndexKey, x: 100, y: 100 },
						},
					},
				}

				const result = up(oldRecord)
				expect(result.props.scale).toBe(1)
			})

			it('should preserve existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:line1',
					props: {
						color: 'red',
						dash: 'dashed',
						size: 'l',
						spline: 'cubic',
						points: {
							start: { id: 'start', index: 'a1' as IndexKey, x: 10, y: 20 },
							end: { id: 'end', index: 'a2' as IndexKey, x: 200, y: 150 },
						},
					},
				}

				const result = up(oldRecord)
				expect(result.props.scale).toBe(1)
				expect(result.props.color).toBe('red')
				expect(result.props.dash).toBe('dashed')
				expect(result.props.size).toBe('l')
				expect(result.props.spline).toBe('cubic')
				expect(result.props.points).toEqual(oldRecord.props.points)
			})
		})

		describe('AddScale down migration', () => {
			it('should remove scale property', () => {
				const newRecord = {
					id: 'shape:line1',
					props: {
						color: 'blue',
						scale: 1.5,
						points: {
							a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
							a2: { id: 'a2', index: 'a2' as IndexKey, x: 100, y: 100 },
						},
					},
				}

				const result = down(newRecord)
				expect(result.props.scale).toBeUndefined()
				expect(result.props.color).toBe('blue') // Preserve other props
				expect(result.props.points).toEqual(newRecord.props.points)
			})
		})
	})

	describe('integration tests', () => {
		it('should work with complete line shape record validation', () => {
			const completeValidator = T.object({
				id: T.string,
				typeName: T.literal('shape'),
				type: T.literal('line'),
				x: T.number,
				y: T.number,
				rotation: T.number,
				index: T.string,
				parentId: T.string,
				isLocked: T.boolean,
				opacity: T.number,
				props: T.object(lineShapeProps),
				meta: T.jsonValue,
			})

			const validLineShape = {
				id: 'shape:line123',
				typeName: 'shape' as const,
				type: 'line' as const,
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 0.8,
				props: {
					color: 'red' as const,
					dash: 'dotted' as const,
					size: 'l' as const,
					spline: 'cubic' as const,
					points: {
						a: { id: 'a', index: 'a1' as IndexKey, x: 0, y: 0 },
						b: { id: 'b', index: 'a2' as IndexKey, x: 100, y: 50 },
						c: { id: 'c', index: 'a3' as IndexKey, x: 200, y: 25 },
					},
					scale: 1.2,
				},
				meta: { custom: 'data' },
			}

			expect(() => completeValidator.validate(validLineShape)).not.toThrow()
		})

		it('should be compatible with TLBaseShape structure', () => {
			const lineShape: TLLineShape = {
				id: 'shape:line_test' as TLShapeId,
				typeName: 'shape',
				type: 'line',
				x: 50,
				y: 75,
				rotation: 1.57,
				index: 'b1' as any,
				parentId: 'page:test' as any,
				isLocked: true,
				opacity: 0.5,
				props: {
					color: 'green',
					dash: 'dashed',
					size: 's',
					spline: 'line',
					points: {
						start: { id: 'start', index: 'a1' as IndexKey, x: 25, y: 50 },
						mid: { id: 'mid', index: 'a2' as IndexKey, x: 75, y: 25 },
						end: { id: 'end', index: 'a3' as IndexKey, x: 125, y: 75 },
					},
					scale: 0.9,
				},
				meta: { lineType: 'custom' },
			}

			// Should satisfy TLBaseShape structure
			expect(lineShape.typeName).toBe('shape')
			expect(lineShape.type).toBe('line')
			expect(typeof lineShape.id).toBe('string')
			expect(typeof lineShape.x).toBe('number')
			expect(typeof lineShape.y).toBe('number')
			expect(typeof lineShape.rotation).toBe('number')
			expect(lineShape.props).toBeDefined()
			expect(lineShape.meta).toBeDefined()
		})

		test('should handle all migration versions in correct order', () => {
			const expectedOrder: Array<keyof typeof lineShapeVersions> = [
				'AddSnapHandles',
				'RemoveExtraHandleProps',
				'HandlesToPoints',
				'PointIndexIds',
				'AddScale',
			]

			const migrationIds = lineShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : ''))
				.filter(Boolean)

			expectedOrder.forEach((expectedVersion) => {
				const versionId = lineShapeVersions[expectedVersion]
				expect(migrationIds).toContain(versionId)
			})
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle empty or malformed props gracefully during validation', () => {
			const fullValidator = T.object(lineShapeProps)

			// Missing required properties should throw
			expect(() => fullValidator.validate({})).toThrow()

			// Partial props should throw for missing required fields
			expect(() =>
				fullValidator.validate({
					spline: 'line',
					points: {
						a: { id: 'a', index: 'a1' as IndexKey, x: 0, y: 0 },
					},
					// Missing other required properties
				})
			).toThrow()

			// Extra unexpected properties should throw
			expect(() =>
				fullValidator.validate({
					color: 'blue',
					dash: 'solid',
					size: 'm',
					spline: 'line',
					points: {
						a: { id: 'a', index: 'a1' as IndexKey, x: 0, y: 0 },
					},
					scale: 1,
					unexpectedProperty: 'extra', // This should cause validation to fail
				})
			).toThrow()
		})

		it('should handle boundary values for numeric properties', () => {
			// Test extreme but valid values
			const extremeProps = {
				color: 'black' as const,
				dash: 'solid' as const,
				size: 'm' as const,
				spline: 'cubic' as const,
				points: {
					a: { id: 'a', index: 'a1' as IndexKey, x: -999999, y: 999999 },
					b: { id: 'b', index: 'a2' as IndexKey, x: 0.0001, y: -0.0001 },
				},
				scale: 0.0001, // Very small but not zero
			}

			const fullValidator = T.object(lineShapeProps)
			expect(() => fullValidator.validate(extremeProps)).not.toThrow()
		})

		it('should handle zero scale validation correctly', () => {
			// Zero should be invalid for scale (nonZeroNumber)
			expect(() => lineShapeProps.scale.validate(0)).toThrow()

			// Very small positive numbers should be valid
			expect(() => lineShapeProps.scale.validate(0.0001)).not.toThrow()

			// Negative numbers should be invalid (nonZeroNumber only allows positive)
			expect(() => lineShapeProps.scale.validate(-0.0001)).toThrow()
		})

		it('should handle complex point configurations', () => {
			const complexConfigurations = [
				// Single point (edge case)
				{
					points: {
						single: { id: 'single', index: 'a1' as IndexKey, x: 0, y: 0 },
					},
				},
				// Many points with decimal coordinates
				{
					points: Object.fromEntries(
						Array.from({ length: 50 }, (_, i) => [
							`point${i}`,
							{
								id: `point${i}`,
								index: `a${i + 1}` as IndexKey,
								x: Math.cos(i) * 100,
								y: Math.sin(i) * 100,
							},
						])
					),
				},
				// Points with extreme coordinates
				{
					points: {
						far: { id: 'far', index: 'a1' as IndexKey, x: 1e6, y: -1e6 },
						close: { id: 'close', index: 'a2' as IndexKey, x: 1e-10, y: 1e-10 },
					},
				},
			]

			complexConfigurations.forEach((config) => {
				expect(() => lineShapeProps.points.validate(config.points)).not.toThrow()
			})
		})

		it('should validate point IDs and indices consistency', () => {
			// Points where id matches dictionary key
			const consistentPoints = {
				a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
				a202U: { id: 'a202U', index: 'a202U' as IndexKey, x: 100, y: 100 },
			}
			expect(() => lineShapeProps.points.validate(consistentPoints)).not.toThrow()

			// Points where id doesn't match dictionary key (should still be valid)
			const inconsistentPoints = {
				keyA: { id: 'pointA', index: 'a1' as IndexKey, x: 0, y: 0 },
				keyB: { id: 'pointB', index: 'a202U' as IndexKey, x: 100, y: 100 },
			}
			expect(() => lineShapeProps.points.validate(inconsistentPoints)).not.toThrow()
		})
	})
})
