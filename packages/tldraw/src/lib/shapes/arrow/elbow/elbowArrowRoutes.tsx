import { VecLike } from '@tldraw/editor'
import { ElbowArrowInfoWithoutRoute } from './getElbowArrowInfo'
import { isWithinRange } from './range'

type Axis = 'x' | 'y'

// combos:
// hi → lo, lo → hi, lo → lo, hi → hi
// same, cross
// = 8 combos

const propsForAxis = {
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
 * Draw one of these arrows, on either axis:
 *
 * ```
 * 1:              2:              3:         4 (cw, ccw):
 * ┌───┐   ┌───┐   ┌───┐           ┌───┐      ┌───┐
 * │ A ├───► B │   │ A ├─┐         │ A ├─┐    │ A ├───┐
 * └───┘   └───┘   └───┘ │ ┌───┐   └───┘ │    └───┘   │
 *                       └─► B │    ┌────┘      ┌───┐ │
 *                         └───┘    │ ┌───┐   ┌─► B │ │
 *                                  └─► B │   │ └───┘ │
 *                                    └───┘   └───────┘
 * ```
 */
export function routeSameAxisHiToLo(
	info: ElbowArrowInfoWithoutRoute,
	axis: Axis
): VecLike[] | null {
	const props = propsForAxis[axis]
	const aEdge = info.edges.A[props.hiEdge]
	const bEdge = info.edges.B[props.loEdge]

	// we can't draw this arrow if we don't have the proper edge we want:
	if (!aEdge || !bEdge) return null

	const legLength = Math.abs(aEdge.crossCenter - bEdge.crossCenter)
	if (legLength < info.options.minElbowLegLength) {
		// Arrow 1:
		if (isWithinRange(aEdge.crossCenter, bEdge.cross)) {
			return [vec(axis, aEdge.value, aEdge.crossCenter), vec(axis, bEdge.value, aEdge.crossCenter)]
		}
	}

	const mid = info[props.mid]
	if (mid) {
		// Arrow 2:
		return [
			vec(axis, aEdge.value, aEdge.crossCenter),
			vec(axis, mid, aEdge.crossCenter),
			vec(axis, mid, bEdge.crossCenter),
			vec(axis, bEdge.value, bEdge.crossCenter),
		]
	}

	const crossMid = info[props.crossMid]
	if (crossMid) {
		// Arrow 3:
		return [
			vec(axis, aEdge.value, aEdge.crossCenter),
			vec(axis, aEdge.expanded, aEdge.crossCenter),
			vec(axis, aEdge.expanded, crossMid),
			vec(axis, bEdge.expanded, crossMid),
			vec(axis, bEdge.expanded, bEdge.crossCenter),
			vec(axis, bEdge.value, bEdge.crossCenter),
		]
	}

	const clockwiseDistance =
		Math.abs(aEdge.crossCenter - info.expanded.common[props.crossMax]) +
		Math.abs(bEdge.expanded - info.expanded.common[props.max])

	const counterClockwiseDistance =
		Math.abs(bEdge.crossCenter - info.expanded.common[props.crossMin]) +
		Math.abs(aEdge.expanded - info.expanded.common[props.min])

	if (clockwiseDistance < counterClockwiseDistance) {
		// Arrow 4, clockwise:
		return [
			vec(axis, aEdge.value, aEdge.crossCenter),
			vec(axis, info.expanded.common[props.max], aEdge.crossCenter),
			vec(axis, info.expanded.common[props.max], info.expanded.common[props.crossMax]),
			vec(axis, bEdge.expanded, info.expanded.common[props.crossMax]),
			vec(axis, bEdge.expanded, bEdge.crossCenter),
			vec(axis, bEdge.value, bEdge.crossCenter),
		]
	} else {
		// Arrow 4, counter-clockwise:
		return [
			vec(axis, aEdge.value, aEdge.crossCenter),
			vec(axis, aEdge.expanded, aEdge.crossCenter),
			vec(axis, aEdge.expanded, info.expanded.common[props.crossMin]),
			vec(axis, info.expanded.common[props.min], info.expanded.common[props.crossMin]),
			vec(axis, info.expanded.common[props.min], bEdge.crossCenter),
			vec(axis, bEdge.value, bEdge.crossCenter),
		]
	}
	return null
}

/**
 * Draw one of these arrows, on either axis:
 * ```
 * 1:              2 (cw, ccw):
 *   ┌───┐          ┌───┐
 * ┌─┤ A │        ┌─┤ A │
 * │ └───┘        │ └───┘
 * └──────────┐   │     ┌───┐
 *      ┌───┐ │   │     │ B ◄─┐
 *      │ B ◄─┘   │     └───┘ │
 *      └───┘     └───────────┘
 * ```
 */
export function routeSameAxisLoToHi(
	info: ElbowArrowInfoWithoutRoute,
	axis: Axis
): VecLike[] | null {
	const props = propsForAxis[axis]
	const aEdge = info.edges.A[props.loEdge]
	const bEdge = info.edges.B[props.hiEdge]

	if (!aEdge || !bEdge) return null

	const crossMid = info[props.crossMid]
	if (crossMid) {
		// Arrow 1:
		return [
			vec(axis, aEdge.value, aEdge.crossCenter),
			vec(axis, aEdge.expanded, aEdge.crossCenter),
			vec(axis, aEdge.expanded, crossMid),
			vec(axis, bEdge.expanded, crossMid),
			vec(axis, bEdge.expanded, bEdge.crossCenter),
			vec(axis, bEdge.value, bEdge.crossCenter),
		]
	}

	const counterClockwiseDistance = Math.abs(
		aEdge.crossCenter - info.expanded.common[props.crossMax]
	)
	const clockwiseDistance = Math.abs(bEdge.crossCenter - info.expanded.common[props.crossMin])

	if (clockwiseDistance < counterClockwiseDistance) {
		// Arrow 2, clockwise:
		return [
			vec(axis, aEdge.value, aEdge.crossCenter),
			vec(axis, aEdge.expanded, aEdge.crossCenter),
			vec(axis, aEdge.expanded, info.expanded.common[props.crossMin]),
			vec(axis, info.expanded.common[props.max], info.expanded.common[props.crossMin]),
			vec(axis, info.expanded.common[props.max], bEdge.crossCenter),
			vec(axis, bEdge.value, bEdge.crossCenter),
		]
	}

	// Arrow 2, counter-clockwise:
	return [
		vec(axis, aEdge.value, aEdge.crossCenter),
		vec(axis, info.expanded.common[props.min], aEdge.crossCenter),
		vec(axis, info.expanded.common[props.min], info.expanded.common[props.crossMax]),
		vec(axis, bEdge.expanded, info.expanded.common[props.crossMax]),
		vec(axis, bEdge.expanded, bEdge.crossCenter),
		vec(axis, bEdge.value, bEdge.crossCenter),
	]
}

/**
 * Draw one of these arrows, on either axis:
 * ```
 * 1:                2:
 *   ┌───┐             ┌───┐   ┌───┐
 * ┌─┤ A │           ┌─┤ A │ ┌─► B │
 * │ └───┘   ┌───┐   │ └───┘ │ └───┘
 * └─────────► B │   └───────┘
 *           └───┘
 * ```
 */
export function routeSameAxisLoToLo(
	info: ElbowArrowInfoWithoutRoute,
	axis: Axis
): VecLike[] | null {
	const props = propsForAxis[axis]
	const aEdge = info.edges.A[props.loEdge]
	const bEdge = info.edges.B[props.loEdge]

	if (!aEdge || !bEdge) return null

	const mid = info[props.mid]
	if (mid && bEdge.crossCenter < info.expanded.A[props.crossMax]) {
		// Arrow 2:
		return [
			vec(axis, aEdge.value, aEdge.crossCenter),
			vec(axis, aEdge.expanded, aEdge.crossCenter),
			vec(axis, aEdge.expanded, info.expanded.A[props.crossMax]),
			vec(axis, mid, info.expanded.A[props.crossMax]),
			vec(axis, mid, bEdge.crossCenter),
			vec(axis, bEdge.value, bEdge.crossCenter),
		]
	}

	// Arrow 1:
	return [
		vec(axis, aEdge.value, aEdge.crossCenter),
		vec(axis, info.expanded.common[props.min], aEdge.crossCenter),
		vec(axis, info.expanded.common[props.min], bEdge.crossCenter),
		vec(axis, bEdge.value, bEdge.crossCenter),
	]
}

/**
 * Draw one of these arrows, on either axis:
 * ```
 * 1:                2:
 *                         ┌───────┐
 * ┌───┐             ┌───┐ │ ┌───┐ │
 * │ A ├─────────┐   │ A ├─┘ │ B ◄─┘
 * └───┘   ┌───┐ │   └───┘   └───┘
 *         │ B ◄─┘
 *         └───┘
 */
export function routeSameAxisHiToHi(
	info: ElbowArrowInfoWithoutRoute,
	axis: Axis
): VecLike[] | null {
	const props = propsForAxis[axis]
	const aEdge = info.edges.A[props.hiEdge]
	const bEdge = info.edges.B[props.hiEdge]

	if (!aEdge || !bEdge) return null

	const mid = info[props.mid]
	if (mid && aEdge.crossCenter > info.expanded.B[props.crossMin]) {
		// Arrow 2:
		return [
			vec(axis, aEdge.value, aEdge.crossCenter),
			vec(axis, mid, aEdge.crossCenter),
			vec(axis, mid, info.expanded.B[props.crossMin]),
			vec(axis, bEdge.expanded, info.expanded.B[props.crossMin]),
			vec(axis, bEdge.expanded, bEdge.crossCenter),
			vec(axis, bEdge.value, bEdge.crossCenter),
		]
	}

	// Arrow 1:
	return [
		vec(axis, aEdge.value, aEdge.crossCenter),
		vec(axis, info.expanded.common[props.max], aEdge.crossCenter),
		vec(axis, info.expanded.common[props.max], bEdge.crossCenter),
		vec(axis, bEdge.value, bEdge.crossCenter),
	]
}

/**
 * Draw one of these arrows, on either axis:
 * ```
 * 1               2:              3:
 * ┌───┐                 ┌───┐     ┌───┐
 * │ A ├─────┐     ┌───┐ │ ┌─▼─┐   │ A ├─┐
 * └───┘     │     │ A ├─┘ │ B │   └───┘ │
 *         ┌─▼─┐   └───┘   └───┘     ┌───┘
 *         │ B │                   ┌─▼─┐
 *         └───┘                   │ B │
 *                                 └───┘
 * ```
 */
export function routeCrossAxisHiToLo(
	info: ElbowArrowInfoWithoutRoute,
	axis: Axis
): VecLike[] | null {
	const props = propsForAxis[axis]
	const aEdge = info.edges.A[props.hiEdge]
	const bEdge = info.edges.B[props.crossLoEdge]

	if (!aEdge || !bEdge) return null

	const crossMid = info[props.crossMid]
	if (crossMid && aEdge.expanded > bEdge.crossCenter) {
		// Arrow 3:
		return [
			vec(axis, aEdge.value, aEdge.crossCenter),
			vec(axis, aEdge.expanded, aEdge.crossCenter),
			vec(axis, aEdge.expanded, crossMid),
			vec(axis, bEdge.crossCenter, crossMid),
			vec(axis, bEdge.crossCenter, bEdge.value),
		]
	}

	if (aEdge.crossCenter > bEdge.expanded) {
		const mid = info[props.mid]
		if (!mid) return null
		// Arrow 2:
		return [
			vec(axis, aEdge.value, aEdge.crossCenter),
			vec(axis, mid, aEdge.crossCenter),
			vec(axis, mid, bEdge.expanded),
			vec(axis, bEdge.crossCenter, bEdge.expanded),
			vec(axis, bEdge.crossCenter, bEdge.value),
		]
	}

	// Arrow 1:
	return [
		vec(axis, aEdge.value, aEdge.crossCenter),
		vec(axis, bEdge.crossCenter, aEdge.crossCenter),
		vec(axis, bEdge.crossCenter, bEdge.value),
	]
}

/**
 * Draw one of these arrows, on either axis:
 * ```
 *   ┌───┐   ┌───┐
 * ┌─┤ A │   │ B │
 * │ └───┘   └─▲─┘
 * └───────────┘
 * ```
 */
export function routeCrossAxisLoToHi(
	info: ElbowArrowInfoWithoutRoute,
	axis: Axis
): VecLike[] | null {
	const props = propsForAxis[axis]
	const aEdge = info.edges.A[props.loEdge]
	const bEdge = info.edges.B[props.crossHiEdge]

	if (!aEdge || !bEdge) return null

	return [
		vec(axis, aEdge.value, aEdge.crossCenter),
		vec(axis, info.expanded.common[props.min], aEdge.crossCenter),
		vec(axis, info.expanded.common[props.min], info.expanded.common[props.crossMax]),
		vec(axis, bEdge.crossCenter, info.expanded.common[props.crossMax]),
		vec(axis, bEdge.crossCenter, bEdge.value),
	]
}

/**
 * Draw one of these arrows, on either axis:
 * ```
 * 1:           2:                3:
 *   ┌───┐        ┌───┐           ┌───────────┐
 * ┌─┤ A │      ┌─┤ A │ ┌───┐     │ ┌───┐   ┌─▼─┐
 * │ └───┘      │ └───┘ │ ┌─▼─┐   └─┤ A │   │ B │
 * └──────┐     └───────┘ │ B │     └───┘   └───┘
 *      ┌─▼─┐             └───┘
 *      │ B │
 *      └───┘
 * ```
 */
export function routeCrossAxisLoToLo(
	info: ElbowArrowInfoWithoutRoute,
	axis: Axis
): VecLike[] | null {
	const props = propsForAxis[axis]
	const aEdge = info.edges.A[props.loEdge]
	const bEdge = info.edges.B[props.crossLoEdge]

	if (!aEdge || !bEdge) return null

	const crossMid = info[props.crossMid]
	if (crossMid) {
		// Arrow 1:
		return [
			vec(axis, aEdge.value, aEdge.crossCenter),
			vec(axis, aEdge.expanded, aEdge.crossCenter),
			vec(axis, aEdge.expanded, crossMid),
			vec(axis, bEdge.crossCenter, crossMid),
			vec(axis, bEdge.crossCenter, bEdge.value),
		]
	}

	const arrow2Distance =
		Math.abs(aEdge.crossCenter - info.expanded.A[props.crossMax]) +
		Math.abs(bEdge.expanded - info.expanded.A[props.crossMax])

	const arrow3Distance =
		Math.abs(aEdge.crossCenter - info.expanded.common[props.crossMin]) +
		Math.abs(bEdge.expanded - info.expanded.common[props.crossMin])

	const mid = info[props.mid]
	if (mid && arrow2Distance < arrow3Distance) {
		// Arrow 2:
		return [
			vec(axis, aEdge.value, aEdge.crossCenter),
			vec(axis, aEdge.expanded, aEdge.crossCenter),
			vec(axis, aEdge.expanded, info.expanded.A[props.crossMax]),
			vec(axis, mid, info.expanded.A[props.crossMax]),
			vec(axis, mid, bEdge.expanded),
			vec(axis, bEdge.crossCenter, bEdge.expanded),
			vec(axis, bEdge.crossCenter, bEdge.value),
		]
	}

	// Arrow 3:
	return [
		vec(axis, aEdge.value, aEdge.crossCenter),
		vec(axis, aEdge.expanded, aEdge.crossCenter),
		vec(axis, aEdge.expanded, info.expanded.common[props.crossMin]),
		vec(axis, bEdge.crossCenter, info.expanded.common[props.crossMin]),
		vec(axis, bEdge.crossCenter, bEdge.value),
	]
}

/**
 * Draw one of these arrows, on either axis:
 * ```
 * ```
 */
export function routeCrossAxisHiToHi(
	info: ElbowArrowInfoWithoutRoute,
	axis: Axis
): VecLike[] | null {
	const props = propsForAxis[axis]
	const aEdge = info.edges.A[props.hiEdge]
	const bEdge = info.edges.B[props.crossHiEdge]

	if (!aEdge || !bEdge) return null

	return null
}

// OLD STUFF:

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
	const aEdge = info.edges.A[propsForAxis[axis].hiEdge]
	const bEdge = info.edges.B[propsForAxis[axis].crossLoEdge]

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
	const aEdge = info.edges.A[propsForAxis[axis].hiEdge]
	const bEdge = info.edges.B[propsForAxis[axis].crossLoEdge]
	const mid = info[propsForAxis[axis].mid]

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
