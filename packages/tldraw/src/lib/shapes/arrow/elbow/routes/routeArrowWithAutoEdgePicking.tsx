import { exhaustiveSwitchError } from '@tldraw/editor'
import {
	ElbowArrowRoute,
	ElbowArrowSide,
	ElbowArrowSideOpposites,
	ElbowArrowSideReason,
	ElbowArrowSides,
} from '../definitions'
import { tryRouteArrow } from './elbowArrowRoutes'
import { ElbowArrowWorkingInfo } from './ElbowArrowWorkingInfo'

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
	} else if (info.A.isPoint && info.B.isPoint) {
		if (info.gapY > 0) {
			idealRoute = tryRouteArrow(info, 'bottom', 'top')
		} else {
			idealRoute = tryRouteArrow(info, 'top', 'bottom')
		}
	} else {
		const cornerSides = pickCornerSides(info, ['right', 'left'])
		if (cornerSides) {
			idealRoute = tryRouteArrow(info, cornerSides[0], cornerSides[1])
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

	switch (aSide) {
		case 'right':
		case 'left': {
			const isRight = aSide === 'right'
			if (
				(isRight ? info.gapX > 0 : info.gapX < 0) &&
				Math.abs(info.gapX) > Math.abs(info.gapY) &&
				info.midX !== null
			) {
				idealRoute = tryRouteArrow(info, aSide, isRight ? 'left' : 'right')
			} else {
				const cornerSides = pickCornerSides(info, [aSide])
				if (cornerSides) {
					idealRoute = tryRouteArrow(info, cornerSides[0], cornerSides[1])
				}
			}
			break
		}
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
/**
 * Find the first horizontal side of A that can turn a corner into the top or bottom of B without
 * doubling back on itself. Returns the pair of sides, or null if no corner works.
 */
function pickCornerSides(
	info: ElbowArrowWorkingInfo,
	aSides: ReadonlyArray<'right' | 'left'>
): [ElbowArrowSide, ElbowArrowSide] | null {
	for (const aSide of aSides) {
		const aEdge = info.A.edges[aSide]
		if (!aEdge) continue
		const aExpanded = aEdge.expanded ?? aEdge.value
		for (const bSide of ['top', 'bottom'] as const) {
			const bEdge = info.B.edges[bSide]
			if (!bEdge) continue
			const bExpanded = bEdge.expanded ?? bEdge.value
			const aClearsB =
				aSide === 'right' ? aExpanded <= bEdge.crossTarget : aExpanded >= bEdge.crossTarget
			const bClearsA =
				bSide === 'top' ? aEdge.crossTarget <= bExpanded : aEdge.crossTarget >= bExpanded
			if (aClearsB && bClearsA) return [aSide, bSide]
		}
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
