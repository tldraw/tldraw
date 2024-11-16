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
	const dirA = getBrokenEdge(g, 'A')
	const dirB = getBrokenEdge(g, 'B')

	if (!dirA || !dirB) {
		return { error: true, reason: 'no intersected edge of bounds' }
	}

	return { error: false, dirs: [dirA, dirB] }
}

function getBrokenEdge(g: ArrowNavigationGrid, box: 'A' | 'B') {
	let dir: ArrowDirection | undefined

	for (let { corners } = g[box].box, i = 0; i < 4; i++) {
		const A = corners[i]
		const B = corners[(i + 1) % 4]
		// intersect edge with line from center of boxA to center of boxB
		if (linesIntersect(A, B, g[box].c, g[box === 'A' ? 'B' : 'A'].c)) {
			dir = DIRS[(i - 1 + 4) % 4]
			break
		}
	}

	if (!dir) {
		for (let { corners } = g.A.box, i = 0; i < 4; i++) {
			const A = corners[i]
			const B = corners[(i + 1) % 4]
			const u = Vec.Sub(g[box].c, g[box === 'A' ? 'B' : 'A'].c).uni()
			u.rot(Math.PI)
			const farOutBack = Vec.Add(g[box].c, u.mul(1000000))
			if (linesIntersect(A, B, g[box].c, farOutBack)) {
				dir = DIRS[(i - 1 + 4) % 4]
				break
			}
		}
	}

	return dir
}
