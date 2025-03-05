import { assert, ElbowArrowSide, VecLike } from '@tldraw/editor'
import { ElbowArrowAxes, ElbowArrowAxis, ElbowArrowSideAxes } from './constants'
import { ElbowArrowInfoWithoutRoute } from './getElbowArrowInfo'
import { isWithinRange } from './range'

// combos:
// hi → lo, lo → hi, lo → lo, hi → hi
// same, cross
// = 8 combos

export interface ElbowArrowRoute {
	path: VecLike[]
	name: string
}

const routes = {
	left: {
		top: routeCrossAxisLoToLo,
		left: routeSameAxisLoToLo,
		bottom: routeCrossAxisLoToHi,
		right: routeSameAxisLoToHi,
	},
	right: {
		top: routeCrossAxisHiToLo,
		left: routeSameAxisHiToLo,
		bottom: routeCrossAxisHiToHi,
		right: routeSameAxisHiToHi,
	},
	top: {
		top: routeSameAxisLoToLo,
		left: routeCrossAxisLoToLo,
		bottom: routeSameAxisLoToHi,
		right: routeCrossAxisLoToHi,
	},
	bottom: {
		top: routeSameAxisHiToLo,
		left: routeCrossAxisHiToLo,
		bottom: routeSameAxisHiToHi,
		right: routeCrossAxisHiToHi,
	},
}

