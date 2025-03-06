import { VecLike } from '@tldraw/editor'
import { TLArcArrowInfo, TLStraightArrowInfo } from './arrow-types'
import { ElbowArrowRoute } from './elbow/elbowArrowRoutes'

/* --------------------- Curved --------------------- */

/**
 * Get a solid path for a curved arrow's handles.
 *
 * @param info - The arrow info.
 * @public
 */
export function getCurvedArrowHandlePath(info: TLArcArrowInfo) {
	const {
		start,
		end,
		handleArc: { radius, largeArcFlag, sweepFlag },
	} = info
	return `M${start.handle.x},${start.handle.y} A${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.handle.x},${end.handle.y}`
}

/**
 * Get a solid path for a curved arrow's body.
 *
 * @param info - The arrow info.
 * @public
 */
export function getSolidCurvedArrowPath(info: TLArcArrowInfo) {
	const {
		start,
		end,
		bodyArc: { radius, largeArcFlag, sweepFlag },
	} = info
	return `M${start.point.x},${start.point.y} A${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.point.x},${end.point.y}`
}

/* -------------------- Straight -------------------- */

function getArrowPath(start: VecLike, end: VecLike) {
	return `M${start.x},${start.y}L${end.x},${end.y}`
}

/** @public */
export function getStraightArrowHandlePath(info: TLStraightArrowInfo) {
	return getArrowPath(info.start.handle, info.end.handle)
}

/** @public */
export function getSolidStraightArrowPath(info: TLStraightArrowInfo) {
	return getArrowPath(info.start.point, info.end.point)
}

export function getSolidElbowArrowPath(route: ElbowArrowRoute) {
	if (route.points.length < 2) return ''

	const parts = [`M${route.points[0].x},${route.points[0].y}`]
	for (let i = 1; i < route.points.length; i++) {
		parts.push(`L${route.points[i].x},${route.points[i].y}`)
	}
	return parts.join('')
}
