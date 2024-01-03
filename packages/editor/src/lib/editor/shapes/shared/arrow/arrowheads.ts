import { Vec, VecLike } from '../../../../primitives/Vec2d'
import { intersectCircleCircle } from '../../../../primitives/intersect'
import { PI, TAU } from '../../../../primitives/utils'
import { TLArrowInfo } from './arrow-types'

type TLArrowPointsInfo = {
	point: VecLike
	int: VecLike
}

function getArrowPoints(
	info: TLArrowInfo,
	side: 'start' | 'end',
	strokeWidth: number
): TLArrowPointsInfo {
	const PT = side === 'end' ? info.end.point : info.start.point
	const PB = side === 'end' ? info.start.point : info.end.point

	const compareLength = info.isStraight ? Vec.Dist(PB, PT) : Math.abs(info.bodyArc.length) // todo: arc length for curved arrows

	const length = Math.max(Math.min(compareLength / 5, strokeWidth * 3), strokeWidth)

	let P0: VecLike

	if (info.isStraight) {
		P0 = Vec.Nudge(PT, PB, length)
	} else {
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

	return {
		point: PT,
		int: P0,
	}
}

export function getArrowhead({ point, int }: TLArrowPointsInfo) {
	const PL = Vec.RotWith(int, point, PI / 6)
	const PR = Vec.RotWith(int, point, -PI / 6)

	return `M ${PL.x} ${PL.y} L ${point.x} ${point.y} L ${PR.x} ${PR.y}`
}

export function getTriangleHead({ point, int }: TLArrowPointsInfo) {
	const PL = Vec.RotWith(int, point, PI / 6)
	const PR = Vec.RotWith(int, point, -PI / 6)

	return `M ${PL.x} ${PL.y} L ${point.x} ${point.y} L ${PR.x} ${PR.y} Z`
}

export function getInvertedTriangleHead({ point, int }: TLArrowPointsInfo) {
	const d = Vec.Sub(int, point).div(2)
	const PL = Vec.Add(point, Vec.Rot(d, TAU))
	const PR = Vec.Sub(point, Vec.Rot(d, TAU))

	return `M ${PL.x} ${PL.y} L ${int.x} ${int.y} L ${PR.x} ${PR.y} Z`
}

export function getDotHead({ point, int }: TLArrowPointsInfo) {
	const A = Vec.Lrp(point, int, 0.45)
	const r = Vec.Dist(A, point)

	return `M ${A.x - r},${A.y}
  a ${r},${r} 0 1,0 ${r * 2},0
  a ${r},${r} 0 1,0 -${r * 2},0 `
}

export function getDiamondHead({ point, int }: TLArrowPointsInfo) {
	const PB = Vec.Lrp(point, int, 0.75)
	const PL = Vec.RotWith(PB, point, PI / 4)
	const PR = Vec.RotWith(PB, point, -PI / 4)

	const PQ = Vec.Lrp(PL, PR, 0.5)
	PQ.add(Vec.Sub(PQ, point))

	return `M ${PQ.x} ${PQ.y} L ${PL.x} ${PL.y} ${point.x} ${point.y} L ${PR.x} ${PR.y} Z`
}

export function getSquareHead({ int, point }: TLArrowPointsInfo) {
	const PB = Vec.Lrp(point, int, 0.85)
	const d = Vec.Sub(PB, point).div(2)
	const PL1 = Vec.Add(point, Vec.Rot(d, TAU))
	const PR1 = Vec.Sub(point, Vec.Rot(d, TAU))
	const PL2 = Vec.Add(PB, Vec.Rot(d, TAU))
	const PR2 = Vec.Sub(PB, Vec.Rot(d, TAU))

	return `M ${PL1.x} ${PL1.y} L ${PL2.x} ${PL2.y} L ${PR2.x} ${PR2.y} L ${PR1.x} ${PR1.y} Z`
}

export function getBarHead({ int, point }: TLArrowPointsInfo) {
	const d = Vec.Sub(int, point).div(2)

	const PL = Vec.Add(point, Vec.Rot(d, TAU))
	const PR = Vec.Sub(point, Vec.Rot(d, TAU))

	return `M ${PL.x} ${PL.y} L ${PR.x} ${PR.y}`
}

export function getPipeHead() {
	return ''
}

/** @public */
export function getArrowheadPathForType(
	info: TLArrowInfo,
	side: 'start' | 'end',
	strokeWidth: number
): string | undefined {
	const type = side === 'end' ? info.end.arrowhead : info.start.arrowhead
	if (type === 'none') return

	const points = getArrowPoints(info, side, strokeWidth)
	if (!points) return

	switch (type) {
		case 'bar':
			return getBarHead(points)
		case 'square':
			return getSquareHead(points)
		case 'diamond':
			return getDiamondHead(points)
		case 'dot':
			return getDotHead(points)
		case 'inverted':
			return getInvertedTriangleHead(points)
		case 'arrow':
			return getArrowhead(points)
		case 'triangle':
			return getTriangleHead(points)
	}

	return ''
}
