import { VecLike } from '@tldraw/editor'
import { ElbowArrowInfoWithoutRoute } from './getElbowArrowInfo'
import { isWithinRange, rangeCenter } from './range'

type Axis = 'x' | 'y'

// combos:
// hi → lo, lo → hi, lo → lo, hi → hi
// same, cross
// = 8 combos

const props = {
	x: {
		loEdge: 'left',
		hiEdge: 'right',
		mid: 'mx',
		crossLoEdge: 'top',
		crossHiEdge: 'bottom',
		crossMid: 'my',
		max: 'maxX',
		min: 'minX',
		crossMax: 'maxY',
		crossMin: 'minY',
	},
	y: {
		loEdge: 'top',
		hiEdge: 'bottom',
		mid: 'my',
		crossLoEdge: 'left',
		crossHiEdge: 'right',
		crossMid: 'mx',
		max: 'maxY',
		min: 'minY',
		crossMax: 'maxX',
		crossMin: 'minX',
	},
} as const

function vec(axis: Axis, x: number, y: number) {
	return axis === 'x' ? { x, y } : { x: y, y: x }
}

/**
 * Draw this arrow, on either axis:
 * ```
 *  ┌───┐
 *  │ A ├──┐  ┌───┐
 *  └───┘  └──► B │
 *            └───┘
 * ```
 */
export function routeSameAxisHiToLo(
	info: ElbowArrowInfoWithoutRoute,
	axis: Axis
): VecLike[] | null {
	const mid = info[props[axis].mid]
	const aEdge = info.edges.A[props[axis].hiEdge]
	const bEdge = info.edges.B[props[axis].loEdge]

	if (mid === null || !aEdge || !bEdge) return null

	const aCenter = rangeCenter(aEdge.cross)
	const bCenter = rangeCenter(bEdge.cross)

	const legLength = Math.abs(aCenter - bCenter)
	if (legLength < info.options.minElbowLegLength) {
		if (isWithinRange(aCenter, bEdge.cross)) {
			return [vec(axis, aEdge.value, aCenter), vec(axis, bEdge.value, aCenter)]
		}
	}

	return [
		vec(axis, aEdge.value, aCenter),
		vec(axis, mid, aCenter),
		vec(axis, mid, bCenter),
		vec(axis, bEdge.value, bCenter),
	]
}

/**
 * Draw this arrow, on either axis:
 * TODO: better handling to pick the shorter way round
 * ```
 *   ┌───┐  ┌───┐
 * ┌─┤ A │  │ B ◄─┐
 * │ └───┘  └───┘ │
 * └──────────────┘
 * ```
 */
export function routeSameAxisLoToHi(
	info: ElbowArrowInfoWithoutRoute,
	axis: Axis
): VecLike[] | null {
	const aEdge = info.edges.A[props[axis].loEdge]
	const bEdge = info.edges.B[props[axis].hiEdge]

	if (!aEdge || !bEdge) return null

	const outsideCross = Math.min(
		info.expanded.A[props[axis].crossMin],
		info.expanded.B[props[axis].crossMin]
	)

	const outsideLo = aEdge.expanded

	return [
		vec(axis, aEdge.value, aEdge.crossCenter),
		vec(axis, outsideLo, aEdge.crossCenter),
		vec(axis, outsideLo, outsideCross),
		vec(axis, bEdge.expanded, outsideCross),
		vec(axis, bEdge.expanded, bEdge.crossCenter),
		vec(axis, bEdge.value, bEdge.crossCenter),
	]
}

/**
 * Draw this arrow, on either axis:
 * ```
 *   ┌───┐
 * ┌─┤ A │
 * │ └───┘   ┌───┐
 * └─────────► B │
 *           └───┘
 * ```
 */
