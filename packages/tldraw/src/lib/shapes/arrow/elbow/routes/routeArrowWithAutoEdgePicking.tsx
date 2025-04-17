import { ElbowArrowSide } from '@tldraw/editor'
import { ElbowArrowRoute, ElbowArrowSideReason, ElbowArrowSides } from '../definitions'
import { ElbowArrowWorkingInfo } from './ElbowArrowWorkingInfo'
import { tryRouteArrow } from './elbowArrowRoutes'

// currently, other than some fairly mild heuristic based checks, we use these `pickBest` based
// checks that take a prioritized list of potential arrows and returns the shortest arrow from the
// first set with a valid entry. There's probably a much better/more efficient way to do this.

// ALL 16:
// TT TR TB TL
// RT RR RB RL
// BT BR BB BL
// LT LR LB LL

// const ROUTE_RIGHT_TO_LEFT = [
// 	// hs prefer S arrows
// 	[['right', 'left', 'auto', 'auto']],
// 	// try and keep one edge, but fallback to an adjacent edge:
// 	[
// 		['right', 'top', 'auto', 'auto'],
// 		['right', 'bottom', 'auto', 'auto'],
// 		['top', 'left', 'auto', 'auto'],
// 		['bottom', 'left', 'auto', 'auto'],
// 	],
// 	// try and keep one edge, but fall back to an opposite edge:
// 	[
// 		['right', 'right', 'auto', 'auto'],
// 		['left', 'left', 'auto', 'auto'],
// 	],
// 	// use two adjacent edges:
// 	[
// 		['top', 'top', 'auto', 'auto'],
// 		['bottom', 'bottom', 'auto', 'auto'],
// 		['top', 'bottom', 'auto', 'auto'],
// 		['bottom', 'top', 'auto', 'auto'],
// 	],
// 	// the rest:
// 	[
// 		['top', 'right', 'auto', 'auto'],
// 		['left', 'top', 'auto', 'auto'],
// 		['bottom', 'right', 'auto', 'auto'],
// 		['left', 'bottom', 'auto', 'auto'],
// 		['left', 'right', 'auto', 'auto'],
// 	],
// ] as const

// const ROUTE_LEFT_TO_RIGHT = [
// 	// hs prefer S arrows
// 	[['left', 'right', 'auto', 'auto']],
// 	// try and keep one edge, but fallback to an adjacent edge:
// 	[
// 		['left', 'top', 'auto', 'auto'],
// 		['left', 'bottom', 'auto', 'auto'],
// 		['top', 'right', 'auto', 'auto'],
// 		['bottom', 'right', 'auto', 'auto'],
// 	],
// 	// try and keep one edge, but fall back to an opposite edge:
// 	[
// 		['left', 'right', 'auto', 'auto'],
// 		['right', 'right', 'auto', 'auto'],
// 	],
// 	// use two adjacent edges:
// 	[
// 		['top', 'top', 'auto', 'auto'],
// 		['bottom', 'bottom', 'auto', 'auto'],
// 		['top', 'bottom', 'auto', 'auto'],
// 		['bottom', 'top', 'auto', 'auto'],
// 	],
// 	// the rest:
// 	[
// 		['top', 'left', 'auto', 'auto'],
// 		['right', 'top', 'auto', 'auto'],
// 		['bottom', 'left', 'auto', 'auto'],
// 		['right', 'bottom', 'auto', 'auto'],
// 		['right', 'left', 'auto', 'auto'],
// 	],
// ] as const

// const ROUTE_SHORTEST = {
// 	orderBias: 0,
// 	routes: [
// 		[
// 			['top', 'top', 'auto', 'auto'],
// 			['top', 'right', 'auto', 'auto'],
// 			['top', 'bottom', 'auto', 'auto'],
// 			['top', 'left', 'auto', 'auto'],
// 			['right', 'top', 'auto', 'auto'],
// 			['right', 'right', 'auto', 'auto'],
// 			['right', 'bottom', 'auto', 'auto'],
// 			['right', 'left', 'auto', 'auto'],
// 			['bottom', 'top', 'auto', 'auto'],
// 			['bottom', 'right', 'auto', 'auto'],
// 			['bottom', 'bottom', 'auto', 'auto'],
// 			['bottom', 'left', 'auto', 'auto'],
// 			['left', 'top', 'auto', 'auto'],
// 			['left', 'right', 'auto', 'auto'],
// 			['left', 'bottom', 'auto', 'auto'],
// 			['left', 'left', 'auto', 'auto'],
// 		],
// 	],
// } as const

