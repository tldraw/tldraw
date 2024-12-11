import { HALF_PI, PI, Vec, VecLike, intersectCircleCircle } from '@tldraw/editor'
import { TLArrowInfo, TLArrowPoint } from './arrow-types'

interface TLArrowPointsInfo {
	point: VecLike
	int: VecLike
	intersection?: TLArrowPoint['intersection']
}

function getArrowPointsInfo(
	info: TLArrowInfo,
	side: 'start' | 'end',
	strokeWidth: number
): TLArrowPointsInfo {
	// Point on the side
	const PT = side === 'end' ? info.end.point : info.start.point
	// Point on the other side
	const PB = side === 'end' ? info.start.point : info.end.point

	const compareLength = info.isStraight ? Vec.Dist(PB, PT) : Math.abs(info.bodyArc.length) // todo: arc length for curved arrows
	let length = Math.max(Math.min(compareLength / 5, strokeWidth * 3), strokeWidth)
	if (info[side].arrowhead === 'crow') {
		length *= 2
	}

	// The reference point near to the side point
	let P0: VecLike

	if (info.isStraight) {
		// Nudge the side point toward the other point by length
		P0 = Vec.Nudge(PT, PB, length)
	} else {
		// Create a circle with the side point as the center and length as the radius, find the intersection
		const ints = intersectCircleCircle(PT, length, info.handleArc.center, info.handleArc.radius)
		P0 =
			side === 'end'
				? info.handleArc.sweepFlag
					? ints[0]
					: ints[1]
				: info.handleArc.sweepFlag
					? ints[1]
					: ints[0]
	}

	if (Vec.IsNaN(P0)) {
		P0 = info.start.point
	}

	return {
		point: PT,
		int: P0,
		intersection: info[side].intersection,
	}
}

function getArrowhead({ point, int }: TLArrowPointsInfo) {
	const PL = Vec.RotWith(int, point, PI / 6)
	const PR = Vec.RotWith(int, point, -PI / 6)

	return `M ${PL.x} ${PL.y} L ${point.x} ${point.y} L ${PR.x} ${PR.y}`
}

function getTriangleHead({ point, int }: TLArrowPointsInfo) {
	const PL = Vec.RotWith(int, point, PI / 6)
	const PR = Vec.RotWith(int, point, -PI / 6)

	return `M ${PL.x} ${PL.y} L ${PR.x} ${PR.y} L ${point.x} ${point.y} Z`
}

function getInvertedTriangleHead({ point, int }: TLArrowPointsInfo) {
	const d = Vec.Sub(int, point).div(2)
	const PL = Vec.Add(point, Vec.Rot(d, HALF_PI))
	const PR = Vec.Sub(point, Vec.Rot(d, HALF_PI))

	return `M ${PL.x} ${PL.y} L ${int.x} ${int.y} L ${PR.x} ${PR.y} Z`
}

function getDotHead({ point, int }: TLArrowPointsInfo) {
	const A = Vec.Lrp(point, int, 0.45)
	const r = Vec.Dist(A, point)

	return `M ${A.x - r},${A.y}
  a ${r},${r} 0 1,0 ${r * 2},0
  a ${r},${r} 0 1,0 -${r * 2},0 `
}

function getDiamondHead({ point, int }: TLArrowPointsInfo) {
	const PB = Vec.Lrp(point, int, 0.75)
	const PL = Vec.RotWith(PB, point, PI / 4)
	const PR = Vec.RotWith(PB, point, -PI / 4)

	const PQ = Vec.Lrp(PL, PR, 0.5)
	PQ.add(Vec.Sub(PQ, point))

	return `M ${PQ.x} ${PQ.y} L ${PR.x} ${PR.y} ${point.x} ${point.y} L ${PL.x} ${PL.y} Z`
}

function getSquareHead({ int, point }: TLArrowPointsInfo) {
	const PB = Vec.Lrp(point, int, 0.85)
	const d = Vec.Sub(PB, point).div(2)
	const PL1 = Vec.Add(point, Vec.Rot(d, HALF_PI))
	const PR1 = Vec.Sub(point, Vec.Rot(d, HALF_PI))
	const PL2 = Vec.Add(PB, Vec.Rot(d, HALF_PI))
	const PR2 = Vec.Sub(PB, Vec.Rot(d, HALF_PI))

	return `M ${PL1.x} ${PL1.y} L ${PL2.x} ${PL2.y} L ${PR2.x} ${PR2.y} L ${PR1.x} ${PR1.y} Z`
}

function getBarHead({ int, point, intersection }: TLArrowPointsInfo) {
	if (intersection) {
		const { segment } = intersection
		const dist = Vec.Dist(point, int)
		const normal = Vec.Sub(segment[1], segment[0]).uni()
		const PL = Vec.Add(point, Vec.Neg(normal).mul(dist))
		const PR = Vec.Sub(point, Vec.Neg(normal).mul(dist))

		return `M ${PL.x} ${PL.y} L ${PR.x} ${PR.y}`
	} else {
		const d = Vec.Sub(int, point).div(2)

		const PL = Vec.Add(point, Vec.Rot(d, HALF_PI))
		const PR = Vec.Sub(point, Vec.Rot(d, HALF_PI))

		return `M ${PL.x} ${PL.y} L ${PR.x} ${PR.y}`
	}
}

function getCrow({ point, int, intersection }: TLArrowPointsInfo) {
	const d = Vec.Sub(int, point)
	const normal = Vec.Uni(d)
	const dist = d.len() / 2
	const A = int

	if (intersection) {
		const { segment, point: PC } = intersection
		const segNormal = Vec.Sub(segment[1], segment[0]).uni()
		const PL = Vec.Add(PC, Vec.Mul(segNormal, dist))
		const PR = Vec.Sub(PC, Vec.Mul(segNormal, dist))

		return `M ${A.x} ${A.y} L ${PC.x} ${PC.y} M ${A.x} ${A.y} L ${PL.x} ${PL.y} M ${A.x} ${A.y} L ${PR.x} ${PR.y}`
	} else {
		const PL = Vec.Add(point, Vec.Mul(Vec.Per(normal), dist))
		const PR = Vec.Sub(point, Vec.Mul(Vec.Per(normal), dist))

		return `M ${A.x} ${A.y} L ${PL.x} ${PL.y} M ${A.x} ${A.y} L ${PR.x} ${PR.y}`
	}
}

/** @public */
export function getArrowheadPathForType(
	info: TLArrowInfo,
	side: 'start' | 'end',
	strokeWidth: number
): string | undefined {
	const type = side === 'end' ? info.end.arrowhead : info.start.arrowhead
	if (type === 'none') return

	const arrowPointsInfo = getArrowPointsInfo(info, side, strokeWidth)
	if (!arrowPointsInfo) return

	switch (type) {
		case 'crow':
			return getCrow(arrowPointsInfo)
		case 'bar':
			return getBarHead(arrowPointsInfo)
		case 'square':
			return getSquareHead(arrowPointsInfo)
		case 'diamond':
			return getDiamondHead(arrowPointsInfo)
		case 'dot':
			return getDotHead(arrowPointsInfo)
		case 'inverted':
			return getInvertedTriangleHead(arrowPointsInfo)
		case 'arrow':
			return getArrowhead(arrowPointsInfo)
		case 'triangle':
			return getTriangleHead(arrowPointsInfo)
	}

	return ''
}
