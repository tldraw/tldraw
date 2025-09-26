import { IndexKey } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import {
	lineShapeMigrations,
	lineShapeProps,
	LineShapeSplineStyle,
	lineShapeVersions,
} from './TLLineShape'

describe('TLLineShape', () => {
	describe('LineShapeSplineStyle', () => {
		it('should validate correct spline values', () => {
			expect(() => LineShapeSplineStyle.validate('cubic')).not.toThrow()
			expect(() => LineShapeSplineStyle.validate('line')).not.toThrow()
		})

		it('should reject invalid spline values', () => {
			expect(() => LineShapeSplineStyle.validate('bezier')).toThrow()
			expect(() => LineShapeSplineStyle.validate('')).toThrow()
			expect(() => LineShapeSplineStyle.validate(null)).toThrow()
		})
	})

	describe('lineShapeProps validation schema', () => {
		it('should validate complete props object', () => {
			const fullValidator = T.object(lineShapeProps)
			const validProps = {
				color: 'red' as const,
				dash: 'dotted' as const,
				size: 's' as const,
				spline: 'line' as const,
				points: {
					start: { id: 'start', index: 'a1' as IndexKey, x: 0, y: 0 },
					end: { id: 'end', index: 'a2' as IndexKey, x: 100, y: 50 },
				},
				scale: 1.5,
			}

			expect(() => fullValidator.validate(validProps)).not.toThrow()
		})

		it('should validate points dictionary structure', () => {
			const validPoints = {
				a: { id: 'a', index: 'a1' as IndexKey, x: 0, y: 0 },
				b: { id: 'b', index: 'a2' as IndexKey, x: 100, y: 50 },
			}
			expect(() => lineShapeProps.points.validate(validPoints)).not.toThrow()

			// Invalid point structures
			expect(() => lineShapeProps.points.validate({ a: { id: 'a', x: 0, y: 0 } })).toThrow() // Missing index
			expect(() => lineShapeProps.points.validate({ a: { index: 'a1', x: 0, y: 0 } })).toThrow() // Missing id
		})

		it('should validate scale as nonZeroNumber', () => {
			expect(() => lineShapeProps.scale.validate(1.5)).not.toThrow()
			expect(() => lineShapeProps.scale.validate(0)).toThrow() // Zero should be invalid
			expect(() => lineShapeProps.scale.validate(-1)).toThrow() // Negative should be invalid
		})
	})

	describe('lineShapeMigrations - AddSnapHandles migration', () => {
		const { up } = getTestMigration(lineShapeVersions.AddSnapHandles)

		it('should add canSnap property to all handles', () => {
			const oldRecord = {
				id: 'shape:line1',
				props: {
					handles: {
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
					},
				},
			}

			const result = up(oldRecord)
			expect(result.props.handles.start.canSnap).toBe(true)
			expect(result.props.handles.end.canSnap).toBe(true)
		})
	})

	describe('lineShapeMigrations - RemoveExtraHandleProps migration', () => {
		const { up, down } = getTestMigration(lineShapeVersions.RemoveExtraHandleProps)

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
					},
				},
			}

			const result = up(oldRecord)
			expect(result.props.handles.a1).toEqual({ x: 10, y: 20 })
		})

		it('should restore full handle structure in down migration', () => {
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
		})
	})

	describe('lineShapeMigrations - HandlesToPoints migration', () => {
		const { up, down } = getTestMigration(lineShapeVersions.HandlesToPoints)

		it('should convert handles to points array', () => {
			const oldRecord = {
				id: 'shape:line1',
				props: {
					handles: {
						a1: { x: 0, y: 0 },
						a2: { x: 50, y: 25 },
					},
				},
			}

			const result = up(oldRecord)
			expect(result.props.handles).toBeUndefined()
			expect(result.props.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 50, y: 25 },
			])
		})

		it('should convert points back to handles', () => {
			const newRecord = {
				id: 'shape:line1',
				props: {
					points: [
						{ x: 0, y: 0 },
						{ x: 100, y: 50 },
					],
				},
			}

			const result = down(newRecord)
			expect(result.props.points).toBeUndefined()
			expect(result.props.handles).toBeDefined()
			expect(Object.keys(result.props.handles)).toHaveLength(2)
		})
	})

	describe('lineShapeMigrations - PointIndexIds migration', () => {
		const { up, down } = getTestMigration(lineShapeVersions.PointIndexIds)

		it('should convert points array to indexed points object', () => {
			const oldRecord = {
				id: 'shape:line1',
				props: {
					points: [
						{ x: 0, y: 0 },
						{ x: 50, y: 25 },
					],
				},
			}

			const result = up(oldRecord)
			expect(Array.isArray(result.props.points)).toBe(false)
			expect(typeof result.props.points).toBe('object')

			const pointKeys = Object.keys(result.props.points)
			expect(pointKeys).toHaveLength(2)

			// Each point should have id, index, x, y
			pointKeys.forEach((key) => {
				const point = result.props.points[key]
				expect(point.id).toBe(key)
				expect(point.index).toBe(key)
			})
		})

		it('should convert indexed points object back to points array', () => {
			const newRecord = {
				id: 'shape:line1',
				props: {
					points: {
						a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
						a2: { id: 'a2', index: 'a2' as IndexKey, x: 50, y: 25 },
					},
				},
			}

			const result = down(newRecord)
			expect(Array.isArray(result.props.points)).toBe(true)
			expect(result.props.points).toEqual([
				{ x: 0, y: 0 },
				{ x: 50, y: 25 },
			])
		})
	})

	describe('lineShapeMigrations - AddScale migration', () => {
		const { up, down } = getTestMigration(lineShapeVersions.AddScale)

		it('should add scale property with default value 1', () => {
			const oldRecord = {
				id: 'shape:line1',
				props: {
					color: 'blue',
					points: {
						a1: { id: 'a1', index: 'a1' as IndexKey, x: 0, y: 0 },
					},
				},
			}

			const result = up(oldRecord)
			expect(result.props.scale).toBe(1)
			expect(result.props.color).toBe('blue')
		})

		it('should remove scale property in down migration', () => {
			const newRecord = {
				id: 'shape:line1',
				props: {
					color: 'blue',
					scale: 1.5,
					points: {},
				},
			}

			const result = down(newRecord)
			expect(result.props.scale).toBeUndefined()
			expect(result.props.color).toBe('blue')
		})
	})

	describe('migration integration', () => {
		it('should have migrations for all version IDs', () => {
			const migrationIds = lineShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : ''))
				.filter(Boolean)

			const versionIds = Object.values(lineShapeVersions)
			versionIds.forEach((versionId) => {
				expect(migrationIds).toContain(versionId)
			})
		})
	})
})