// const ROUTE_RIGHT_TO_TOP_OR_BOTTOM = [
// 	// hs prefer S arrows
// 	[['right', 'left', 'auto', 'auto']],
// 	// try and keep one edge, but fallback to an adjacent edge:
// 	[
// 		['right', 'top', 'auto', 'auto'],
// 		['right', 'bottom', 'auto', 'auto'],
// 		['top', 'left', 'auto', 'auto'],
// 		['bottom', 'left', 'auto', 'auto'],
// 	],
// 	// try and keep one edge, but fall back to an opposite edge:
// 	[
// 		['right', 'right', 'auto', 'auto'],
// 		['left', 'left', 'auto', 'auto'],
// 	],
// 	// use two adjacent edges:
// 	[
// 		['top', 'top', 'auto', 'auto'],
// 		['bottom', 'bottom', 'auto', 'auto'],
// 		['top', 'bottom', 'auto', 'auto'],
// 		['bottom', 'top', 'auto', 'auto'],
// 	],
// 	// the rest:
// 	[
// 		['top', 'right', 'auto', 'auto'],
// 		['left', 'top', 'auto', 'auto'],
// 		['bottom', 'right', 'auto', 'auto'],
// 		['left', 'bottom', 'auto', 'auto'],
// 		['left', 'right', 'auto', 'auto'],
// 	],
// ] as const

export function routeArrowWithAutoEdgePicking(info: ElbowArrowWorkingInfo): ElbowArrowRoute | null {
	let idealRoute = null
	if (Math.abs(info.gapX) > Math.abs(info.gapY) && info.midX !== null) {
		if (info.gapX > 0) {
			idealRoute = tryRouteArrow(info, 'right', 'left')
		} else {
			idealRoute = tryRouteArrow(info, 'left', 'right')
		}
	} else {
		const aRight = info.A.edges.right
		const aLeft = info.A.edges.left
		const bTop = info.B.edges.top
		const bBottom = info.B.edges.bottom

		if (info.A.isPoint && info.B.isPoint) {
			if (info.gapY > 0) {
				idealRoute = tryRouteArrow(info, 'bottom', 'top')
			} else {
				idealRoute = tryRouteArrow(info, 'top', 'bottom')
			}
		} else if (
			aRight &&
			bTop &&
			(aRight.expanded ?? aRight.value) <= bTop.crossTarget &&
			aRight.crossTarget <= (bTop.expanded ?? bTop.value)
		) {
			idealRoute = tryRouteArrow(info, 'right', 'top')
		} else if (
			aRight &&
			bBottom &&
			(aRight.expanded ?? aRight.value) <= bBottom.crossTarget &&
			aRight.crossTarget >= (bBottom.expanded ?? bBottom.value)
		) {
			idealRoute = tryRouteArrow(info, 'right', 'bottom')
		} else if (
			aLeft &&
			bTop &&
			(aLeft.expanded ?? aLeft.value) >= bTop.crossTarget &&
			aLeft.crossTarget <= (bTop.expanded ?? bTop.value)
		) {
			idealRoute = tryRouteArrow(info, 'left', 'top')
		} else if (
			aLeft &&
			bBottom &&
			(aLeft.expanded ?? aLeft.value) >= bBottom.crossTarget &&
			aLeft.crossTarget >= (bBottom.expanded ?? bBottom.value)
		) {
			idealRoute = tryRouteArrow(info, 'left', 'bottom')
		} else if (info.gapY > 0) {
			idealRoute = tryRouteArrow(info, 'bottom', 'top')
		} else if (info.gapY < 0) {
			idealRoute = tryRouteArrow(info, 'top', 'bottom')
		}
	}

	if (idealRoute) {
		idealRoute.aEdgePicking = 'auto'
		idealRoute.bEdgePicking = 'auto'
		return idealRoute
	}

	const aNonPartialSides = ElbowArrowSides.filter(
		(side) => info.A.edges[side] && !info.A.edges[side]!.isPartial
	)
	const bNonPartialSides = ElbowArrowSides.filter(
		(side) => info.B.edges[side] && !info.B.edges[side]!.isPartial
	)

	const nonPartialRouteCandidates = aNonPartialSides.flatMap((aSide) =>
		bNonPartialSides.map((bSide) => [aSide, bSide, 'auto', 'auto'] as const)
	)

	return pickBest(info, {
		orderBias: 1,
		routes: [nonPartialRouteCandidates],
	})
}

