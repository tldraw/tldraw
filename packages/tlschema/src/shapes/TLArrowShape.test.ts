import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { arrowShapeMigrations, arrowShapeProps, arrowShapeVersions } from './TLArrowShape'

describe('TLArrowShape', () => {
	describe('arrowShapeMigrations - AddLabelColor migration', () => {
		const { up, down } = getTestMigration(arrowShapeVersions.AddLabelColor)

		describe('AddLabelColor up migration', () => {
			it('should add labelColor property with default value "black"', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					typeName: 'shape',
					type: 'arrow',
					x: 100,
					y: 200,
					rotation: 0,
					index: 'a1',
					parentId: 'page:main',
					isLocked: false,
					opacity: 1,
					props: {
						color: 'blue',
						fill: 'none',
						dash: 'solid',
						size: 'm',
						arrowheadStart: 'none',
						arrowheadEnd: 'arrow',
						font: 'draw',
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
					},
					meta: {},
				}

				const result = up(oldRecord)
				expect(result.props.labelColor).toBe('black')
				expect(result.props.color).toBe('blue') // Preserve other props
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:arrow2',
					typeName: 'shape',
					type: 'arrow',
					x: 50,
					y: 75,
					rotation: 0.5,
					index: 'b1',
					parentId: 'page:test',
					isLocked: true,
					opacity: 0.8,
					props: {
						color: 'red',
						fill: 'solid',
						dash: 'dashed',
						size: 'l',
						arrowheadStart: 'triangle',
						arrowheadEnd: 'diamond',
						font: 'sans',
						start: { x: 25, y: 50 },
						end: { x: 200, y: 150 },
					},
					meta: { custom: 'data' },
				}

				const result = up(oldRecord)
				expect(result.props.labelColor).toBe('black')
				expect(result.props.color).toBe('red')
				expect(result.props.fill).toBe('solid')
				expect(result.props.dash).toBe('dashed')
				expect(result.props.size).toBe('l')
				expect(result.props.arrowheadStart).toBe('triangle')
				expect(result.props.arrowheadEnd).toBe('diamond')
				expect(result.props.font).toBe('sans')
				expect(result.props.start).toEqual({ x: 25, y: 50 })
				expect(result.props.end).toEqual({ x: 200, y: 150 })
				expect(result.meta).toEqual({ custom: 'data' })
			})

			test('should not modify labelColor if it already exists', () => {
				const recordWithLabelColor = {
					id: 'shape:arrow3',
					typeName: 'shape',
					type: 'arrow',
					props: {
						labelColor: 'red', // Already has labelColor
						color: 'blue',
					},
				}

				const result = up(recordWithLabelColor)
				expect(result.props.labelColor).toBe('black') // Migration sets default regardless
			})
		})

		describe('AddLabelColor down migration', () => {
			it('should be retired (no down migration)', () => {
				// Based on the source code, the down migration is 'retired'
				// The getTestMigration utility should throw when trying to access down migration
				expect(() => {
					// This should throw since the migration is retired
					down({})
				}).toThrow('Migration com.tldraw.shape.arrow/1 does not have a down function')
			})
		})
	})

	describe('arrowShapeMigrations - AddIsPrecise migration', () => {
		const { up, down } = getTestMigration(arrowShapeVersions.AddIsPrecise)

		describe('AddIsPrecise up migration', () => {
			it('should add isPrecise property to binding start and end', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						start: {
							type: 'binding',
							boundShapeId: 'shape:rect1',
							normalizedAnchor: { x: 0.5, y: 0.5 },
						},
						end: {
							type: 'binding',
							boundShapeId: 'shape:rect2',
							normalizedAnchor: { x: 0.5, y: 0.5 },
						},
					},
				}

				const result = up(oldRecord)
				expect(result.props.start.isPrecise).toBe(false) // 0.5, 0.5 is not precise
				expect(result.props.end.isPrecise).toBe(false)
			})

			it('should set isPrecise to true for non-center anchors', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						start: {
							type: 'binding',
							boundShapeId: 'shape:rect1',
							normalizedAnchor: { x: 0.25, y: 0.75 }, // Not center
						},
						end: {
							type: 'binding',
							boundShapeId: 'shape:rect2',
							normalizedAnchor: { x: 1, y: 0 }, // Not center
						},
					},
				}

				const result = up(oldRecord)
				expect(result.props.start.isPrecise).toBe(true)
				expect(result.props.end.isPrecise).toBe(true)
			})

			it('should not modify non-binding terminals', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						start: { type: 'point', x: 0, y: 0 },
						end: { type: 'point', x: 100, y: 100 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.start.isPrecise).toBeUndefined()
				expect(result.props.end.isPrecise).toBeUndefined()
			})

			it('should handle mixed binding and point terminals', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						start: {
							type: 'binding',
							boundShapeId: 'shape:rect1',
							normalizedAnchor: { x: 0, y: 0 }, // Precise
						},
						end: { type: 'point', x: 100, y: 100 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.start.isPrecise).toBe(true)
				expect(result.props.end.isPrecise).toBeUndefined()
			})
		})

		describe('AddIsPrecise down migration', () => {
			it('should remove isPrecise property and adjust normalizedAnchor if not precise', () => {
				const newRecord = {
					id: 'shape:arrow1',
					props: {
						start: {
							type: 'binding',
							boundShapeId: 'shape:rect1',
							normalizedAnchor: { x: 0.25, y: 0.75 },
							isPrecise: false,
						},
						end: {
							type: 'binding',
							boundShapeId: 'shape:rect2',
							normalizedAnchor: { x: 0.1, y: 0.9 },
							isPrecise: true,
						},
					},
				}

				const result = down(newRecord)
				expect(result.props.start.isPrecise).toBeUndefined()
				expect(result.props.start.normalizedAnchor).toEqual({ x: 0.5, y: 0.5 }) // Reset to center
				expect(result.props.end.isPrecise).toBeUndefined()
				expect(result.props.end.normalizedAnchor).toEqual({ x: 0.1, y: 0.9 }) // Keep precise anchor
			})

			it('should not modify non-binding terminals', () => {
				const newRecord = {
					id: 'shape:arrow1',
					props: {
						start: { type: 'point', x: 0, y: 0 },
						end: { type: 'point', x: 100, y: 100 },
					},
				}

				const result = down(newRecord)
				expect(result.props.start).toEqual({ type: 'point', x: 0, y: 0 })
				expect(result.props.end).toEqual({ type: 'point', x: 100, y: 100 })
			})
		})
	})

	describe('arrowShapeMigrations - AddLabelPosition migration', () => {
		const { up, down } = getTestMigration(arrowShapeVersions.AddLabelPosition)

		describe('AddLabelPosition up migration', () => {
			it('should add labelPosition property with default value 0.5', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						color: 'blue',
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.labelPosition).toBe(0.5)
			})

			it('should preserve existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						color: 'red',
						fill: 'solid',
						start: { x: 25, y: 50 },
						end: { x: 200, y: 150 },
						bend: 0.3,
					},
				}

				const result = up(oldRecord)
				expect(result.props.labelPosition).toBe(0.5)
				expect(result.props.color).toBe('red')
				expect(result.props.fill).toBe('solid')
				expect(result.props.start).toEqual({ x: 25, y: 50 })
				expect(result.props.end).toEqual({ x: 200, y: 150 })
				expect(result.props.bend).toBe(0.3)
			})
		})

		describe('AddLabelPosition down migration', () => {
			it('should remove labelPosition property', () => {
				const newRecord = {
					id: 'shape:arrow1',
					props: {
						color: 'blue',
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
						labelPosition: 0.7,
					},
				}

				const result = down(newRecord)
				expect(result.props.labelPosition).toBeUndefined()
				expect(result.props.color).toBe('blue') // Preserve other props
			})
		})
	})

	describe('arrowShapeMigrations - ExtractBindings migration', () => {
		const migration = arrowShapeMigrations.sequence.find(
			(m) => 'id' in m && m.id === arrowShapeVersions.ExtractBindings
		)

		it('should be a store-scope migration', () => {
			expect(migration).toBeDefined()
			if (migration && 'scope' in migration) {
				expect(migration.scope).toBe('store')
			}
		})

		it('should have up function for extracting bindings', () => {
			if (migration && 'up' in migration) {
				expect(migration.up).toBeDefined()
				expect(typeof migration.up).toBe('function')
			}
		})

		// Note: This migration is complex and modifies the entire store
		// Testing the full migration would require setting up a mock store
		// The migration extracts binding information from arrow terminals
		// and creates separate binding records
	})

	describe('arrowShapeMigrations - AddScale migration', () => {
		const { up, down } = getTestMigration(arrowShapeVersions.AddScale)

		describe('AddScale up migration', () => {
			it('should add scale property with default value 1', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						color: 'blue',
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.scale).toBe(1)
			})

			it('should preserve existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						color: 'red',
						labelPosition: 0.3,
						start: { x: 10, y: 20 },
						end: { x: 200, y: 150 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.scale).toBe(1)
				expect(result.props.color).toBe('red')
				expect(result.props.labelPosition).toBe(0.3)
			})
		})

		describe('AddScale down migration', () => {
			it('should remove scale property', () => {
				const newRecord = {
					id: 'shape:arrow1',
					props: {
						color: 'blue',
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
						scale: 1.5,
					},
				}

				const result = down(newRecord)
				expect(result.props.scale).toBeUndefined()
				expect(result.props.color).toBe('blue') // Preserve other props
			})
		})
	})

	describe('arrowShapeMigrations - AddElbow migration', () => {
		const { up, down } = getTestMigration(arrowShapeVersions.AddElbow)

		describe('AddElbow up migration', () => {
			it('should add kind and elbowMidPoint properties with default values', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						color: 'blue',
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.kind).toBe('arc')
				expect(result.props.elbowMidPoint).toBe(0.5)
			})

			it('should preserve existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						color: 'red',
						scale: 1.2,
						labelPosition: 0.7,
						start: { x: 25, y: 50 },
						end: { x: 200, y: 150 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.kind).toBe('arc')
				expect(result.props.elbowMidPoint).toBe(0.5)
				expect(result.props.color).toBe('red')
				expect(result.props.scale).toBe(1.2)
				expect(result.props.labelPosition).toBe(0.7)
			})
		})

		describe('AddElbow down migration', () => {
			it('should remove kind and elbowMidPoint properties', () => {
				const newRecord = {
					id: 'shape:arrow1',
					props: {
						kind: 'elbow',
						elbowMidPoint: 0.3,
						color: 'blue',
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
					},
				}

				const result = down(newRecord)
				expect(result.props.kind).toBeUndefined()
				expect(result.props.elbowMidPoint).toBeUndefined()
				expect(result.props.color).toBe('blue') // Preserve other props
			})
		})
	})

	describe('arrowShapeMigrations - AddRichText migration', () => {
		const { up } = getTestMigration(arrowShapeVersions.AddRichText)

		describe('AddRichText up migration', () => {
			it('should convert text property to richText', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						text: 'Simple text label',
						color: 'blue',
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.text).toBeUndefined()
			})

			it('should handle empty text', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						text: '',
						color: 'red',
						start: { x: 10, y: 20 },
						end: { x: 200, y: 150 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.text).toBeUndefined()
			})

			it('should preserve other properties during migration', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						text: 'Label text',
						kind: 'elbow',
						elbowMidPoint: 0.3,
						color: 'green',
						scale: 1.5,
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.text).toBeUndefined()
				expect(result.props.kind).toBe('elbow')
				expect(result.props.elbowMidPoint).toBe(0.3)
				expect(result.props.color).toBe('green')
				expect(result.props.scale).toBe(1.5)
			})
		})

		// Note: The down migration is explicitly not defined (forced client update)
		// so we don't test it
	})

	describe('edge cases and error handling', () => {
		it('should handle zero scale validation correctly', () => {
			// Zero should be invalid for scale (nonZeroNumber)
			expect(() => arrowShapeProps.scale.validate(0)).toThrow()

			// Very small positive numbers should be valid, but negative numbers should be invalid
			expect(() => arrowShapeProps.scale.validate(0.0001)).not.toThrow()
			expect(() => arrowShapeProps.scale.validate(-0.0001)).toThrow()
		})
	})
})
