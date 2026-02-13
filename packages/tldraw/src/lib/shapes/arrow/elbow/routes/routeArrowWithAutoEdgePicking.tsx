import { exhaustiveSwitchError } from '@tldraw/editor'
import {
	ElbowArrowRoute,
	ElbowArrowSide,
	ElbowArrowSideOpposites,
	ElbowArrowSideReason,
	ElbowArrowSides,
} from '../definitions'
import { ElbowArrowWorkingInfo } from './ElbowArrowWorkingInfo'
import { tryRouteArrow } from './elbowArrowRoutes'

export function routeArrowWithAutoEdgePicking(
	info: ElbowArrowWorkingInfo,
	reason: ElbowArrowSideReason
): ElbowArrowRoute | null {
	let idealRoute = null
	if (
		// +1 to bias us towards the x-axis. without this, we get flicker as we move an arrow locket
		// to 45 deg (as gapx/gapy are almost equal and the result depends on floating point
		// precision)
		Math.abs(info.gapX) + 1 > Math.abs(info.gapY) &&
		info.midX !== null
	) {
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
		} else if (info.gapY > 0 && info.midY !== null) {
			idealRoute = tryRouteArrow(info, 'bottom', 'top')
		} else if (info.gapY < 0 && info.midY !== null) {
			idealRoute = tryRouteArrow(info, 'top', 'bottom')
		}
	}

	if (idealRoute) {
		idealRoute.aEdgePicking = reason
		idealRoute.bEdgePicking = reason
		return idealRoute
	}

	const aAvailableSide = ElbowArrowSides.filter((side) => info.A.edges[side])
	const bAvailableSides = ElbowArrowSides.filter((side) => info.B.edges[side])

	const nonPartialRouteCandidates = aAvailableSide.flatMap((aSide) =>
		bAvailableSides.map((bSide) => [aSide, bSide, reason, reason] as const)
	)

	return pickBest(info, nonPartialRouteCandidates)
}

export function routeArrowWithPartialEdgePicking(
	info: ElbowArrowWorkingInfo,
	aSide: ElbowArrowSide
) {
	let idealRoute = null

	const aRight = info.A.edges.right
	const aLeft = info.A.edges.left
	const bTop = info.B.edges.top
	const bBottom = info.B.edges.bottom

	switch (aSide) {
		case 'right':
			if (info.gapX > 0 && info.gapX > Math.abs(info.gapY) && info.midX !== null) {
				idealRoute = tryRouteArrow(info, 'right', 'left')
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
			}
			break
		case 'left':
			if (info.gapX < 0 && Math.abs(info.gapX) > Math.abs(info.gapY) && info.midX !== null) {
				idealRoute = tryRouteArrow(info, 'left', 'right')
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
			}
			break
		case 'top':
		case 'bottom':
			// top and bottom are handled by the pickShortest approach below - it automatically
			// picks the path we would pick with heuristics anyway.
			break
		default:
			exhaustiveSwitchError(aSide)
	}

	if (idealRoute) {
		idealRoute.aEdgePicking = 'manual'
		idealRoute.bEdgePicking = 'auto'
		return idealRoute
	}

	switch (aSide) {
		case 'top':
			return pickBest(info, [
				['top', 'bottom', 'manual', 'auto'],
				['top', 'right', 'manual', 'auto'],
				['top', 'left', 'manual', 'auto'],
				['top', 'top', 'manual', 'auto'],
			])
		case 'bottom':
			return pickBest(info, [
				['bottom', 'top', 'manual', 'auto'],
				['bottom', 'right', 'manual', 'auto'],
				['bottom', 'left', 'manual', 'auto'],
				['bottom', 'bottom', 'manual', 'auto'],
			])
		case 'left':
			return pickBest(info, [
				['left', 'right', 'manual', 'auto'],
				['left', 'bottom', 'manual', 'auto'],
				['left', 'left', 'manual', 'auto'],
				['left', 'top', 'manual', 'auto'],
			])
		case 'right':
			return pickBest(info, [
				['right', 'left', 'manual', 'auto'],
				['right', 'bottom', 'manual', 'auto'],
				['right', 'right', 'manual', 'auto'],
				['right', 'top', 'manual', 'auto'],
			])
	}
}

export function routeArrowWithManualEdgePicking(
	info: ElbowArrowWorkingInfo,
	aSide: ElbowArrowSide,
	bSide: ElbowArrowSide
) {
	const route = tryRouteArrow(info, aSide, bSide)
	if (route) return route

	if (info.A.isPoint && info.B.isPoint) {
		return pickBest(info, [
			[ElbowArrowSideOpposites[aSide], ElbowArrowSideOpposites[bSide], 'manual', 'manual'],
			[aSide, ElbowArrowSideOpposites[bSide], 'manual', 'auto'],
			[ElbowArrowSideOpposites[aSide], bSide, 'auto', 'manual'],
		])
	} else if (info.A.isPoint) {
		return tryRouteArrow(info, ElbowArrowSideOpposites[aSide], bSide)
	} else if (info.B.isPoint) {
		return tryRouteArrow(info, aSide, ElbowArrowSideOpposites[bSide])
	}

	return null
}
function pickBest(
	info: ElbowArrowWorkingInfo,
	edges: ReadonlyArray<
		readonly [ElbowArrowSide, ElbowArrowSide, ElbowArrowSideReason, ElbowArrowSideReason]
	>
) {
	let bestRoute: ElbowArrowRoute | null = null
	let bestCornerCount = Infinity
	let bestDistance = Infinity
	let distanceBias = 0
	for (const [aSide, bSide, aEdgePicking, bEdgePicking] of edges) {
		distanceBias += 1
		const route = tryRouteArrow(info, aSide, bSide)
		if (route) {
			route.aEdgePicking = aEdgePicking
			route.bEdgePicking = bEdgePicking
			if (route.points.length < bestCornerCount) {
				bestCornerCount = route.points.length
				bestDistance = route.distance
				bestRoute = route
			} else if (
				route.points.length === bestCornerCount &&
				route.distance + distanceBias < bestDistance
			) {
				bestDistance = route.distance
				bestRoute = route
			}
		}
	}
	return bestRoute
}
