import { Box, Vec, linesIntersect } from 'tldraw'
import { ArrowDirection, DIRS } from './constants'

export function getStartingDirectionForArrow(
	boxA: Box,
	boxB: Box
):
	| {
			error: false
			dir: ArrowDirection
	  }
	| {
			error: string
			dir: undefined
	  } {
	const { center: centerA } = boxA
	const { center: centerB } = boxB

	let dir: ArrowDirection | undefined
	for (let { corners } = boxA, i = 0; i < 4; i++) {
		const A = corners[i]
		const B = corners[(i + 1) % 4]
		if (linesIntersect(A, B, centerA, centerB)) {
			dir = DIRS[(i - 1 + 4) % 4]
			break
		}
	}

	if (!dir) {
		// no intersection between center line and boxA bounds

		// We can either go the other direction instead...
		for (let { corners } = boxA, i = 0; i < 4; i++) {
			const A = corners[i]
			const B = corners[(i + 1) % 4]

			// Get the vector from centerA to centerB
			const u = Vec.Sub(centerB, centerB).uni()

			// We could push it forward, or rotate until we find an intersection...
			// ...but for now let's just turn the vector around
			u.rot(Math.PI)

			const farOutBack = Vec.Add(centerA, u.mul(1000000))
			if (linesIntersect(A, B, centerA, farOutBack)) {
				dir = DIRS[(i - 1 + 4) % 4]
				break
			}
		}

		// Or come up with some alternative strategy, like joining centers
	}

	if (!dir) {
		return { error: 'no intersected edge of bounds', dir }
	}

	return { error: false, dir }
}
