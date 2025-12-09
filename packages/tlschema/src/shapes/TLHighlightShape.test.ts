import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { highlightShapeMigrations, highlightShapeVersions } from './TLHighlightShape'

describe('TLHighlightShape', () => {
	describe('highlightShapeVersions', () => {
		it('should contain expected migration version IDs', () => {
			expect(highlightShapeVersions).toBeDefined()
			expect(typeof highlightShapeVersions).toBe('object')
		})

		it('should have all expected migration versions', () => {
			const expectedVersions: Array<keyof typeof highlightShapeVersions> = ['AddScale']

			expectedVersions.forEach((version) => {
				expect(highlightShapeVersions[version]).toBeDefined()
				expect(typeof highlightShapeVersions[version]).toBe('string')
			})
		})

		it('should have properly formatted migration IDs', () => {
			Object.values(highlightShapeVersions).forEach((versionId) => {
				expect(versionId).toMatch(/^com\.tldraw\.shape\.highlight\//)
				expect(versionId).toMatch(/\/\d+$/) // Should end with /number
			})
		})
	})

	describe('highlightShapeMigrations', () => {
		it('should be defined and have required structure', () => {
			expect(highlightShapeMigrations).toBeDefined()
			expect(highlightShapeMigrations.sequence).toBeDefined()
			expect(Array.isArray(highlightShapeMigrations.sequence)).toBe(true)
		})

		it('should have migrations for all version IDs', () => {
			const migrationIds = highlightShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : null))
				.filter(Boolean)

			const versionIds = Object.values(highlightShapeVersions)

			versionIds.forEach((versionId) => {
				expect(migrationIds).toContain(versionId)
			})
		})
	})

	describe('highlightShapeMigrations - AddScale migration', () => {
		const { up, down } = getTestMigration(highlightShapeVersions.AddScale)

		describe('AddScale up migration', () => {
			it('should add scale property with default value 1', () => {
				const oldRecord = {
					id: 'shape:highlight1',
					props: {
						color: 'yellow',
						size: 'm',
						segments: [
							{
								type: 'free',
								points: [{ x: 0, y: 0, z: 0.5 }],
							},
						],
						isComplete: true,
						isPen: false,
					},
				}

				const result = up(oldRecord)
				expect(result.props.scale).toBe(1)
			})

			it('should preserve existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:highlight1',
					props: {
						color: 'green',
						size: 'l',
						segments: [
							{
								type: 'straight',
								points: [
									{ x: 10, y: 20 },
									{ x: 100, y: 150 },
								],
							},
						],
						isComplete: true,
						isPen: true,
					},
				}

				const result = up(oldRecord)
				expect(result.props.scale).toBe(1)
				expect(result.props.color).toBe('green')
				expect(result.props.size).toBe('l')
				expect(result.props.segments).toEqual(oldRecord.props.segments)
				expect(result.props.isComplete).toBe(true)
				expect(result.props.isPen).toBe(true)
			})
		})

		describe('AddScale down migration', () => {
			it('should remove scale property', () => {
				const newRecord = {
					id: 'shape:highlight1',
					props: {
						color: 'yellow',
						size: 'm',
						segments: [
							{
								type: 'free',
								points: [{ x: 0, y: 0, z: 0.5 }],
							},
						],
						isComplete: true,
						isPen: false,
						scale: 1.5,
					},
				}

				const result = down(newRecord)
				expect(result.props.scale).toBeUndefined()
				expect(result.props.color).toBe('yellow') // Preserve other props
				expect(result.props.isPen).toBe(false) // Preserve other props
			})

			it('should preserve all other properties during down migration', () => {
				const newRecord = {
					id: 'shape:highlight1',
					props: {
						color: 'red',
						size: 'xl',
						segments: [
							{
								type: 'straight',
								points: [
									{ x: 0, y: 0 },
									{ x: 200, y: 0 },
								],
							},
						],
						isComplete: true,
						isPen: false,
						scale: 2.0,
					},
				}

				const result = down(newRecord)
				expect(result.props.scale).toBeUndefined()
				expect(result.props.color).toBe('red')
				expect(result.props.size).toBe('xl')
				expect(result.props.segments).toEqual(newRecord.props.segments)
				expect(result.props.isComplete).toBe(true)
				expect(result.props.isPen).toBe(false)
			})
		})

		it('should support round-trip migration (up then down)', () => {
			const originalRecord = {
				id: 'shape:highlight1',
				props: {
					color: 'green',
					size: 'l',
					segments: [
						{
							type: 'free',
							points: [{ x: 0, y: 0, z: 0.5 }],
						},
					],
					isComplete: true,
					isPen: true,
				},
			}

			// Apply up migration
			const upResult = up(originalRecord)
			expect(upResult.props.scale).toBe(1)

			// Apply down migration
			const downResult = down(upResult)
			expect(downResult.props.scale).toBeUndefined()
			expect(downResult.props.color).toBe('green')
			expect(downResult.props.size).toBe('l')
			expect(downResult.props.isComplete).toBe(true)
			expect(downResult.props.isPen).toBe(true)
		})
	})

	test('should handle all migration versions in correct order', () => {
		const expectedOrder: Array<keyof typeof highlightShapeVersions> = ['AddScale']

		const migrationIds = highlightShapeMigrations.sequence
			.filter((migration) => 'id' in migration)
			.map((migration) => ('id' in migration ? migration.id : ''))
			.filter(Boolean)

		expectedOrder.forEach((expectedVersion) => {
			const versionId = highlightShapeVersions[expectedVersion]
			expect(migrationIds).toContain(versionId)
		})
	})
})