export function routeArrowWithPartialEdgePicking(
	info: ElbowArrowWorkingInfo,
	aSide: ElbowArrowSide
) {
	switch (aSide) {
		case 'top':
			return pickBest(info, {
				orderBias: 1,
				routes: [
					[
						['top', 'bottom', 'manual', 'auto'],
						['top', 'right', 'manual', 'auto'],
						['top', 'left', 'manual', 'auto'],
						['top', 'top', 'manual', 'auto'],
					],
					// [
					// 	['left', 'bottom', 'fallback', 'auto'],
					// 	['right', 'bottom', 'fallback', 'auto'],
					// 	['left', 'left', 'fallback', 'auto'],
					// 	['right', 'right', 'fallback', 'auto'],
					// 	['left', 'right', 'fallback', 'auto'],
					// 	['right', 'left', 'fallback', 'auto'],
					// 	['left', 'top', 'fallback', 'auto'],
					// 	['right', 'top', 'fallback', 'auto'],
					// ],
					// [
					// 	['bottom', 'top', 'fallback', 'auto'],
					// 	['bottom', 'right', 'fallback', 'auto'],
					// 	['bottom', 'left', 'fallback', 'auto'],
					// 	['bottom', 'bottom', 'fallback', 'auto'],
					// ],
				],
			})
		case 'bottom':
			return pickBest(info, {
				orderBias: 1,
				routes: [
					[
						['bottom', 'top', 'manual', 'auto'],
						['bottom', 'right', 'manual', 'auto'],
						['bottom', 'left', 'manual', 'auto'],
						['bottom', 'bottom', 'manual', 'auto'],
					],
					// [
					// 	['left', 'top', 'fallback', 'auto'],
					// 	['right', 'top', 'fallback', 'auto'],
					// 	['left', 'left', 'fallback', 'auto'],
					// 	['right', 'right', 'fallback', 'auto'],
					// 	['left', 'right', 'fallback', 'auto'],
					// 	['right', 'left', 'fallback', 'auto'],
					// 	['left', 'bottom', 'fallback', 'auto'],
					// 	['right', 'bottom', 'fallback', 'auto'],
					// ],
					// [
					// 	['top', 'bottom', 'fallback', 'auto'],
					// 	['top', 'right', 'fallback', 'auto'],
					// 	['top', 'left', 'fallback', 'auto'],
					// 	['top', 'top', 'fallback', 'auto'],
					// ],
				],
			})
		case 'left':
			return pickBest(info, {
				orderBias: 1,
				routes: [
					[
						['left', 'right', 'manual', 'auto'],
						['left', 'bottom', 'manual', 'auto'],
						['left', 'top', 'manual', 'auto'],
						['left', 'left', 'manual', 'auto'],
					],
					// [
					// 	['top', 'right', 'fallback', 'auto'],
					// 	['bottom', 'right', 'fallback', 'auto'],
					// 	['top', 'top', 'fallback', 'auto'],
					// 	['bottom', 'bottom', 'fallback', 'auto'],
					// 	['top', 'bottom', 'fallback', 'auto'],
					// 	['bottom', 'top', 'fallback', 'auto'],
					// 	['top', 'left', 'fallback', 'auto'],
					// 	['bottom', 'left', 'fallback', 'auto'],
					// ],
					// [
					// 	['right', 'left', 'fallback', 'auto'],
					// 	['right', 'top', 'fallback', 'auto'],
					// 	['right', 'bottom', 'fallback', 'auto'],
					// 	['right', 'right', 'fallback', 'auto'],
					// ],
				],
			})
		case 'right':
			return pickBest(info, {
				orderBias: 1,
				routes: [
					[
						['right', 'left', 'manual', 'auto'],
						['right', 'top', 'manual', 'auto'],
						['right', 'bottom', 'manual', 'auto'],
						['right', 'right', 'manual', 'auto'],
					],
					// [
					// 	['top', 'left', 'fallback', 'auto'],
					// 	['bottom', 'left', 'fallback', 'auto'],
					// 	['top', 'top', 'fallback', 'auto'],
					// 	['bottom', 'bottom', 'fallback', 'auto'],
					// 	['top', 'bottom', 'fallback', 'auto'],
					// 	['bottom', 'top', 'fallback', 'auto'],
					// 	['top', 'right', 'fallback', 'auto'],
					// 	['bottom', 'right', 'fallback', 'auto'],
					// ],
					// [
					// 	['left', 'right', 'fallback', 'auto'],
					// 	['left', 'bottom', 'fallback', 'auto'],
					// 	['left', 'top', 'fallback', 'auto'],
					// 	['left', 'left', 'fallback', 'auto'],
					// ],
				],
			})
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
 * right-bottom, and if either is possible return the shortest. If neither is possible, it'll return
 * right-right.
 */
function pickBest(
	info: ElbowArrowWorkingInfo,
	edgeSets: {
		orderBias: number
		routes: ReadonlyArray<
			ReadonlyArray<
				readonly [ElbowArrowSide, ElbowArrowSide, ElbowArrowSideReason, ElbowArrowSideReason]
			>
		>
	}
) {
	const isDistance = info.options.shortestArrowMeasure === 'distance'
	for (const set of edgeSets.routes) {
		let bestRoute: ElbowArrowRoute | null = null
		let bestLength = Infinity
		let bias = 0
		for (const edges of set) {
			bias += edgeSets.orderBias
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
