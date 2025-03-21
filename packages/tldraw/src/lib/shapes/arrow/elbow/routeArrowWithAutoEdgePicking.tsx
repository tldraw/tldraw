import { ElbowArrowSide } from '@tldraw/editor'
import { ElbowArrowRoute, tryRouteArrow } from './elbowArrowRoutes'
import { ElbowArrowInfoWithoutRoute } from './getElbowArrowInfo'

// currently, other than some fairly mild heuristic based checks, we use these `pickBest` based
// checks that take a prioritized list of potential arrows and returns the shortest arrow from the
// first set with a valid entry. There's probably a much better/more efficient way to do this.

export function routeArrowWithAutoEdgePicking(
	info: ElbowArrowInfoWithoutRoute
): ElbowArrowRoute | null {
	if (info.gapX > info.gapY) {
		return pickBest(info, [
			[
				// hs prefer S arrows
				['right', 'left'],
				['right', 'top'],
				['right', 'bottom'],
				['right', 'right'],
			],
			[
				['top', 'left'],
				['bottom', 'left'],
			],
			[
				['top', 'top'],
				['bottom', 'bottom'],
			],
		])
	} else {
		if (
			info.A.edges.right &&
			info.B.edges.top &&
			info.A.edges.right.expanded <= info.B.edges.top.crossTarget
		) {
			const route = tryRouteArrow(info, 'right', 'top')
			if (route) return route
		}
		if (info.midY !== null) {
			const route = tryRouteArrow(info, 'bottom', 'top')
			if (route) return route
		}
		return pickBest(info, [
			[
				['bottom', 'left'],
				['bottom', 'right'],
				['bottom', 'bottom'],
			],
			[
				['left', 'top'],
				['right', 'top'],
			],
			[
				['right', 'right'],
				['left', 'left'],
			],
		])
	}
}

export function routeArrowWithPartialEdgePicking(
	info: ElbowArrowInfoWithoutRoute,
	aSide: ElbowArrowSide
) {
	switch (aSide) {
		case 'top':
			return pickBest(info, [
				[
					['top', 'bottom'],
					['top', 'right'],
					['top', 'left'],
					['top', 'top'],
				],
				[
					['left', 'bottom'],
					['right', 'bottom'],
					['left', 'left'],
					['right', 'right'],
					['left', 'right'],
					['right', 'left'],
					['left', 'top'],
					['right', 'top'],
				],
				[
					['bottom', 'top'],
					['bottom', 'right'],
					['bottom', 'left'],
					['bottom', 'bottom'],
				],
			])
		case 'bottom':
			return pickBest(info, [
				[
					['bottom', 'top'],
					['bottom', 'right'],
					['bottom', 'left'],
					['bottom', 'bottom'],
				],
				[
					['left', 'top'],
					['right', 'top'],
					['left', 'left'],
					['right', 'right'],
					['left', 'right'],
					['right', 'left'],
					['left', 'bottom'],
					['right', 'bottom'],
				],
				[
					['top', 'bottom'],
					['top', 'right'],
					['top', 'left'],
					['top', 'top'],
				],
			])
		case 'left':
			return pickBest(info, [
				[
					['left', 'right'],
					['left', 'bottom'],
					['left', 'top'],
					['left', 'left'],
				],
				[
					['top', 'right'],
					['bottom', 'right'],
					['top', 'top'],
					['bottom', 'bottom'],
					['top', 'bottom'],
					['bottom', 'top'],
					['top', 'left'],
					['bottom', 'left'],
				],
				[
					['right', 'left'],
					['right', 'top'],
					['right', 'bottom'],
					['right', 'right'],
				],
			])
		case 'right':
			return pickBest(info, [
				[
					['right', 'left'],
					['right', 'top'],
					['right', 'bottom'],
					['right', 'right'],
				],
				[
					['top', 'left'],
					['bottom', 'left'],
					['top', 'top'],
					['bottom', 'bottom'],
					['top', 'bottom'],
					['bottom', 'top'],
					['top', 'right'],
					['bottom', 'right'],
				],
				[
					['left', 'right'],
					['left', 'bottom'],
					['left', 'top'],
					['left', 'left'],
				],
			])
	}
}

/**
 * Pick the best route from a set of candidates, in descending priority. For example, this:
 * ```tsx
 * pickBest(info, [
 *   [['right', 'left']],
 *   [['right', 'top'], ['right', 'bottom']],
 *   [['right', 'right']],
 * ])
 * ```
 *
 * will check if left-right is possible, and return it if it is. Then it'll check right-top and
 * right-bottom, and if either is possible return that. If neither is possible, it'll return right-right.
 */
function pickBest(
	info: ElbowArrowInfoWithoutRoute,
	edgeSets: [ElbowArrowSide, ElbowArrowSide][][]
) {
	for (const set of edgeSets) {
		let bestRoute: ElbowArrowRoute | null = null
		let bestLengthSq = Infinity
		let bias = 0
		for (const edges of set) {
			bias++
			const route = tryRouteArrow(info, edges[0], edges[1])
			if (route) {
				if (route.length + bias < bestLengthSq) {
					bestLengthSq = route.length
					bestRoute = route
				}
			}
		}
		if (bestRoute) {
			return bestRoute
		}
	}
	return null
}
