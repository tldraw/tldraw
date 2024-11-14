import { Box, Vec, linesIntersect } from 'tldraw'
import { ArrowDirection, DIRS } from './constants'
import { ArrowNavigationGrid } from './getArrowNavigationGrid'

export function getBrokenEdge(
	grid: ArrowNavigationGrid,
	box: Box
):
	| {
			error: false
			dir: ArrowDirection
			p1: Vec
			p2: Vec
	  }
	| {
			error: true
			reason: string
	  } {
	let dir: ArrowDirection | undefined, p1: Vec | undefined, p2: Vec | undefined

	const { center } = box

	for (let { corners } = box, i = 0; i < 4; i++) {
		const A = corners[i]
		const B = corners[(i + 1) % 4]
		p1 = A
		p2 = B
		// intersect edge with line from center of boxA to center of boxB
		if (linesIntersect(A, B, grid.C.c, center)) {
			dir = DIRS[(i - 1 + 4) % 4]
			break
		}
	}

	if (!dir) {
		// no intersection between center line and boxA bounds

		// We can either go the other direction instead...
		for (let { corners } = box, i = 0; i < 4; i++) {
			const A = corners[i]
			const B = corners[(i + 1) % 4]

			// Get the vector from centerA to centerB
			const u = Vec.Sub(grid.C.c, center).uni()

			// We could push it forward, or rotate until we find an intersection...
			// ...but for now let's just turn the vector around
			u.rot(Math.PI)

			const farOutBack = Vec.Add(center, u.mul(1000000))
			if (linesIntersect(A, B, center, farOutBack)) {
				dir = DIRS[(i - 1 + 4) % 4]
				p1 = A
				p2 = B
				break
			}
		}

		// Or come up with some alternative strategy, like joining centers
	}

	if (!dir || !p1 || !p2) {
		return { error: true, reason: 'no intersected edge of bounds' }
	}

	return { error: false, dir, p1, p2 }
}
