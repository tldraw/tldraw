import { Box, VecLike } from '@tldraw/editor'
import { TLArrowInfo } from './arrow-types'

/* --------------------- Curved --------------------- */

/**
 * Get a solid path for a curved arrow's handles.
 *
 * @param info - The arrow info.
 * @public
 */
export function getCurvedArrowHandlePath(info: TLArrowInfo & { isStraight: false }) {
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
export function getSolidCurvedArrowPath(info: TLArrowInfo & { isStraight: false }) {
	const {
		start,
		end,
		bodyArc: { center, radius, largeArcFlag, sweepFlag },
	} = info

	// const points = sweepFlag
	// 	? getPointsOnArc(start.point, end.point, center, radius, 10)
	// 	: getPointsOnArc(end.point, start.point, center, radius, 10)

	// const tl = Vec.SubXY(center, radius, radius)
	// const br = Vec.AddXY(center, radius, radius)
	// const box = Box.FromPoints([tl, br])

	// const points = sweepFlag
	// 	? getPointsOnArc(start.point, end.point, center, radius, 10)
	// 	: getPointsOnArc(end.point, start.point, center, radius, 10)
	// const box = Box.FromPoints([...points, info.handleArc.start, info.handleArc.end])

	// const box = Box.FromPoints([start.point, end.point, info.middle])

	const box = Box.FromPoints([
		// start.point,
		// end.point,
		info.handleArc.start,
		info.handleArc.end,
		info.middle,
	])
	const { corners } = box

	// let dist = Infinity
	// let closestCorner = corners[0]
	// for (const corner of corners) {
	// 	const d = Vec.Dist(corner, info.middle)
	// 	if (d < dist) {
	// 		dist = d
	// 		closestCorner = corner
	// 	}
	// }
	// const cornerIndex = corners.indexOf(closestCorner)

	// const cornerLeft = corners[(cornerIndex + 3) % 4]
	// const cornerRight = corners[(cornerIndex + 1) % 4]

	// const startSide = sweepFlag === 1 ? cornerLeft : cornerRight
	// console.log(
	// 	radius,
	// 	Vec.Dist(closestCorner, startSide),
	// 	Vec.Dist(closestCorner, startSide) / info.handleArc.length
	// )

	// if (!cornerLeft) throw Error('no corner left')
	// does the segment closestCorner -> startSide intersect the start shape?
	// if (!cornerRight) throw Error('no corner right')

	// return `M${start.point.x},${start.point.y} A${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.point.x},${end.point.y}`
	// return `M${startSide.x},${startSide.y} L ${closestCorner.x},${closestCorner.y}` // ${cornerRight.x},${cornerRight.y}`
	return `M${corners[0].x} ${corners[0].y} L${corners[1].x} ${corners[1].y} L${corners[2].x} ${corners[2].y} L${corners[3].x} ${corners[3].y} Z`
}

/* -------------------- Straight -------------------- */

function getArrowPath(start: VecLike, end: VecLike) {
	return `M${start.x},${start.y}L${end.x},${end.y}`
}

/** @public */
export function getStraightArrowHandlePath(info: TLArrowInfo & { isStraight: true }) {
	return getArrowPath(info.start.handle, info.end.handle)
}

/** @public */
export function getSolidStraightArrowPath(info: TLArrowInfo & { isStraight: true }) {
	return getArrowPath(info.start.point, info.end.point)
}
