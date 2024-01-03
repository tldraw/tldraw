import { TLArrowInfo, VecLike } from '@tldraw/editor'

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
		bodyArc: { radius, largeArcFlag, sweepFlag },
	} = info
	return `M${start.point.x},${start.point.y} A${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.point.x},${end.point.y}`
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