export function tryRouteArrow(
	info: ElbowArrowInfoWithoutRoute,
	aEdge: ElbowArrowSide,
	bEdge: ElbowArrowSide
): ElbowArrowRoute | null {
	const axis = ElbowArrowAxes[ElbowArrowSideAxes[aEdge]]
	return routes[aEdge][bEdge](info, axis)
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
	axis: ElbowArrowAxis
): ElbowArrowRoute | null {
	const aEdge = info.edges.A[axis.hiEdge]
	const bEdge = info.edges.B[axis.loEdge]

	// we can't draw this arrow if we don't have the proper edge we want:
	if (!aEdge || !bEdge) return null

	const legLength = Math.abs(aEdge.crossCenter - bEdge.crossCenter)
	if (legLength < info.options.minElbowLegLength) {
		// Arrow 1:
		if (isWithinRange(aEdge.crossCenter, bEdge.cross)) {
			return {
				name: 'same axis hi to lo 1',
				path: [axis.v(aEdge.value, aEdge.crossCenter), axis.v(bEdge.value, aEdge.crossCenter)],
			}
		}
	}

	const mid = info[axis.mid]
	if (mid) {
		// Arrow 2:
		return {
			name: 'same axis hi to lo 2',
			path: [
				axis.v(aEdge.value, aEdge.crossCenter),
				axis.v(mid, aEdge.crossCenter),
				axis.v(mid, bEdge.crossCenter),
				axis.v(bEdge.value, bEdge.crossCenter),
			],
		}
	}

	const crossMid = info[axis.crossMid]
	if (crossMid) {
		// Arrow 3:
		return {
			name: 'same axis hi to lo 3',
			path: [
				axis.v(aEdge.value, aEdge.crossCenter),
				axis.v(aEdge.expanded, aEdge.crossCenter),
				axis.v(aEdge.expanded, crossMid),
				axis.v(bEdge.expanded, crossMid),
				axis.v(bEdge.expanded, bEdge.crossCenter),
				axis.v(bEdge.value, bEdge.crossCenter),
			],
		}
	}

	const clockwiseDistance =
		Math.abs(aEdge.crossCenter - info.expanded.common[axis.crossMax]) +
		Math.abs(bEdge.expanded - info.expanded.common[axis.max])

	const counterClockwiseDistance =
		Math.abs(bEdge.crossCenter - info.expanded.common[axis.crossMin]) +
		Math.abs(aEdge.expanded - info.expanded.common[axis.min])

	if (clockwiseDistance < counterClockwiseDistance) {
		// Arrow 4, clockwise:
		return {
			name: 'same axis hi to lo 4, clockwise',
			path: [
				axis.v(aEdge.value, aEdge.crossCenter),
				axis.v(info.expanded.common[axis.max], aEdge.crossCenter),
				axis.v(info.expanded.common[axis.max], info.expanded.common[axis.crossMax]),
				axis.v(bEdge.expanded, info.expanded.common[axis.crossMax]),
				axis.v(bEdge.expanded, bEdge.crossCenter),
				axis.v(bEdge.value, bEdge.crossCenter),
			],
		}
	}

	// Arrow 4, counter-clockwise:
	return {
		name: 'same axis hi to lo 4, counter-clockwise',
		path: [
			axis.v(aEdge.value, aEdge.crossCenter),
			axis.v(aEdge.expanded, aEdge.crossCenter),
			axis.v(aEdge.expanded, info.expanded.common[axis.crossMin]),
			axis.v(info.expanded.common[axis.min], info.expanded.common[axis.crossMin]),
			axis.v(info.expanded.common[axis.min], bEdge.crossCenter),
			axis.v(bEdge.value, bEdge.crossCenter),
		],
	}
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
	axis: ElbowArrowAxis
): ElbowArrowRoute | null {
	const aEdge = info.edges.A[axis.loEdge]
	const bEdge = info.edges.B[axis.hiEdge]

	if (!aEdge || !bEdge) return null

	const crossMid = info[axis.crossMid]
	if (crossMid) {
		// Arrow 1:
		return {
			name: 'same axis lo to hi 1',
			path: [
				axis.v(aEdge.value, aEdge.crossCenter),
				axis.v(aEdge.expanded, aEdge.crossCenter),
				axis.v(aEdge.expanded, crossMid),
				axis.v(bEdge.expanded, crossMid),
				axis.v(bEdge.expanded, bEdge.crossCenter),
				axis.v(bEdge.value, bEdge.crossCenter),
			],
		}
	}

	const counterClockwiseDistance = Math.abs(aEdge.crossCenter - info.expanded.common[axis.crossMax])
	const clockwiseDistance = Math.abs(bEdge.crossCenter - info.expanded.common[axis.crossMin])

	if (clockwiseDistance < counterClockwiseDistance) {
		// Arrow 2, clockwise:
		return {
			name: 'same axis lo to hi 2, clockwise',
			path: [
				axis.v(aEdge.value, aEdge.crossCenter),
				axis.v(aEdge.expanded, aEdge.crossCenter),
				axis.v(aEdge.expanded, info.expanded.common[axis.crossMin]),
				axis.v(info.expanded.common[axis.max], info.expanded.common[axis.crossMin]),
				axis.v(info.expanded.common[axis.max], bEdge.crossCenter),
				axis.v(bEdge.value, bEdge.crossCenter),
			],
		}
	}

	// Arrow 2, counter-clockwise:
	return {
		name: 'same axis lo to hi 2, counter-clockwise',
		path: [
			axis.v(aEdge.value, aEdge.crossCenter),
			axis.v(info.expanded.common[axis.min], aEdge.crossCenter),
			axis.v(info.expanded.common[axis.min], info.expanded.common[axis.crossMax]),
			axis.v(bEdge.expanded, info.expanded.common[axis.crossMax]),
			axis.v(bEdge.expanded, bEdge.crossCenter),
			axis.v(bEdge.value, bEdge.crossCenter),
		],
	}
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
	axis: ElbowArrowAxis
): ElbowArrowRoute | null {
	const aEdge = info.edges.A[axis.loEdge]
	const bEdge = info.edges.B[axis.loEdge]

	if (!aEdge || !bEdge) return null

	const mid = info[axis.mid]
	if (mid && bEdge.crossCenter < info.expanded.A[axis.crossMax]) {
		// Arrow 2:
		return {
			name: 'same axis lo to lo 2',
			path: [
				axis.v(aEdge.value, aEdge.crossCenter),
				axis.v(aEdge.expanded, aEdge.crossCenter),
				axis.v(aEdge.expanded, info.expanded.A[axis.crossMax]),
				axis.v(mid, info.expanded.A[axis.crossMax]),
				axis.v(mid, bEdge.crossCenter),
				axis.v(bEdge.value, bEdge.crossCenter),
			],
		}
	}

	// Arrow 1:
	return {
		name: 'same axis lo to lo 1',
		path: [
			axis.v(aEdge.value, aEdge.crossCenter),
			axis.v(info.expanded.common[axis.min], aEdge.crossCenter),
			axis.v(info.expanded.common[axis.min], bEdge.crossCenter),
			axis.v(bEdge.value, bEdge.crossCenter),
		],
	}
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
	axis: ElbowArrowAxis
): ElbowArrowRoute | null {
	const aEdge = info.edges.A[axis.hiEdge]
	const bEdge = info.edges.B[axis.hiEdge]

	if (!aEdge || !bEdge) return null

	const mid = info[axis.mid]
	if (mid && aEdge.crossCenter > info.expanded.B[axis.crossMin]) {
		// Arrow 2:
		return {
			name: 'same axis hi to hi 2',
			path: [
				axis.v(aEdge.value, aEdge.crossCenter),
				axis.v(mid, aEdge.crossCenter),
				axis.v(mid, info.expanded.B[axis.crossMin]),
				axis.v(bEdge.expanded, info.expanded.B[axis.crossMin]),
				axis.v(bEdge.expanded, bEdge.crossCenter),
				axis.v(bEdge.value, bEdge.crossCenter),
			],
		}
	}

	// Arrow 1:
	return {
		name: 'same axis hi to hi 1',
		path: [
			axis.v(aEdge.value, aEdge.crossCenter),
			axis.v(info.expanded.common[axis.max], aEdge.crossCenter),
			axis.v(info.expanded.common[axis.max], bEdge.crossCenter),
			axis.v(bEdge.value, bEdge.crossCenter),
		],
	}
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
	axis: ElbowArrowAxis
): ElbowArrowRoute | null {
	const aEdge = info.edges.A[axis.hiEdge]
	const bEdge = info.edges.B[axis.crossLoEdge]

	if (!aEdge || !bEdge) return null

	const crossMid = info[axis.crossMid]
	if (crossMid && aEdge.expanded > bEdge.crossCenter) {
		// Arrow 3:
		return {
			name: 'cross axis hi to lo 3',
			path: [
				axis.v(aEdge.value, aEdge.crossCenter),
				axis.v(aEdge.expanded, aEdge.crossCenter),
				axis.v(aEdge.expanded, crossMid),
				axis.v(bEdge.crossCenter, crossMid),
				axis.v(bEdge.crossCenter, bEdge.value),
			],
		}
	}

	if (aEdge.crossCenter > bEdge.expanded) {
		const mid = info[axis.mid]
		if (!mid) return null
		// Arrow 2:
		return {
			name: 'cross axis hi to lo 2',
			path: [
				axis.v(aEdge.value, aEdge.crossCenter),
				axis.v(mid, aEdge.crossCenter),
				axis.v(mid, bEdge.expanded),
				axis.v(bEdge.crossCenter, bEdge.expanded),
				axis.v(bEdge.crossCenter, bEdge.value),
			],
		}
	}

	// Arrow 1:
	return {
		name: 'cross axis hi to lo 1',
		path: [
			axis.v(aEdge.value, aEdge.crossCenter),
			axis.v(bEdge.crossCenter, aEdge.crossCenter),
			axis.v(bEdge.crossCenter, bEdge.value),
		],
	}
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
	axis: ElbowArrowAxis
): ElbowArrowRoute | null {
	const aEdge = info.edges.A[axis.loEdge]
	const bEdge = info.edges.B[axis.crossHiEdge]

	if (!aEdge || !bEdge) return null

	return {
		name: 'cross axis lo to hi',
		path: [
			axis.v(aEdge.value, aEdge.crossCenter),
			axis.v(info.expanded.common[axis.min], aEdge.crossCenter),
			axis.v(info.expanded.common[axis.min], info.expanded.common[axis.crossMax]),
			axis.v(bEdge.crossCenter, info.expanded.common[axis.crossMax]),
			axis.v(bEdge.crossCenter, bEdge.value),
		],
	}
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
	axis: ElbowArrowAxis
): ElbowArrowRoute | null {
	const aEdge = info.edges.A[axis.loEdge]
	const bEdge = info.edges.B[axis.crossLoEdge]

	if (!aEdge || !bEdge) return null

	const crossMid = info[axis.crossMid]
	if (crossMid) {
		// Arrow 1:
		return {
			name: 'cross axis lo to lo 1',
			path: [
				axis.v(aEdge.value, aEdge.crossCenter),
				axis.v(aEdge.expanded, aEdge.crossCenter),
				axis.v(aEdge.expanded, crossMid),
				axis.v(bEdge.crossCenter, crossMid),
				axis.v(bEdge.crossCenter, bEdge.value),
			],
		}
	}

	const arrow2Distance =
		Math.abs(aEdge.crossCenter - info.expanded.A[axis.crossMax]) +
		Math.abs(bEdge.expanded - info.expanded.A[axis.crossMax])

	const arrow3Distance =
		Math.abs(aEdge.crossCenter - info.expanded.common[axis.crossMin]) +
		Math.abs(bEdge.expanded - info.expanded.common[axis.crossMin])

	const mid = info[axis.mid]
	if (mid && arrow2Distance < arrow3Distance) {
		// Arrow 2:
		return {
			name: 'cross axis lo to lo 2',
			path: [
				axis.v(aEdge.value, aEdge.crossCenter),
				axis.v(aEdge.expanded, aEdge.crossCenter),
				axis.v(aEdge.expanded, info.expanded.A[axis.crossMax]),
				axis.v(mid, info.expanded.A[axis.crossMax]),
				axis.v(mid, bEdge.expanded),
				axis.v(bEdge.crossCenter, bEdge.expanded),
				axis.v(bEdge.crossCenter, bEdge.value),
			],
		}
	}

	// Arrow 3:
	return {
		name: 'cross axis lo to lo 3',
		path: [
			axis.v(aEdge.value, aEdge.crossCenter),
			axis.v(aEdge.expanded, aEdge.crossCenter),
			axis.v(aEdge.expanded, info.expanded.common[axis.crossMin]),
			axis.v(bEdge.crossCenter, info.expanded.common[axis.crossMin]),
			axis.v(bEdge.crossCenter, bEdge.value),
		],
	}
}

