import { assertExists, ElbowArrowSide } from '@tldraw/editor'
import { ElbowArrowRoute, measureRouteLengthSq, tryRouteArrow } from './elbowArrowRoutes'
import { ElbowArrowInfoWithoutRoute } from './getElbowArrowInfo'

export function routeArrowWithAutoEdgePicking(
	info: ElbowArrowInfoWithoutRoute
): ElbowArrowRoute | null {
	if (info.gapX > info.gapY) {
		if (info.mx !== null) {
			// hs prefer S arrows
			return assertExists(tryRouteArrow(info, 'right', 'left'))
		} else {
			return pickBest(info, [
				[
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
		}
	} else {
		if (
			info.edges.A.right &&
			info.edges.B.top &&
			info.edges.A.right.expanded <= info.edges.B.top.crossCenter
		) {
			return assertExists(tryRouteArrow(info, 'right', 'top'))
		} else if (info.my !== null) {
			return assertExists(tryRouteArrow(info, 'bottom', 'top'))
		} else {
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
				const lengthSq = measureRouteLengthSq(route)
				if (lengthSq + bias < bestLengthSq) {
					bestLengthSq = lengthSq
					bestRoute = route
				}
			}
		}
		if (bestRoute) return bestRoute
	}
	return null
}
