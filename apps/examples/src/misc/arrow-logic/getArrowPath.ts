import { Box, Vec } from 'tldraw'
import { ArrowDirection, DELTAS, DIRS, MINIMUM_LEG_LENGTH } from './constants'
import { ArrowNavigationGrid } from './getArrowNavigationGrid'

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

class ArrowStepResult {
	constructor(
		public path: Vec[],
		public corners: number,
		public length: number,
		public visited: Set<Vec>,
		public complete: boolean = false,
		public broken: boolean = false
	) {}

	clone() {
		return new ArrowStepResult([...this.path], this.corners, this.length, new Set(this.visited))
	}
}

export function getArrowPath(
	g: ArrowNavigationGrid,
	start?: 'up' | 'right' | 'down' | 'left',
	end?: 'up' | 'right' | 'down' | 'left'
): { error: true; reason: SArrowError } | { error: false; path: Vec[] } {
	const edgesA: [ArrowDirection, Vec, Vec][] = [
		['up', g.A.t, g.A.e.t],
		['right', g.A.r, g.A.e.r],
		['down', g.A.b, g.A.e.b],
		['left', g.A.l, g.A.e.l],
	]

	const edgesB: [ArrowDirection, Vec, Vec][] = [
		['up', g.B.t, g.B.e.t],
		['right', g.B.r, g.B.e.r],
		['down', g.B.b, g.B.e.b],
		['left', g.B.l, g.B.e.l],
	]

	let closestPair = [] as [ArrowDirection, Vec, Vec][]

	if (g.hPos === 'a-left-of-b') {
		if (g.vPos === 'a-above-b') {
			closestPair = [edgesA[1], edgesB[0]]
		} else if (g.vPos === 'a-below-b') {
			closestPair = [edgesA[1], edgesB[2]]
		} else {
			closestPair = [edgesA[1], edgesB[3]]
		}
	} else if (g.hPos === 'a-right-of-b') {
		if (g.vPos === 'a-above-b') {
			closestPair = [edgesA[3], edgesB[0]]
		} else if (g.vPos === 'a-below-b') {
			closestPair = [edgesA[3], edgesB[2]]
		} else {
			closestPair = [edgesA[3], edgesB[1]]
		}
	} else {
		if (g.vPos === 'a-above-b') {
			closestPair = [edgesA[2], edgesB[0]]
		} else if (g.vPos === 'a-below-b') {
			closestPair = [edgesA[0], edgesB[2]]
		} else {
			closestPair = [edgesA[2], edgesB[0]]
		}
	}

	// let closestDist = Infinity
	// for (let i = 0; i < edgesA.length; i++) {
	// 	for (let j = 0; j < edgesB.length; j++) {
	// 		const dist = Vec.Dist2(edgesA[i][1], edgesB[j][1])
	// 		if (dist < closestDist) {
	// 			closestDist = dist
	// 			closestPair = [edgesA[i], edgesB[j]]
	// 		}
	// 	}
	// }

	if (start) {
		closestPair[0] = edgesA.find((e) => e[0] === start)!
	}

	if (end) {
		closestPair[1] = edgesB.find((e) => e[0] === end)!
	}

	const [dir, k, e] = closestPair[0]
	const kp = g.gridPointsMap.get(k)!
	const ep = g.gridPointsMap.get(e)!
	const paths = getNextPointInPath(
		g,
		new ArrowStepResult([kp, ep], 0, Vec.Dist(kp, ep), new Set([k, e])),
		dir
	)
		.filter((p) => p.complete)
		.filter((p) => p.visited.has(closestPair[1][1]))
		.sort((a, b) => a.corners - b.corners)

	// const dirs = [] as ArrowDirection[]

	// console.log(closestPair)

	// const brokenEdges = getBrokenEdges(g)

	// let dirs: [ArrowDirection, ArrowDirection]
	// const angle = (Vec.Angle(g.A.c, g.B.c) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)

	// if (angle > Math.PI * 1.75 || angle < Math.PI * 0.25) {
	// 	dirs = ['up', 'down']
	// } else if (angle > Math.PI * 0.25 && angle < Math.PI * 0.75) {
	// 	dirs = ['right', 'left']
	// } else if (angle > Math.PI * 0.75 && angle < Math.PI * 1.25) {
	// 	dirs = ['down', 'up']
	// } else {
	// 	dirs = ['left', 'right']
	// }

	// if (brokenEdges.error) {
	// 	dirs = ['down', 'up']
	// } else {
	// 	dirs = brokenEdges.dirs
	// }
	// const [startBrokenEdge, endBrokenEdge] = dirs

	// const startDir = start || startBrokenEdge
	// const endDir = end || endBrokenEdge

	// const allDirsA: Record<ArrowDirection, [Vec, Vec, ArrowDirection]> = {
	// 	up: [g.A.t, g.A.e.t, 'up'],
	// 	right: [g.A.r, g.A.e.r, 'right'],
	// 	down: [g.A.b, g.A.e.b, 'down'],
	// 	left: [g.A.l, g.A.e.l, 'left'],
	// }

	// // All directions, just pick the best one that isn't broken
	// const dirsA = Object.values(allDirsA).filter(
	// 	(d) => !g.B.e.box.containsPoint(d[0]) && !g.B.e.box.containsPoint(d[1])
	// )

	// const dirA = allDirsA[startDir]
	// const dirA = allDirsA[dirs[0]]

	// let dirsA
	// if (g.B.e.box.containsPoint(dirA[0]) || g.B.e.box.containsPoint(dirA[1])) {
	// 	dirsA = Object.values(allDirsA).filter(
	// 		(d) => !g.B.e.box.containsPoint(d[0]) && !g.B.e.box.containsPoint(d[1])
	// 	)
	// } else {
	// 	dirsA = [dirA]
	// }

	// const paths = dirsA.flatMap(([k, e, dir]) => {
	// 	const kp = g.gridPointsMap.get(k)!
	// 	const ep = g.gridPointsMap.get(e)!
	// 	return getNextPointInPath(
	// 		g,
	// 		new ArrowStepResult([kp, ep], 0, Vec.Dist(kp, ep), new Set([k, e])),
	// 		dir
	// 	)
	// })

	// const completePaths = paths.filter((result) => result.complete)

	// const allDirsB: Record<ArrowDirection, [Vec, Vec, ArrowDirection]> = {
	// 	up: [g.B.t, g.B.e.t, 'up'],
	// 	right: [g.B.r, g.B.e.r, 'right'],
	// 	down: [g.B.b, g.B.e.b, 'down'],
	// 	left: [g.B.l, g.B.e.l, 'left'],
	// }

	// const dirB = allDirsB[endDir]

	// let dirsB
	// if (g.A.e.box.containsPoint(dirB[0]) || g.A.e.box.containsPoint(dirB[1])) {
	// 	dirsB = Object.values(allDirsB).filter(
	// 		(d) => !g.A.e.box.containsPoint(d[0]) && !g.A.e.box.containsPoint(d[1])
	// 	)
	// } else {
	// 	dirsB = [dirB]
	// }

	// console.log(completePaths, dirsB)

	// completePaths.forEach((p) => {
	// 	p.length = p.path.reduce((acc, cur) => acc + Vec.Dist(cur, g.C.c), 0)
	// })

	// console.log(completePaths)

	// const minCorners = Math.min(...completePaths.map((p) => p.corners))

	// console.log(
	// 	g.hPos,
	// 	g.vPos,
	// 	!(g.hPos === 'a-left-of-b' || g.hPos === 'a-right-of-b') ||
	// 		!(g.vPos === 'a-above-b' || g.vPos === 'a-below-b')
	// )

	// const shortPaths = completePaths
	// 	.filter((p) =>
	// 		!(g.hPos === 'a-left-of-b' || g.hPos === 'a-right-of-b') ||
	// 		!(g.vPos === 'a-above-b' || g.vPos === 'a-below-b')
	// 			? p.corners === 2
	// 			: p.corners === minCorners
	// 	) // || p.corners === 2)
	// 	.sort((a, b) => (a.length < b.length ? -1 : 1))
	// 	.sort((a, b) => (a.visited.has(g.C.c) && !b.visited.has(g.C.c) ? -1 : 1))
	// // .sort(
	// // 	// (a, b) => (a.corners === 2 ? -1 : a.corners < b.corners ? -1 : 1)
	// // 	(a, b) => (a.corners < b.corners ? -1 : 1)
	// // )

	// console.log(shortPaths)

	// const pathsEndingInOptimalEdge = completePaths

	// const pathsEndingInOptimalEdge = completePaths.filter((p) => {
	// 	return dirsB.some((d) => p.visited.has(d[0]))
	// })

	// if (pathsEndingInOptimalEdge.length === 0) {
	// 	pathsEndingInOptimalEdge.push(...completePaths)
	// }

	// const shortPaths = pathsEndingInOptimalEdge
	// 	.filter((p) => p.corners === minCorners)
	// 	.sort((a, b) => (a.length < b.length ? -1 : 1))

	const finalPaths = paths

	if (!finalPaths.length) {
		return {
			error: true,
			reason: 'no path',
		}
	}

	const shortestPath = finalPaths[0].path.map((p) => g.gridPoints[p.y][p.x].toFixed())

	const pointBox = Box.FromPoints(shortestPath)
	if (pointBox.w < MINIMUM_LEG_LENGTH) {
		shortestPath.forEach((p) => (p.x = g.D.c.x))
	} else if (pointBox.h < MINIMUM_LEG_LENGTH) {
		shortestPath.forEach((p) => (p.y = g.D.c.y))
	}

	return {
		error: false,
		path: shortestPath,
	}
}

