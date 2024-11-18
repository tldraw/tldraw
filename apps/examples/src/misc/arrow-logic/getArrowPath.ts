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
		public phase: 'a' | 'mid' | 'b',
		public complete: boolean = false,
		public broken: boolean = false
	) {}

	clone() {
		return new ArrowStepResult(
			[...this.path],
			this.corners,
			this.length,
			new Set(this.visited),
			this.phase
		)
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

	// gapDir is h or v if is there are no overlaps, ie both left/above, right/above, right/below, or left/below

	if (g.gapDir === 'h') {
		// hs prefer S arrows
		closestPair = [
			g.hPos === 'a-left-of-b' ? edgesA[1] : edgesA[3],
			g.hPos === 'a-left-of-b' ? edgesB[3] : edgesB[1],
		]
	} else if (g.gapDir === 'v') {
		closestPair = [edgesA[1], edgesB[1]] // temp

		if (g.vPos === 'a-above-b') {
			if (g.hPos === 'a-right-of-b') {
				closestPair = [edgesA[3], edgesB[0]]
			} else if (g.hPos === 'a-left-of-b') {
				closestPair = [edgesA[1], edgesB[0]]
			} else {
				if (g.A.e.l.x > g.B.c.x) {
					closestPair = [edgesA[3], edgesB[0]]
				} else if (g.A.e.r.x < g.B.c.x) {
					closestPair = [edgesA[1], edgesB[0]]
				} else {
					closestPair = [edgesA[2], edgesB[0]]
				}
			}
		} else if (g.vPos === 'a-below-b') {
			if (g.hPos === 'a-right-of-b') {
				closestPair = [edgesA[3], edgesB[2]]
			} else if (g.hPos === 'a-left-of-b') {
				closestPair = [edgesA[1], edgesB[2]]
			} else {
				if (g.A.e.l.x > g.B.c.x) {
					closestPair = [edgesA[3], edgesB[2]]
				} else if (g.A.e.r.x < g.B.c.x) {
					closestPair = [edgesA[1], edgesB[2]]
				} else {
					closestPair = [edgesA[0], edgesB[2]]
				}
			}
		}
	} else {
		if (g.hPos === 'a-left-of-b') {
			if (g.A.c.y < g.B.c.y) {
				if (g.A.c.y < g.B.e.t.y) {
					closestPair = [edgesA[1], edgesB[0]]
				} else {
					closestPair = [edgesA[0], edgesB[0]]
				}
			} else {
				if (g.A.c.y > g.B.e.b.y) {
					closestPair = [edgesA[1], edgesB[2]]
				} else {
					closestPair = [edgesA[2], edgesB[2]]
				}
			}
		} else if (g.hPos === 'a-right-of-b') {
			if (g.A.c.y < g.B.c.y) {
				if (g.A.c.y < g.B.e.t.y) {
					closestPair = [edgesA[3], edgesB[0]]
				} else {
					closestPair = [edgesA[0], edgesB[0]]
				}
			} else {
				if (g.A.c.y > g.B.e.b.y) {
					closestPair = [edgesA[3], edgesB[2]]
				} else {
					closestPair = [edgesA[2], edgesB[2]]
				}
			}
		} else if (g.vPos === 'a-above-b') {
			// to short for an s, so make a c
			if (g.A.c.x < g.B.c.x) {
				if (g.A.e.r.x < g.B.c.x) {
					// l arrow, right to top
					closestPair = [edgesA[1], edgesB[0]]
				} else {
					// c arrow, right to right
					closestPair = [edgesA[1], edgesB[1]]
				}
			} else {
				if (g.A.e.l.x > g.B.c.x) {
					// l arrow, left to top
					closestPair = [edgesA[3], edgesB[0]]
				} else {
					// c arrow, left to left
					closestPair = [edgesA[3], edgesB[3]]
				}
			}
		} else if (g.vPos === 'a-below-b') {
			if (g.A.c.x < g.B.c.x) {
				if (g.A.e.r.x < g.B.c.x) {
					closestPair = [edgesA[1], edgesB[2]]
				} else {
					closestPair = [edgesA[1], edgesB[1]]
				}
			} else {
				if (g.A.e.l.x > g.B.c.x) {
					closestPair = [edgesA[3], edgesB[2]]
				} else {
					closestPair = [edgesA[3], edgesB[3]]
				}
			}
		} else {
			if (g.A.t.y < g.B.t.y) {
				if (g.A.e.r.x < g.B.e.r.x) {
					closestPair = [edgesA[0], edgesB[1]]
				} else {
					closestPair = [edgesA[0], edgesB[3]]
				}
			} else {
				if (g.A.e.r.x < g.B.e.r.x) {
					closestPair = [edgesA[2], edgesB[1]]
				} else {
					closestPair = [edgesA[2], edgesB[3]]
				}
			}
		}
	}

	// // Closest the handle...
	// let closestDist = Infinity
	// for (let i = 0; i < edgesA.length; i++) {
	// 	const dist = Vec.Dist2(edgesA[i][2], g.M)
	// 	if (dist < closestDist) {
	// 		closestDist = dist
	// 		closestPair[0] = edgesA[i]
	// 	}
	// }
	// closestDist = Infinity
	// for (let i = 0; i < edgesB.length; i++) {
	// 	const dist = Vec.Dist2(edgesB[i][2], g.M)
	// 	if (dist < closestDist) {
	// 		closestDist = dist
	// 		closestPair[1] = edgesB[i]
	// 	}
	// }

	// // Closest the centers...
	// let closestDist = Infinity
	// for (let i = 0; i < edgesA.length; i++) {
	// 	const dist = Vec.Dist2(edgesA[i][2], g.B.c)
	// 	if (dist < closestDist) {
	// 		closestDist = dist
	// 		closestPair[0] = edgesA[i]
	// 	}
	// }
	// closestDist = Infinity
	// for (let i = 0; i < edgesB.length; i++) {
	// 	const dist = Vec.Dist2(edgesB[i][2], g.A.c)
	// 	if (dist < closestDist) {
	// 		closestDist = dist
	// 		closestPair[1] = edgesB[i]
	// 	}
	// }

	// // Closest to eachother...
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
		new ArrowStepResult([kp, ep], 0, Vec.Dist(kp, ep), new Set([k, e]), 'mid'),
		dir
	)

	const finalPaths = paths
		.filter((p) => p.complete)
		.filter((p) => p.visited.has(closestPair[1][1]))
		.sort((a, b) => a.corners - b.corners)

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
function _isMidPathPointValid(g: ArrowNavigationGrid, point: Vec) {
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

	const pos = result.path[result.path.length - 1]

	const results: ArrowStepResult[] = []

	const fwd_res = getNext(g, pos, dir, false, result.clone())
	if (fwd_res) {
		results.push(...getNextPointInPath(g, fwd_res, dir))
	}

	const ccw = DIRS[(4 + (DIRS.indexOf(dir) - 1)) % 4]
	const ccw_res = getNext(g, pos, ccw, true, result.clone())
	if (ccw_res) {
		results.push(...getNextPointInPath(g, ccw_res, ccw))
	}

	const cw = DIRS[(DIRS.indexOf(dir) + 1) % 4]
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

	// If we're in phase A
	if (result.phase === 'a') {
		// ...and the next point is an edge of A.e, we're in phase mid
		if (next === g.A.e.t || next === g.A.e.r || next === g.A.e.b || next === g.A.e.l) {
			result.phase = 'mid'
		} else {
			// Otherwise, we're broken
			result.broken = true
			return false
		}
	}

	// If we're in phase mid and the next point is an edge of B.e, we're in phase b
	else if (result.phase === 'mid') {
		if (next === g.B.e.t || next === g.B.e.r || next === g.B.e.b || next === g.B.e.l) {
			result.phase = 'b'
		} else {
			// If we're in the mid phase and the point is on the expanded bounds of A or B, we're done
			if (g.A.e.box.containsPoint(next) || g.B.e.box.containsPoint(next)) {
				result.broken = true
				return false
			}
		}
	} else if (result.phase === 'b') {
		// From B, the only valid points should be the edges of B
		if (!(next === g.B.t || next === g.B.r || next === g.B.b || next === g.B.l)) {
			result.broken = true
			return false
		}
	}

	// If it's a corner and the corner is invalid, we're done
	// if we're just going ahead, then we can skip this check
	// if (corner && !isMidPathPointValid(g, next)) {
	// 	result.broken = true
	// 	return false
	// }

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
