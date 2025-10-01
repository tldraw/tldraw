import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { arrowBindingVersions } from './TLArrowBinding'

describe('TLArrowBinding', () => {
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
