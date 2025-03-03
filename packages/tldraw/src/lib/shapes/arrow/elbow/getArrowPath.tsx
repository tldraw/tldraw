import { Box, Vec } from '@tldraw/editor'
import { ArrowDirection, DELTAS, DIRS } from './constants'
import { ArrowNavigationGrid } from './getArrowNavigationGrid'

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
): { error: true } | { error: false; path: Vec[] } {
	const { options } = g
	const edgesA: [ArrowDirection, Vec, Vec][] = [
		['up', g.A.top, g.A.expanded.top],
		['right', g.A.right, g.A.expanded.right],
		['down', g.A.bottom, g.A.expanded.bottom],
		['left', g.A.left, g.A.expanded.left],
	]

	const edgesB: [ArrowDirection, Vec, Vec][] = [
		['up', g.B.top, g.B.expanded.top],
		['right', g.B.right, g.B.expanded.right],
		['down', g.B.bottom, g.B.expanded.bottom],
		['left', g.B.left, g.B.expanded.left],
	]

	let edges: [ArrowDirection, ArrowDirection] = ['up', 'up']

	// gapDir is h or v if is there are no overlaps, ie both left/above, right/above, right/below, or left/below

	if (g.gapDir === 'h') {
		// hs prefer S arrows
		edges = [
			g.hPos === 'a-left-of-b' ? 'right' : 'left',
			g.hPos === 'a-left-of-b' ? 'left' : 'right',
		]
	} else if (g.gapDir === 'v') {
		edges = ['right', 'right'] // temp

		if (g.vPos === 'a-above-b') {
			if (g.hPos === 'a-right-of-b') {
				edges = ['left', 'up']
			} else if (g.hPos === 'a-left-of-b') {
				edges = ['right', 'up']
			} else {
				if (g.A.expanded.left.x > g.B.center.x) {
					edges = ['left', 'up']
				} else if (g.A.expanded.right.x < g.B.center.x) {
					edges = ['right', 'up']
				} else {
					edges = ['down', 'up']
				}
			}
		} else if (g.vPos === 'a-below-b') {
			if (g.hPos === 'a-right-of-b') {
				edges = ['left', 'down']
			} else if (g.hPos === 'a-left-of-b') {
				edges = ['right', 'down']
			} else {
				if (g.A.expanded.left.x > g.B.center.x) {
					edges = ['left', 'down']
				} else if (g.A.expanded.right.x < g.B.center.x) {
					edges = ['right', 'down']
				} else {
					edges = ['up', 'down']
				}
			}
		}
	} else {
		if (g.hPos === 'a-left-of-b') {
			if (g.A.center.y < g.B.center.y) {
				if (g.A.center.y < g.B.expanded.top.y) {
					edges = ['right', 'up']
				} else {
					edges = ['up', 'up']
				}
			} else {
				if (g.A.center.y > g.B.expanded.bottom.y) {
					edges = ['right', 'down']
				} else {
					edges = ['down', 'down']
				}
			}
		} else if (g.hPos === 'a-right-of-b') {
			if (g.A.center.y < g.B.center.y) {
				if (g.A.center.y < g.B.expanded.top.y) {
					edges = ['left', 'up']
				} else {
					edges = ['up', 'up']
				}
			} else {
				if (g.A.center.y > g.B.expanded.bottom.y) {
					edges = ['left', 'down']
				} else {
					edges = ['down', 'down']
				}
			}
		} else if (g.vPos === 'a-above-b') {
			// to short for an s, so make a c
			if (g.A.center.x < g.B.center.x) {
				if (g.A.expanded.right.x < g.B.center.x) {
					// l arrow, right to top
					edges = ['right', 'up']
				} else {
					// c arrow, right to right
					edges = ['right', 'right']
				}
			} else {
				if (g.A.expanded.left.x > g.B.center.x) {
					// l arrow, left to top
					edges = ['left', 'up']
				} else {
					// c arrow, left to left
					edges = ['left', 'left']
				}
			}
		} else if (g.vPos === 'a-below-b') {
			if (g.A.center.x < g.B.center.x) {
				if (g.A.expanded.right.x < g.B.center.x) {
					edges = ['right', 'down']
				} else {
					edges = ['right', 'right']
				}
			} else {
				if (g.A.expanded.left.x > g.B.center.x) {
					edges = ['left', 'down']
				} else {
					edges = ['left', 'left']
				}
			}
		} else {
			if (g.A.top.y < g.B.top.y) {
				if (g.A.expanded.right.x < g.B.expanded.right.x) {
					edges = ['up', 'right']
				} else {
					edges = ['up', 'left']
				}
			} else {
				if (g.A.expanded.right.x < g.B.expanded.right.x) {
					edges = ['down', 'right']
				} else {
					edges = ['down', 'left']
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
	// 			edges = [edgesA[i], edgesB[j]]
	// 		}
	// 	}
	// }

	const closestPair = [
		edgesA.find((e) => e[0] === edges[0])!,
		edgesB.find((e) => e[0] === edges[1])!,
	]

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
		}
	}

	const shortestPath = finalPaths[0].path.map((p) => g.gridPoints[p.y][p.x])

	const pointBox = Box.FromPoints(shortestPath)
	if (pointBox.w < options.minElbowLegLength) {
		shortestPath.forEach((p) => (p.x = g.A.center.x))
	} else if (pointBox.h < options.minElbowLegLength) {
		shortestPath.forEach((p) => (p.y = g.A.center.y))
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
		point.equals(g.B.expanded.top) ||
		point.equals(g.B.expanded.right) ||
		point.equals(g.B.expanded.bottom) ||
		point.equals(g.B.expanded.left) ||
		point.equals(g.B.expanded.topRight) ||
		point.equals(g.B.expanded.topLeft) ||
		point.equals(g.B.expanded.bottomRight) ||
		point.equals(g.B.expanded.bottomLeft) ||
		!(g.A.expanded.box.containsPoint(point) || g.B.expanded.box.containsPoint(point))
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
	return pos === g.B.top || pos === g.B.right || pos === g.B.bottom || pos === g.B.left
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
		if (
			next === g.A.expanded.top ||
			next === g.A.expanded.right ||
			next === g.A.expanded.bottom ||
			next === g.A.expanded.left
		) {
			result.phase = 'mid'
		} else {
			// Otherwise, we're broken
			result.broken = true
			return false
		}
	}

	// If we're in phase mid and the next point is an edge of B.e, we're in phase b
	else if (result.phase === 'mid') {
		if (
			next === g.B.expanded.top ||
			next === g.B.expanded.right ||
			next === g.B.expanded.bottom ||
			next === g.B.expanded.left
		) {
			result.phase = 'b'
		} else {
			// If we're in the mid phase and the point is on the expanded bounds of A or B, we're done
			if (g.A.expanded.box.containsPoint(next) || g.B.expanded.box.containsPoint(next)) {
				result.broken = true
				return false
			}
		}
	} else if (result.phase === 'b') {
		// From B, the only valid points should be the edges of B
		if (!(next === g.B.top || next === g.B.right || next === g.B.bottom || next === g.B.left)) {
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
