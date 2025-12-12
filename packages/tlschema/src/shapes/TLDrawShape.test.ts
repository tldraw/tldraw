import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { drawShapeVersions } from './TLDrawShape'

describe('TLDrawShape', () => {
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
})