/**
 * Checks whether a mid-path point (e.g. any point that isn't on A or A.e or B or B.e) is valid.
 * To be valid, the point must not be in the expanded box of A or the expanded bounds of B
 * @param g The arrow navigation grid
 * @param point The terminal point to check
 * @returns Whether the terminal point is valid
 */
function isMidPathPointValid(g: ArrowNavigationGrid, point: Vec) {
	return (
		// point.equals(g.A.e.tr) ||
		// point.equals(g.A.e.tl) ||
		// point.equals(g.A.e.br) ||
		// point.equals(g.A.e.bl) ||
		// point.equals(g.B.t) ||
		// point.equals(g.B.r) ||
		// point.equals(g.B.b) ||
		// point.equals(g.B.l) ||
		point.equals(g.B.e.t) ||
		point.equals(g.B.e.r) ||
		point.equals(g.B.e.b) ||
		point.equals(g.B.e.l) ||
		point.equals(g.B.e.tr) ||
		point.equals(g.B.e.tl) ||
		point.equals(g.B.e.br) ||
		point.equals(g.B.e.bl) ||
		!(g.A.e.box.containsPoint(point) || g.B.e.box.containsPoint(point))
	)
}

/**
 * Get the points around a given point
 * @returns The points around the given point
 */
function getNextPointInPath(
	g: ArrowNavigationGrid,
	result: ArrowStepResult,
	dir: 'up' | 'right' | 'down' | 'left'
): ArrowStepResult[] {
	if (result.complete) return [result]
	if (result.broken) return [result]
	if (result.corners > 5) return [result]
	const ccw = DIRS[(4 + (DIRS.indexOf(dir) - 1)) % 4]
	const cw = DIRS[(DIRS.indexOf(dir) + 1) % 4]

	const pos = result.path[result.path.length - 1]

	const results: ArrowStepResult[] = []

	const fwd_res = getNext(g, pos, dir, false, result.clone())
	if (fwd_res) {
		results.push(...getNextPointInPath(g, fwd_res, dir))
	}

	const ccw_res = getNext(g, pos, ccw, true, result.clone())
	if (ccw_res) {
		results.push(...getNextPointInPath(g, ccw_res, ccw))
	}

	const cw_res = getNext(g, pos, cw, true, result.clone())
	if (cw_res) {
		results.push(...getNextPointInPath(g, cw_res, cw))
	}

	if (results.length === 0) return []

	return results
}

