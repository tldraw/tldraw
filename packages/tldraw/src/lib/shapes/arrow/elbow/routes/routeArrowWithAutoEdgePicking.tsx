import { exhaustiveSwitchError } from '@tldraw/editor'
import {
	ElbowArrowRoute,
	ElbowArrowSide,
	ElbowArrowSideReason,
	ElbowArrowSides,
} from '../definitions'
import { ElbowArrowWorkingInfo } from './ElbowArrowWorkingInfo'
import { tryRouteArrow } from './elbowArrowRoutes'

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

	return pickShortest(info, 'distance', nonPartialRouteCandidates)
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
			return pickShortest(info, 'corners', [
				['top', 'bottom', 'manual', 'auto'],
				['top', 'right', 'manual', 'auto'],
				['top', 'left', 'manual', 'auto'],
				['top', 'top', 'manual', 'auto'],
			])
		case 'bottom':
			return pickShortest(info, 'corners', [
				['bottom', 'top', 'manual', 'auto'],
				['bottom', 'right', 'manual', 'auto'],
				['bottom', 'left', 'manual', 'auto'],
				['bottom', 'bottom', 'manual', 'auto'],
			])
		case 'left':
			return pickShortest(info, 'corners', [
				['left', 'right', 'manual', 'auto'],
				['left', 'bottom', 'manual', 'auto'],
				['left', 'top', 'manual', 'auto'],
				['left', 'left', 'manual', 'auto'],
			])
		case 'right':
			return pickShortest(info, 'corners', [
				['right', 'left', 'manual', 'auto'],
				['right', 'top', 'manual', 'auto'],
				['right', 'bottom', 'manual', 'auto'],
				['right', 'right', 'manual', 'auto'],
			])
	}
}

function pickShortest(
	info: ElbowArrowWorkingInfo,
	measure: 'distance' | 'corners',
	edges: ReadonlyArray<
		readonly [ElbowArrowSide, ElbowArrowSide, ElbowArrowSideReason, ElbowArrowSideReason]
	>
) {
	let bestRoute: ElbowArrowRoute | null = null
	let bestLength = Infinity
	let bias = 0
	for (const [aSide, bSide, aEdgePicking, bEdgePicking] of edges) {
		bias += measure === 'distance' ? 1 : 0.1
		const route = tryRouteArrow(info, aSide, bSide)
		if (route) {
			route.aEdgePicking = aEdgePicking
			route.bEdgePicking = bEdgePicking
			const length = measure === 'distance' ? route.distance : route.points.length
			if (length + bias < bestLength) {
				bestLength = length
				bestRoute = route
			}
		}
	}
	return bestRoute
}
