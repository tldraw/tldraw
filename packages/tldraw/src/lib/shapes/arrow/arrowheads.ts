import {
	HALF_PI,
	PI,
	Vec,
	VecLike,
	clamp,
	exhaustiveSwitchError,
	intersectCircleCircle,
} from '@tldraw/editor'
import { TLArrowInfo } from './arrow-types'

interface TLArrowPointsInfo {
	point: VecLike
	int: VecLike
}

function getArrowPoints(
	info: TLArrowInfo,
	side: 'start' | 'end',
	strokeWidth: number
): TLArrowPointsInfo {
	const point = side === 'end' ? info.end.point : info.start.point
	let int: VecLike

	switch (info.type) {
		case 'straight': {
			const opposite = side === 'end' ? info.start.point : info.end.point
			const compareLength = Vec.Dist(opposite, point)
			const length = clamp(compareLength / 5, strokeWidth, strokeWidth * 3)
			int = Vec.Nudge(point, opposite, length)
			break
		}
		case 'arc': {
			const compareLength = Math.abs(info.bodyArc.length)
			const length = clamp(compareLength / 5, strokeWidth, strokeWidth * 3)
			const intersections = intersectCircleCircle(
				point,
				length,
				info.handleArc.center,
				info.handleArc.radius
			)
			int =
				side === 'end'
					? info.handleArc.sweepFlag
						? intersections[0]
						: intersections[1]
					: info.handleArc.sweepFlag
						? intersections[1]
						: intersections[0]
			break
		}
		case 'elbow': {
			const previousPoint =
				side === 'end' ? info.route.points[info.route.points.length - 2] : info.route.points[1]
			const previousSegmentLength = Vec.ManhattanDist(previousPoint, point)
			const length = clamp(previousSegmentLength / 2, strokeWidth, strokeWidth * 3)
			int = previousPoint ? Vec.Nudge(point, previousPoint, length) : point
			break
		}
		default:
			exhaustiveSwitchError(info, 'type')
	}

	if (Vec.IsNaN(int)) {
		int = point
	}

	return { point, int }
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

function getBarHead({ int, point }: TLArrowPointsInfo) {
	const d = Vec.Sub(int, point).div(2)

	const PL = Vec.Add(point, Vec.Rot(d, HALF_PI))
	const PR = Vec.Sub(point, Vec.Rot(d, HALF_PI))

	return `M ${PL.x} ${PL.y} L ${PR.x} ${PR.y}`
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