function isEndTerminal(g: ArrowNavigationGrid, pos: Vec) {
	return pos === g.B.t || pos === g.B.r || pos === g.B.b || pos === g.B.l
}

function move(g: ArrowNavigationGrid, tpos: Vec, result: ArrowStepResult, corner: boolean) {
	// Get the True Point based on the grid points map
	const next = g.gridPoints[tpos.y][tpos.x]
	if (!next) {
		return true
	}

	// If we've already visited this point, we're done, arrow is fucked, return false
	if (result.visited.has(next)) {
		result.broken = true
		return false
	}

	// Even if the point is invalid, we still want to add it to the visited set
	result.visited.add(next)

	// If it's a corner and the corner is invalid, we're done
	// if we're just going ahead, then we can skip this check
	if (corner && !isMidPathPointValid(g, next)) {
		result.broken = true
		return false
	}

	// We're good, let's add it and update the result
	if (corner) result.corners++
	const ppos = result.path[result.path.length - 1]
	const prev = g.gridPoints[ppos.y][ppos.x]
	const dist = Vec.Dist(next, prev)
	result.length += dist
	result.path.push(tpos)
	result.complete = isEndTerminal(g, next)

	return result
}

interface DirectionConfig {
	condition(pos: Vec, gridSize: number): boolean
	delta: Vec
}

const DIRECTION_CONFIG: Record<ArrowDirection, DirectionConfig> = {
	up: {
		condition: (pos, _) => pos.y > 0,
		delta: DELTAS.up,
	},
	right: {
		condition: (pos, size) => pos.x < size - 1,
		delta: DELTAS.right,
	},
	down: {
		condition: (pos, size) => pos.y < size - 1,
		delta: DELTAS.down,
	},
	left: {
		condition: (pos, _) => pos.x > 0,
		delta: DELTAS.left,
	},
}

function getNext(
	g: ArrowNavigationGrid,
	pos: Vec,
	dir: ArrowDirection,
	corner: boolean,
	result: ArrowStepResult
): ArrowStepResult | null {
	const tpos = pos.clone()
	const { condition, delta } = DIRECTION_CONFIG[dir]
	let res: ArrowStepResult | boolean | null = null
	while (condition(tpos, g.gridPoints.length)) {
		tpos.add(delta)
		res = move(g, tpos, result, corner)
		if (res === true) continue
		if (res === false) res = result
		break
	}

	return res === true ? null : res
}