/**
 * Draw one of these arrows, on either axis:
 * ```
 * 1:               2:       3:         4:
 * ┌───┐   ┌───┐   ┌───┐     ┌───┐      ┌───────┐
 * │ A ├─┐ │ B │   │ A ├─┐   │ A ├─┐    │ ┌───┐ │
 * └───┘ │ └─▲─┘   └───┘ │   └───┘ │    │ │ A ├─┘
 *       └───┘           │    ┌────┘    │ └───┘
 *                 ┌───┐ │    │ ┌───┐   │ ┌───┐
 *                 │ B │ │    │ │ B │   │ │ B │
 *                 └─▲─┘ │    │ └─▲─┘   │ └─▲─┘
 *                   └───┘    └───┘     └───┘
 * ```
 */
export function routeCrossAxisHiToHi(
	info: ElbowArrowInfoWithoutRoute,
	axis: ElbowArrowAxis
): ElbowArrowRoute | null {
	const aEdge = info.edges.A[axis.hiEdge]
	const bEdge = info.edges.B[axis.crossHiEdge]

	if (!aEdge || !bEdge) return null

	const mid = info[axis.mid]
	if (mid) {
		// Arrow 1:
		return {
			name: 'cross axis hi to hi 1',
			path: [
				axis.v(aEdge.value, aEdge.crossCenter),
				axis.v(mid, aEdge.crossCenter),
				axis.v(mid, bEdge.expanded),
				axis.v(bEdge.crossCenter, bEdge.expanded),
				axis.v(bEdge.crossCenter, bEdge.value),
			],
		}
	}

	const crossMid = info[axis.crossMid]

	const arrow2Distance =
		Math.abs(aEdge.expanded - info.expanded.common[axis.max]) +
		Math.abs(info.expanded.common[axis.max] - bEdge.crossCenter)

	const arrow3Distance = crossMid
		? Math.abs(aEdge.expanded - info.expanded.B[axis.min]) +
			Math.abs(info.expanded.B[axis.min] - bEdge.crossCenter)
		: Infinity

	const arrow4Distance =
		Math.abs(aEdge.expanded - info.expanded.common[axis.min]) +
		Math.abs(info.expanded.common[axis.min] - bEdge.crossCenter) +
		Math.abs(aEdge.crossCenter - info.expanded.common[axis.crossMin]) * 2

	if (arrow2Distance < arrow3Distance && arrow2Distance < arrow4Distance) {
		// Arrow 2:
		return {
			name: 'cross axis hi to hi 2',
			path: [
				axis.v(aEdge.value, aEdge.crossCenter),
				axis.v(info.expanded.common[axis.max], aEdge.crossCenter),
				axis.v(info.expanded.common[axis.max], bEdge.expanded),
				axis.v(bEdge.crossCenter, bEdge.expanded),
				axis.v(bEdge.crossCenter, bEdge.value),
			],
		}
	}

	if (arrow3Distance < arrow4Distance) {
		assert(crossMid !== null)
		// Arrow 3:
		return {
			name: 'cross axis hi to hi 3',
			path: [
				axis.v(aEdge.value, aEdge.crossCenter),
				axis.v(aEdge.expanded, aEdge.crossCenter),
				axis.v(aEdge.expanded, crossMid),
				axis.v(info.expanded.B[axis.min], crossMid),
				axis.v(info.expanded.B[axis.min], bEdge.expanded),
				axis.v(bEdge.crossCenter, bEdge.expanded),
				axis.v(bEdge.crossCenter, bEdge.value),
			],
		}
	}

	// Arrow 4:
	return {
		name: 'cross axis hi to hi 4',
		path: [
			axis.v(aEdge.value, aEdge.crossCenter),
			axis.v(aEdge.expanded, aEdge.crossCenter),
			axis.v(aEdge.expanded, info.expanded.common[axis.crossMin]),
			axis.v(info.expanded.common[axis.min], info.expanded.common[axis.crossMin]),
			axis.v(info.expanded.common[axis.min], info.expanded.common[axis.crossMax]),
			axis.v(bEdge.crossCenter, info.expanded.common[axis.crossMax]),
			axis.v(bEdge.crossCenter, bEdge.value),
		],
	}
}

export function measureRouteManhattanDistance(route: ElbowArrowRoute): number {
	let distance = 0
	for (let i = 0; i < route.path.length - 1; i++) {
		const start = route.path[i]
		const end = route.path[i + 1]
		distance += Math.abs(end.x - start.x) + Math.abs(end.y - start.y)
	}
	return distance
}
