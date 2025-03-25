import { ElbowArrowSide } from '@tldraw/editor'
import { ElbowArrowSideReason } from './definitions'
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
				['right', 'left', 'auto', 'auto'],
				['right', 'top', 'auto', 'auto'],
				['right', 'bottom', 'auto', 'auto'],
				['right', 'right', 'auto', 'auto'],
			],
			[
				['top', 'left', 'auto', 'auto'],
				['bottom', 'left', 'auto', 'auto'],
			],
			[
				['top', 'top', 'auto', 'auto'],
				['bottom', 'bottom', 'auto', 'auto'],
			],
		])
	} else {
		if (
			info.A.edges.right &&
			info.B.edges.top &&
			info.A.edges.right.expanded <= info.B.edges.top.crossTarget
		) {
			const route = tryRouteArrow(info, 'right', 'top')
			if (route) {
				route.aEdgePicking = 'auto'
				route.bEdgePicking = 'auto'
				return route
			}
		}
		if (info.midY !== null) {
			const route = tryRouteArrow(info, 'bottom', 'top')
			if (route) {
				route.aEdgePicking = 'auto'
				route.bEdgePicking = 'auto'
				return route
			}
		}
		return pickBest(info, [
			[
				['bottom', 'left', 'auto', 'auto'],
				['bottom', 'right', 'auto', 'auto'],
				['bottom', 'bottom', 'auto', 'auto'],
			],
			[
				['left', 'top', 'auto', 'auto'],
				['right', 'top', 'auto', 'auto'],
			],
			[
				['right', 'right', 'auto', 'auto'],
				['left', 'left', 'auto', 'auto'],
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
					['top', 'bottom', 'manual', 'auto'],
					['top', 'right', 'manual', 'auto'],
					['top', 'left', 'manual', 'auto'],
					['top', 'top', 'manual', 'auto'],
				],
				[
					['left', 'bottom', 'fallback', 'auto'],
					['right', 'bottom', 'fallback', 'auto'],
					['left', 'left', 'fallback', 'auto'],
					['right', 'right', 'fallback', 'auto'],
					['left', 'right', 'fallback', 'auto'],
					['right', 'left', 'fallback', 'auto'],
					['left', 'top', 'fallback', 'auto'],
					['right', 'top', 'fallback', 'auto'],
				],
				[
					['bottom', 'top', 'fallback', 'auto'],
					['bottom', 'right', 'fallback', 'auto'],
					['bottom', 'left', 'fallback', 'auto'],
					['bottom', 'bottom', 'fallback', 'auto'],
				],
			])
		case 'bottom':
			return pickBest(info, [
				[
					['bottom', 'top', 'manual', 'auto'],
					['bottom', 'right', 'manual', 'auto'],
					['bottom', 'left', 'manual', 'auto'],
					['bottom', 'bottom', 'manual', 'auto'],
				],
				[
					['left', 'top', 'fallback', 'auto'],
					['right', 'top', 'fallback', 'auto'],
					['left', 'left', 'fallback', 'auto'],
					['right', 'right', 'fallback', 'auto'],
					['left', 'right', 'fallback', 'auto'],
					['right', 'left', 'fallback', 'auto'],
					['left', 'bottom', 'fallback', 'auto'],
					['right', 'bottom', 'fallback', 'auto'],
				],
				[
					['top', 'bottom', 'fallback', 'auto'],
					['top', 'right', 'fallback', 'auto'],
					['top', 'left', 'fallback', 'auto'],
					['top', 'top', 'fallback', 'auto'],
				],
			])
		case 'left':
			return pickBest(info, [
				[
					['left', 'right', 'manual', 'auto'],
					['left', 'bottom', 'manual', 'auto'],
					['left', 'top', 'manual', 'auto'],
					['left', 'left', 'manual', 'auto'],
				],
				[
					['top', 'right', 'fallback', 'auto'],
					['bottom', 'right', 'fallback', 'auto'],
					['top', 'top', 'fallback', 'auto'],
					['bottom', 'bottom', 'fallback', 'auto'],
					['top', 'bottom', 'fallback', 'auto'],
					['bottom', 'top', 'fallback', 'auto'],
					['top', 'left', 'fallback', 'auto'],
					['bottom', 'left', 'fallback', 'auto'],
				],
				[
					['right', 'left', 'fallback', 'auto'],
					['right', 'top', 'fallback', 'auto'],
					['right', 'bottom', 'fallback', 'auto'],
					['right', 'right', 'fallback', 'auto'],
				],
			])
		case 'right':
			return pickBest(info, [
				[
					['right', 'left', 'manual', 'auto'],
					['right', 'top', 'manual', 'auto'],
					['right', 'bottom', 'manual', 'auto'],
					['right', 'right', 'manual', 'auto'],
				],
				[
					['top', 'left', 'fallback', 'auto'],
					['bottom', 'left', 'fallback', 'auto'],
					['top', 'top', 'fallback', 'auto'],
					['bottom', 'bottom', 'fallback', 'auto'],
					['top', 'bottom', 'fallback', 'auto'],
					['bottom', 'top', 'fallback', 'auto'],
					['top', 'right', 'fallback', 'auto'],
					['bottom', 'right', 'fallback', 'auto'],
				],
				[
					['left', 'right', 'fallback', 'auto'],
					['left', 'bottom', 'fallback', 'auto'],
					['left', 'top', 'fallback', 'auto'],
					['left', 'left', 'fallback', 'auto'],
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
	edgeSets: [ElbowArrowSide, ElbowArrowSide, ElbowArrowSideReason, ElbowArrowSideReason][][]
) {
	const isDistance = info.options.shortestArrowMeasure === 'distance'
	for (const set of edgeSets) {
		let bestRoute: ElbowArrowRoute | null = null
		let bestLength = Infinity
		let bias = 0
		for (const edges of set) {
			bias++
			const route = tryRouteArrow(info, edges[0], edges[1])
			if (route) {
				route.aEdgePicking = edges[2]
				route.bEdgePicking = edges[3]
				const length = isDistance ? route.distance : route.points.length
				if (length + bias < bestLength) {
					bestLength = length
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
