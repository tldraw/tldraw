import { Vec2d, VecLike } from '../../../../primitives/Vec2d'
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

	const compareLength = info.isStraight ? Vec2d.Dist(PB, PT) : Math.abs(info.bodyArc.length) // todo: arc length for curved arrows

	const length = Math.max(Math.min(compareLength / 5, strokeWidth * 3), strokeWidth)

	let P0: VecLike

	if (info.isStraight) {
		P0 = Vec2d.Nudge(PT, PB, length)
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
	const PL = Vec2d.RotWith(int, point, PI / 6)
	const PR = Vec2d.RotWith(int, point, -PI / 6)

	return `M ${PL.x} ${PL.y} L ${point.x} ${point.y} L ${PR.x} ${PR.y}`
}

export function getTriangleHead({ point, int }: TLArrowPointsInfo) {
	const PL = Vec2d.RotWith(int, point, PI / 6)
	const PR = Vec2d.RotWith(int, point, -PI / 6)

	return `M ${PL.x} ${PL.y} L ${point.x} ${point.y} L ${PR.x} ${PR.y} Z`
}

export function getInvertedTriangleHead({ point, int }: TLArrowPointsInfo) {
	const d = Vec2d.Sub(int, point).div(2)
	const PL = Vec2d.Add(point, Vec2d.Rot(d, TAU))
	const PR = Vec2d.Sub(point, Vec2d.Rot(d, TAU))

	return `M ${PL.x} ${PL.y} L ${int.x} ${int.y} L ${PR.x} ${PR.y} Z`
}

export function getDotHead({ point, int }: TLArrowPointsInfo) {
	const A = Vec2d.Lrp(point, int, 0.45)
	const r = Vec2d.Dist(A, point)

	return `M ${A.x - r},${A.y}
  a ${r},${r} 0 1,0 ${r * 2},0
  a ${r},${r} 0 1,0 -${r * 2},0 `
}

export function getDiamondHead({ point, int }: TLArrowPointsInfo) {
	const PB = Vec2d.Lrp(point, int, 0.75)
	const PL = Vec2d.RotWith(PB, point, PI / 4)
	const PR = Vec2d.RotWith(PB, point, -PI / 4)

	const PQ = Vec2d.Lrp(PL, PR, 0.5)
	PQ.add(Vec2d.Sub(PQ, point))

	return `M ${PQ.x} ${PQ.y} L ${PL.x} ${PL.y} ${point.x} ${point.y} L ${PR.x} ${PR.y} Z`
}

export function getSquareHead({ int, point }: TLArrowPointsInfo) {
	const PB = Vec2d.Lrp(point, int, 0.85)
	const d = Vec2d.Sub(PB, point).div(2)
	const PL1 = Vec2d.Add(point, Vec2d.Rot(d, TAU))
	const PR1 = Vec2d.Sub(point, Vec2d.Rot(d, TAU))
	const PL2 = Vec2d.Add(PB, Vec2d.Rot(d, TAU))
	const PR2 = Vec2d.Sub(PB, Vec2d.Rot(d, TAU))

	return `M ${PL1.x} ${PL1.y} L ${PL2.x} ${PL2.y} L ${PR2.x} ${PR2.y} L ${PR1.x} ${PR1.y} Z`
}

export function getBarHead({ int, point }: TLArrowPointsInfo) {
	const d = Vec2d.Sub(int, point).div(2)

	const PL = Vec2d.Add(point, Vec2d.Rot(d, TAU))
	const PR = Vec2d.Sub(point, Vec2d.Rot(d, TAU))

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
