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

	// if (
	// 	Vec.Dist(path[0], path[1]) < MINIMUM_LEG_LENGTH ||
	// 	Vec.Dist(path[2], path[3]) < MINIMUM_LEG_LENGTH
	// ) {
	// 	return { error: true, reason: sArrowErrors.SHORT_OUTSIDE_LEGS }
	// }

	if (brokenEdgeA.dir === DIRS[0] && g.C.b.y - g.C.t.y < MINIMUM_LEG_LENGTH * 2) {
		// right
		const midY = (g.A.r.y + g.B.l.y) / 2
		path = [new Vec(g.A.r.x, midY), new Vec(g.B.l.x, midY)]
	} else if (brokenEdgeA.dir === DIRS[1] && g.C.r.x - g.C.l.x < MINIMUM_LEG_LENGTH * 2) {
		console.log(g.C.r.y - g.C.l.y)
		// down
		const midX = (g.A.b.x + g.B.t.x) / 2
		path = [new Vec(midX, g.A.b.y), new Vec(midX, g.B.t.y)]
	} else if (brokenEdgeA.dir === DIRS[2] && g.C.b.y - g.C.t.y < MINIMUM_LEG_LENGTH * 2) {
		// left
		const midY = (g.A.l.y + g.B.r.y) / 2
		path = [new Vec(g.A.l.x, midY), new Vec(g.B.r.x, midY)]
	} else if (brokenEdgeA.dir === DIRS[3] && g.C.r.x - g.C.l.x < MINIMUM_LEG_LENGTH * 2) {
		// up
		const midX = (g.A.t.x + g.B.b.x) / 2
		path = [new Vec(midX, g.A.t.y), new Vec(midX, g.B.b.y)]
	}

	return { error: false, path }
}
