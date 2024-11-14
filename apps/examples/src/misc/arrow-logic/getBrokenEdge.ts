import { Vec, linesIntersect } from 'tldraw'
import { ArrowDirection, DIRS } from './constants'
import { ArrowNavigationGrid } from './getArrowNavigationGrid'

export function getBrokenEdges(g: ArrowNavigationGrid):
	| {
			error: false
			dirs: [ArrowDirection, ArrowDirection]
	  }
	| {
			error: true
			reason: string
	  } {
	let dir: ArrowDirection | undefined, p1: Vec | undefined, p2: Vec | undefined

	for (let { corners } = g.A.box, i = 0; i < 4; i++) {
		const A = corners[i]
		const B = corners[(i + 1) % 4]
		p1 = A
		p2 = B
		// intersect edge with line from center of boxA to center of boxB
		if (linesIntersect(A, B, g.A.c, g.B.c)) {
			dir = DIRS[(i - 1 + 4) % 4]
			break
		}
	}

	if (!dir) {
		// no intersection between center line and boxA bounds

		// We can either go the other direction instead...
		for (let { corners } = g.A.box, i = 0; i < 4; i++) {
			const A = corners[i]
			const B = corners[(i + 1) % 4]

			// Get the vector from g.A.c to g.B.c
			const u = Vec.Sub(g.B.c, g.A.c).uni()

			// We could push it forward, or rotate until we find an intersection...
			// ...but for now let's just turn the vector around
			u.rot(Math.PI)

			const farOutBack = Vec.Add(g.A.c, u.mul(1000000))
			if (linesIntersect(A, B, g.A.c, farOutBack)) {
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

	return { error: false, dirs: [dir, DIRS[(DIRS.indexOf(dir) + 2) % 4]] }
}
