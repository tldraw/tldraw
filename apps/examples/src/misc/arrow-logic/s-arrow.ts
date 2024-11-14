import { Vec } from 'tldraw'
import { DIRS, MINIMUM_LEG_LENGTH } from './constants'
import { ArrowNavigationGrid } from './getArrowNavigationGrid'
import { getBrokenEdge } from './getBrokenEdge'

export const sArrowErrors = {
	SHORT_OUTSIDE_LEGS: 'SHORT_OUTSIDE_LEGS',
	SHORT_MIDDLE_LEG: 'SHORT_MIDDLE_LEG',
	NO_FIRST_STEP: 'NO_FIRST_STEP',
	NO_SECOND_STEP: 'NO_SECOND_STEP',
	NO_THIRD_STEP: 'NO_THIRD_STEP',
	NO_FOURTH_STEP: 'NO_FOURTH_STEP',
	POINT_BOX_OVERLAP: 'POINT_BOX_OVERLAP',
	NO_BROKEN_EDGE: 'NO_BROKEN_EDGE',
}

export type SArrowError = (typeof sArrowErrors)[keyof typeof sArrowErrors]

export function getSArrow(
	g: ArrowNavigationGrid
): { error: true; reason: SArrowError } | { error: false; path: Vec[] } {
	let path: Vec[] = []

	const xDir = g.A.c.x > g.C.c.x ? 'left' : 'right'
	const yDir = g.A.c.y > g.C.c.y ? 'up' : 'down'

	const brokenEdgeA = getBrokenEdge(g, g.A.box)

	if (brokenEdgeA.error) {
		return { error: true, reason: sArrowErrors.NO_BROKEN_EDGE }
	}

	if (brokenEdgeA.dir === DIRS[0]) {
		// right
		path = [
			g.A.r,
			g.A.e.r,
			yDir === 'down' ? g.C.t : g.C.b,
			yDir === 'down' ? g.C.b : g.C.t,
			g.B.e.l,
			g.B.l,
		]

		if (Math.abs(g.B.l.y - g.A.r.y) < MINIMUM_LEG_LENGTH) {
			// Short outside leg, try an i arrow
			const midY = (g.A.r.y + g.B.l.y) / 2
			path = [new Vec(g.A.r.x, midY), new Vec(g.B.l.x, midY)]
		} else if (g.C.c.x - g.A.r.x < MINIMUM_LEG_LENGTH) {
			// Short middle leg, try an l arrow
			if (yDir === 'down' && g.A.r.y > g.B.e.t.y) {
				// u arrow, start from top of A and go around to top of B
				path = [g.A.t, g.A.e.t, g.D.tcr, g.B.e.t, g.B.t]
			} else if (yDir === 'up' && g.A.r.y < g.B.e.b.y) {
				// u arrow, start from bottom of A and go around to bottom of B
			} else {
				path = [
					g.A.r,
					g.A.e.r,
					yDir === 'down' ? g.C.tr : g.C.tl,
					yDir === 'down' ? g.B.e.t : g.B.e.b,
					yDir === 'down' ? g.B.t : g.B.b,
				]
			}
		}
	} else if (brokenEdgeA.dir === DIRS[1]) {
		// down
		path = [
			g.A.b,
			g.A.e.b,
			xDir === 'left' ? g.C.r : g.C.l,
			xDir === 'left' ? g.C.l : g.C.r,
			g.B.e.t,
			g.B.t,
		]
	} else if (brokenEdgeA.dir === DIRS[2]) {
		// left
		path = [
			g.A.l,
			g.A.e.l,
			yDir === 'down' ? g.C.t : g.C.b,
			yDir === 'down' ? g.C.b : g.C.t,
			g.B.e.r,
			g.B.r,
		]
	} else {
		// up
		path = [
			g.A.t,
			g.A.e.t,
			xDir === 'left' ? g.C.r : g.C.l,
			xDir === 'left' ? g.C.l : g.C.r,
			g.B.e.b,
			g.B.b,
		]
	}

	// if (Vec.Dist(path[2], path[3]) < MINIMUM_LEG_LENGTH) {
	// 	// Check for a short middle section
	// 	if (brokenEdgeA.dir === DIRS[0]) {
	// 		// right
	// 		const midY = (g.A.r.y + g.B.l.y) / 2
	// 		path = [new Vec(g.A.r.x, midY), new Vec(g.B.l.x, midY)]
	// 	} else if (brokenEdgeA.dir === DIRS[1]) {
	// 		// down
	// 		const midX = (g.A.b.x + g.B.t.x) / 2
	// 		path = [new Vec(midX, g.A.b.y), new Vec(midX, g.B.t.y)]
	// 	} else if (brokenEdgeA.dir === DIRS[2]) {
	// 		// left
	// 		const midY = (g.A.l.y + g.B.r.y) / 2
	// 		path = [new Vec(g.A.l.x, midY), new Vec(g.B.r.x, midY)]
	// 	} else if (brokenEdgeA.dir === DIRS[3]) {
	// 		// up
	// 		const midX = (g.A.t.x + g.B.b.x) / 2
	// 		path = [new Vec(midX, g.A.t.y), new Vec(midX, g.B.b.y)]
	// 	}
	// } else {
	// 	// Check for short first and last sections
	// 	if (
	// 		Vec.Dist(path[0], path[1]) < MINIMUM_LEG_LENGTH ||
	// 		Vec.Dist(path[4], path[5]) < MINIMUM_LEG_LENGTH
	// 	) {
	// 		if (brokenEdgeA.dir === DIRS[0]) {
	// 			// right
	// 			path = [
	// 				g.A.r,
	// 				g.A.e.r,
	// 				yDir === 'down' ? g.C.tr : g.C.tl,
	// 				yDir === 'down' ? g.B.e.t : g.B.e.b,
	// 				yDir === 'down' ? g.B.t : g.B.b,
	// 			]
	// 		} else if (brokenEdgeA.dir === DIRS[1]) {
	// 			// down
	// 			path = [
	// 				g.A.b,
	// 				g.A.e.b,
	// 				xDir === 'right' ? g.C.bl : g.C.br,
	// 				xDir === 'right' ? g.B.e.l : g.B.e.r,
	// 				xDir === 'right' ? g.B.l : g.B.r,
	// 			]
	// 		} else if (brokenEdgeA.dir === DIRS[2]) {
	// 			// left
	// 			path = [
	// 				g.A.l,
	// 				g.A.e.l,
	// 				yDir === 'down' ? g.C.tl : g.C.tr,
	// 				yDir === 'down' ? g.B.e.t : g.B.e.b,
	// 				yDir === 'down' ? g.B.t : g.B.b,
	// 			]
	// 		} else if (brokenEdgeA.dir === DIRS[3]) {
	// 			// up
	// 			path = [
	// 				g.A.t,
	// 				g.A.e.t,
	// 				xDir === 'right' ? g.C.tl : g.C.tr,
	// 				xDir === 'right' ? g.B.e.l : g.B.e.r,
	// 				xDir === 'right' ? g.B.l : g.B.r,
	// 			]
	// 		}
	// 	}
	// }

	return { error: false, path }
}
