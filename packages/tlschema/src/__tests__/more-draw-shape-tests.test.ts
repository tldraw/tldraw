import { b64Vecs } from '../misc/b64Vecs'
import { drawShapeVersions } from '../shapes/TLDrawShape'
import { getTestMigration } from './migrationTestUtils'
import { BIG_SHAPE, OLD_DRAW_SHAPE } from './test-shapes'

describe('draw shape migrations', () => {
	test('Base64 with old shapes', () => {
		const { up } = getTestMigration(drawShapeVersions.Base64)

		for (const oldShape of [OLD_DRAW_SHAPE, BIG_SHAPE]) {
			const newShape = up(oldShape)
			const oldSegments = oldShape.props.segments
			const newSegments = newShape.props.segments.map((segment: any) => ({
				...segment,
				points: b64Vecs.decodePoints(segment.points),
			}))

			// Compare points with tolerance for Float16 precision loss.
			// Float16 has 10 mantissa bits, so relative precision is ~0.1%.
			// For values around 1000-2000, absolute error can be up to 1.
			// Using numDigits=-1 gives tolerance of 5, which is safe for all values.
			expect(newSegments.length).toBe(oldSegments.length)
			for (let i = 0; i < oldSegments.length; i++) {
				expect(newSegments[i].type).toBe(oldSegments[i].type)
				expect(newSegments[i].points.length).toBe(oldSegments[i].points.length)
				for (let j = 0; j < oldSegments[i].points.length; j++) {
					const oldPoint = oldSegments[i].points[j]
					const newPoint = newSegments[i].points[j]
					expect(Math.abs(newPoint.x - oldPoint.x)).toBeLessThanOrEqual(1)
					expect(Math.abs(newPoint.y - oldPoint.y)).toBeLessThanOrEqual(1)
					expect(Math.abs(newPoint.z - oldPoint.z)).toBeLessThanOrEqual(1)
				}
			}
			expect(newShape.props.scale).toBe(1)
			expect(newShape.props.scaleX).toBe(1)
			expect(newShape.props.scaleY).toBe(1)
		}
	})
})