export function routeSameAxisLoToLoSimple(
	info: ElbowArrowInfoWithoutRoute,
	axis: Axis
): VecLike[] | null {
	const aEdge = info.edges.A[props[axis].loEdge]
	const bEdge = info.edges.B[props[axis].loEdge]

	// not enough room - we need the complex case
	if (!aEdge || !bEdge) return null
	// const outsideCross = Math.max(info.expanded.A[props[axis].crossMax], bEdge.crossCenter)
	const outsideCross = bEdge.crossCenter
	if (!isWithinRange(outsideCross, bEdge.cross)) return null
	const outsideLo = Math.min(aEdge.expanded, bEdge.expanded)

	return [
		vec(axis, aEdge.value, aEdge.crossCenter),
		vec(axis, outsideLo, aEdge.crossCenter),
		vec(axis, outsideLo, outsideCross),
		vec(axis, bEdge.value, outsideCross),
	]
}

/**
 * Draw this arrow, on either axis:
 * ```
 *   ┌───┐   ┌───┐
 * ┌─┤ A │ ┌─► B │
 * │ └───┘ │ └───┘
 * └───────┘
 * ```
 * @param info
 * @param axis
 */
export function routeSameAxisLoToLoComplex(
	info: ElbowArrowInfoWithoutRoute,
	axis: Axis
): VecLike[] | null {
	const aEdge = info.edges.A[props[axis].loEdge]
	const bEdge = info.edges.B[props[axis].loEdge]
	const mid = info[props[axis].mid]

	if (!aEdge || !bEdge) return null

	const outsideCross = info.expanded.A[props[axis].crossMax]
	if (bEdge.crossCenter >= outsideCross || !mid) {
		return routeSameAxisLoToLoSimple(info, axis)
	}

	const outsideLo = Math.min(aEdge.expanded, bEdge.expanded)

	return [
		vec(axis, aEdge.value, aEdge.crossCenter),
		vec(axis, outsideLo, aEdge.crossCenter),
		vec(axis, outsideLo, outsideCross),
		vec(axis, mid, outsideCross),
		vec(axis, mid, bEdge.crossCenter),
		vec(axis, bEdge.value, bEdge.crossCenter),
	]
}

/**
 * Draw this arrow, on either axis:
 * ```
 * ┌───┐
 * │ A ├───┐
 * └───┘   │
 *       ┌─▼─┐
 *       │ B │
 *       └───┘
 * ```
 * @param info
 */
export function routeCrossAxisHiToLoSimple(
	info: ElbowArrowInfoWithoutRoute,
	axis: Axis
): VecLike[] | null {
	const aEdge = info.edges.A[props[axis].hiEdge]
	const bEdge = info.edges.B[props[axis].crossLoEdge]

	if (!aEdge || !bEdge) return null

	// not enough room - we need the complex case
	if (aEdge.crossCenter > bEdge.expanded || bEdge.crossCenter < aEdge.expanded) return null

	return [
		vec(axis, aEdge.value, aEdge.crossCenter),
		vec(axis, bEdge.crossCenter, aEdge.crossCenter),
		vec(axis, bEdge.crossCenter, bEdge.value),
	]
}

/**
 * Draws this arrow, on either axis:
 * ```
 *
 * ┌───┐ ┌───┐
 * │ A ├─┘ ┌─▼─┐
 * └───┘   │ B │
 *         └───┘
 * ```
 */
export function routeCrossAxisHiToLoComplex(
	info: ElbowArrowInfoWithoutRoute,
	axis: Axis
): VecLike[] | null {
	const aEdge = info.edges.A[props[axis].hiEdge]
	const bEdge = info.edges.B[props[axis].crossLoEdge]
	const mid = info[props[axis].mid]

	if (!aEdge || !bEdge) return null
	if (!(aEdge.crossCenter > bEdge.expanded || bEdge.crossCenter < aEdge.expanded)) {
		// we can just do the simple case
		return routeCrossAxisHiToLoSimple(info, axis)
	}
	if (!mid) return null

	return [
		vec(axis, aEdge.value, aEdge.crossCenter),
		vec(axis, mid, aEdge.crossCenter),
		vec(axis, mid, bEdge.expanded),
		vec(axis, bEdge.crossCenter, bEdge.expanded),
		vec(axis, bEdge.crossCenter, bEdge.value),
	]
}
