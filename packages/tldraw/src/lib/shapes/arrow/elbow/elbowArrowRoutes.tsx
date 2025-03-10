import { assert, ElbowArrowSide, Vec, VecLike } from '@tldraw/editor'
import { ElbowArrowAxes, ElbowArrowAxis, ElbowArrowSideAxes } from './definitions'
import { ElbowArrowInfoWithoutRoute } from './getElbowArrowInfo'

// combos:
// hi → lo, lo → hi, lo → lo, hi → hi
// same, cross
// = 8 combos

const MIN_DISTANCE = 0.01

class ElbowArrowRouteBuilder {
	points: Vec[] = []

	constructor(
		private readonly axis: ElbowArrowAxis,
		public readonly name: string
	) {}

	add(coord: number, crossCoord: number): this {
		const p0 = this.axis.v(coord, crossCoord)
		const p1 = this.points[this.points.length - 1]
		const p2 = this.points[this.points.length - 2]

		if (!p1 || !p2) {
			this.points.push(p0)
		} else {
			const d1x = Math.abs(p0.x - p1.x)
			const d1y = Math.abs(p0.y - p1.y)
			const d2x = Math.abs(p0.x - p2.x)
			const d2y = Math.abs(p0.y - p2.y)

			if (d1x < MIN_DISTANCE && d1y < MIN_DISTANCE) {
				// this point is basically in the same place as the last one, so ignore it
			} else if (d1x < MIN_DISTANCE && d2x < MIN_DISTANCE) {
				// this coord is extending the same vertical line as the last two, so update the
				// last point to this one.
				p1.y = p0.y
			} else if (d1y < MIN_DISTANCE && d2y < MIN_DISTANCE) {
				// this coord is extending the same horizontal line as the last two, so update the
				// last point to this one.
				p1.x = p0.x
			} else {
				// this coord is changing direction, so add it to the points
				this.points.push(p0)
			}
		}

		return this
	}

	build(): ElbowArrowRoute {
		return {
			name: this.name,
			points: this.points,
			length: measureRouteManhattanDistance(this.points),
		}
	}
}

export interface ElbowArrowRoute {
	name: string
	points: Vec[]
	length: number
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
	const aEdge = info.A.edges[axis.hiEdge]
	const bEdge = info.B.edges[axis.loEdge]

	// we can't draw this arrow if we don't have the proper edge we want:
	if (!aEdge || !bEdge) return null

	// TODO: figure out if we want to re-enable this:
	// const legLength = Math.abs(aEdge.crossTarget - bEdge.crossTarget)
	// if (legLength < info.options.minElbowLegLength) {
	// 	// Arrow 1:
	// 	if (isWithinRange(aEdge.crossTarget, bEdge.cross)) {
	// 		return new ElbowArrowRouteBuilder(axis, 'same axis hi to lo 1')
	// 			.add(aEdge.value, aEdge.crossTarget)
	// 			.add(bEdge.value, aEdge.crossTarget)
	// 			.build()
	// 	}
	// }

	const mid = info[axis.mid]
	if (mid) {
		// Arrow 2:
		return new ElbowArrowRouteBuilder(axis, 'same axis hi to lo 2')
			.add(aEdge.value, aEdge.crossTarget)
			.add(mid, aEdge.crossTarget)
			.add(mid, bEdge.crossTarget)
			.add(bEdge.value, bEdge.crossTarget)
			.build()
	}

	const crossMid = info[axis.crossMid]
	if (crossMid) {
		// Arrow 3:
		return new ElbowArrowRouteBuilder(axis, 'same axis hi to lo 3')
			.add(aEdge.value, aEdge.crossTarget)
			.add(aEdge.expanded, aEdge.crossTarget)
			.add(aEdge.expanded, crossMid)
			.add(bEdge.expanded, crossMid)
			.add(bEdge.expanded, bEdge.crossTarget)
			.add(bEdge.value, bEdge.crossTarget)
			.build()
	}

	const clockwiseDistance =
		Math.abs(aEdge.crossTarget - info.common.expanded[axis.crossMax]) +
		Math.abs(bEdge.expanded - info.common.expanded[axis.max])

	const counterClockwiseDistance =
		Math.abs(bEdge.crossTarget - info.common.expanded[axis.crossMin]) +
		Math.abs(aEdge.expanded - info.common.expanded[axis.min])

	if (clockwiseDistance < counterClockwiseDistance) {
		// Arrow 4, clockwise:
		return new ElbowArrowRouteBuilder(axis, 'same axis hi to lo 4, clockwise')
			.add(aEdge.value, aEdge.crossTarget)
			.add(info.common.expanded[axis.max], aEdge.crossTarget)
			.add(info.common.expanded[axis.max], info.common.expanded[axis.crossMax])
			.add(bEdge.expanded, info.common.expanded[axis.crossMax])
			.add(bEdge.expanded, bEdge.crossTarget)
			.add(bEdge.value, bEdge.crossTarget)
			.build()
	}

	// Arrow 4, counter-clockwise:
	return new ElbowArrowRouteBuilder(axis, 'same axis hi to lo 4, counter-clockwise')
		.add(aEdge.value, aEdge.crossTarget)
		.add(aEdge.expanded, aEdge.crossTarget)
		.add(aEdge.expanded, info.common.expanded[axis.crossMin])
		.add(info.common.expanded[axis.min], info.common.expanded[axis.crossMin])
		.add(info.common.expanded[axis.min], bEdge.crossTarget)
		.add(bEdge.value, bEdge.crossTarget)
		.build()
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
	const aEdge = info.A.edges[axis.loEdge]
	const bEdge = info.B.edges[axis.hiEdge]

	if (!aEdge || !bEdge) return null

	const crossMid = info[axis.crossMid]
	if (crossMid) {
		// Arrow 1:
		return new ElbowArrowRouteBuilder(axis, 'same axis lo to hi 1')
			.add(aEdge.value, aEdge.crossTarget)
			.add(aEdge.expanded, aEdge.crossTarget)
			.add(aEdge.expanded, crossMid)
			.add(bEdge.expanded, crossMid)
			.add(bEdge.expanded, bEdge.crossTarget)
			.add(bEdge.value, bEdge.crossTarget)
			.build()
	}

	const counterClockwiseDistance = Math.abs(aEdge.crossTarget - info.common.expanded[axis.crossMax])
	const clockwiseDistance = Math.abs(bEdge.crossTarget - info.common.expanded[axis.crossMin])

	if (clockwiseDistance < counterClockwiseDistance) {
		// Arrow 2, clockwise:
		return new ElbowArrowRouteBuilder(axis, 'same axis lo to hi 2, clockwise')
			.add(aEdge.value, aEdge.crossTarget)
			.add(aEdge.expanded, aEdge.crossTarget)
			.add(aEdge.expanded, info.common.expanded[axis.crossMin])
			.add(info.common.expanded[axis.max], info.common.expanded[axis.crossMin])
			.add(info.common.expanded[axis.max], bEdge.crossTarget)
			.add(bEdge.value, bEdge.crossTarget)
			.build()
	}

	// Arrow 2, counter-clockwise:
	return new ElbowArrowRouteBuilder(axis, 'same axis lo to hi 2, counter-clockwise')
		.add(aEdge.value, aEdge.crossTarget)
		.add(info.common.expanded[axis.min], aEdge.crossTarget)
		.add(info.common.expanded[axis.min], info.common.expanded[axis.crossMax])
		.add(bEdge.expanded, info.common.expanded[axis.crossMax])
		.add(bEdge.expanded, bEdge.crossTarget)
		.add(bEdge.value, bEdge.crossTarget)
		.build()
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
	const aEdge = info.A.edges[axis.loEdge]
	const bEdge = info.B.edges[axis.loEdge]

	if (!aEdge || !bEdge) return null

	const mid = info[axis.mid]
	if (mid && bEdge.crossTarget < info.A.expanded[axis.crossMax]) {
		// Arrow 2:
		return new ElbowArrowRouteBuilder(axis, 'same axis lo to lo 2')
			.add(aEdge.value, aEdge.crossTarget)
			.add(aEdge.expanded, aEdge.crossTarget)
			.add(aEdge.expanded, info.A.expanded[axis.crossMax])
			.add(mid, info.A.expanded[axis.crossMax])
			.add(mid, bEdge.crossTarget)
			.add(bEdge.value, bEdge.crossTarget)
			.build()
	}

	// Arrow 1:
	return new ElbowArrowRouteBuilder(axis, 'same axis lo to lo 1')
		.add(aEdge.value, aEdge.crossTarget)
		.add(info.common.expanded[axis.min], aEdge.crossTarget)
		.add(info.common.expanded[axis.min], bEdge.crossTarget)
		.add(bEdge.value, bEdge.crossTarget)
		.build()
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
	const aEdge = info.A.edges[axis.hiEdge]
	const bEdge = info.B.edges[axis.hiEdge]

	if (!aEdge || !bEdge) return null

	const mid = info[axis.mid]
	if (mid && aEdge.crossTarget > info.B.expanded[axis.crossMin]) {
		// Arrow 2:
		return new ElbowArrowRouteBuilder(axis, 'same axis hi to hi 2')
			.add(aEdge.value, aEdge.crossTarget)
			.add(mid, aEdge.crossTarget)
			.add(mid, info.B.expanded[axis.crossMin])
			.add(bEdge.expanded, info.B.expanded[axis.crossMin])
			.add(bEdge.expanded, bEdge.crossTarget)
			.add(bEdge.value, bEdge.crossTarget)
			.build()
	}

	// Arrow 1:
	return new ElbowArrowRouteBuilder(axis, 'same axis hi to hi 1')
		.add(aEdge.value, aEdge.crossTarget)
		.add(info.common.expanded[axis.max], aEdge.crossTarget)
		.add(info.common.expanded[axis.max], bEdge.crossTarget)
		.add(bEdge.value, bEdge.crossTarget)
		.build()
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
	const aEdge = info.A.edges[axis.hiEdge]
	const bEdge = info.B.edges[axis.crossLoEdge]

	if (!aEdge || !bEdge) return null

	const crossMid = info[axis.crossMid]
	if (crossMid && aEdge.expanded > bEdge.crossTarget) {
		// Arrow 3:
		return new ElbowArrowRouteBuilder(axis, 'cross axis hi to lo 3')
			.add(aEdge.value, aEdge.crossTarget)
			.add(aEdge.expanded, aEdge.crossTarget)
			.add(aEdge.expanded, crossMid)
			.add(bEdge.crossTarget, crossMid)
			.add(bEdge.crossTarget, bEdge.value)
			.build()
	}

	if (aEdge.crossTarget > bEdge.expanded) {
		const mid = info[axis.mid]
		if (!mid) return null
		// Arrow 2:
		return new ElbowArrowRouteBuilder(axis, 'cross axis hi to lo 2')
			.add(aEdge.value, aEdge.crossTarget)
			.add(mid, aEdge.crossTarget)
			.add(mid, bEdge.expanded)
			.add(bEdge.crossTarget, bEdge.expanded)
			.add(bEdge.crossTarget, bEdge.value)
			.build()
	}

	// Arrow 1:
	return new ElbowArrowRouteBuilder(axis, 'cross axis hi to lo 1')
		.add(aEdge.value, aEdge.crossTarget)
		.add(bEdge.crossTarget, aEdge.crossTarget)
		.add(bEdge.crossTarget, bEdge.value)
		.build()
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
	const aEdge = info.A.edges[axis.loEdge]
	const bEdge = info.B.edges[axis.crossHiEdge]

	if (!aEdge || !bEdge) return null

	return new ElbowArrowRouteBuilder(axis, 'cross axis lo to hi')
		.add(aEdge.value, aEdge.crossTarget)
		.add(info.common.expanded[axis.min], aEdge.crossTarget)
		.add(info.common.expanded[axis.min], info.common.expanded[axis.crossMax])
		.add(bEdge.crossTarget, info.common.expanded[axis.crossMax])
		.add(bEdge.crossTarget, bEdge.value)
		.build()
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
	const aEdge = info.A.edges[axis.loEdge]
	const bEdge = info.B.edges[axis.crossLoEdge]

	if (!aEdge || !bEdge) return null

	const crossMid = info[axis.crossMid]
	if (crossMid) {
		// Arrow 1:
		return new ElbowArrowRouteBuilder(axis, 'cross axis lo to lo 1')
			.add(aEdge.value, aEdge.crossTarget)
			.add(aEdge.expanded, aEdge.crossTarget)
			.add(aEdge.expanded, crossMid)
			.add(bEdge.crossTarget, crossMid)
			.add(bEdge.crossTarget, bEdge.value)
			.build()
	}

	const arrow2Distance =
		Math.abs(aEdge.crossTarget - info.A.expanded[axis.crossMax]) +
		Math.abs(bEdge.expanded - info.A.expanded[axis.crossMax])

	const arrow3Distance =
		Math.abs(aEdge.crossTarget - info.common.expanded[axis.crossMin]) +
		Math.abs(bEdge.expanded - info.common.expanded[axis.crossMin])

	const mid = info[axis.mid]
	if (mid && arrow2Distance < arrow3Distance) {
		// Arrow 2:
		return new ElbowArrowRouteBuilder(axis, 'cross axis lo to lo 2')
			.add(aEdge.value, aEdge.crossTarget)
			.add(aEdge.expanded, aEdge.crossTarget)
			.add(aEdge.expanded, info.A.expanded[axis.crossMax])
			.add(mid, info.A.expanded[axis.crossMax])
			.add(mid, bEdge.expanded)
			.add(bEdge.crossTarget, bEdge.expanded)
			.add(bEdge.crossTarget, bEdge.value)
			.build()
	}

	// Arrow 3:
	return new ElbowArrowRouteBuilder(axis, 'cross axis lo to lo 3')
		.add(aEdge.value, aEdge.crossTarget)
		.add(aEdge.expanded, aEdge.crossTarget)
		.add(aEdge.expanded, info.common.expanded[axis.crossMin])
		.add(bEdge.crossTarget, info.common.expanded[axis.crossMin])
		.add(bEdge.crossTarget, bEdge.value)
		.build()
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
	const aEdge = info.A.edges[axis.hiEdge]
	const bEdge = info.B.edges[axis.crossHiEdge]

	if (!aEdge || !bEdge) return null

	const mid = info[axis.mid]
	if (mid) {
		// Arrow 1:
		return new ElbowArrowRouteBuilder(axis, 'cross axis hi to hi 1')
			.add(aEdge.value, aEdge.crossTarget)
			.add(mid, aEdge.crossTarget)
			.add(mid, bEdge.expanded)
			.add(bEdge.crossTarget, bEdge.expanded)
			.add(bEdge.crossTarget, bEdge.value)
			.build()
	}

	const crossMid = info[axis.crossMid]

	const arrow2Distance =
		Math.abs(aEdge.expanded - info.common.expanded[axis.max]) +
		Math.abs(info.common.expanded[axis.max] - bEdge.crossTarget)

	const arrow3Distance = crossMid
		? Math.abs(aEdge.expanded - info.B.expanded[axis.min]) +
			Math.abs(info.B.expanded[axis.min] - bEdge.crossTarget)
		: Infinity

	const arrow4Distance =
		Math.abs(aEdge.expanded - info.common.expanded[axis.min]) +
		Math.abs(info.common.expanded[axis.min] - bEdge.crossTarget) +
		Math.abs(aEdge.crossTarget - info.common.expanded[axis.crossMin]) * 2

	if (arrow2Distance < arrow3Distance && arrow2Distance < arrow4Distance) {
		// Arrow 2:
		return new ElbowArrowRouteBuilder(axis, 'cross axis hi to hi 2')
			.add(aEdge.value, aEdge.crossTarget)
			.add(info.common.expanded[axis.max], aEdge.crossTarget)
			.add(info.common.expanded[axis.max], bEdge.expanded)
			.add(bEdge.crossTarget, bEdge.expanded)
			.add(bEdge.crossTarget, bEdge.value)
			.build()
	}

	if (arrow3Distance < arrow4Distance) {
		assert(crossMid !== null)
		// Arrow 3:
		return new ElbowArrowRouteBuilder(axis, 'cross axis hi to hi 3')
			.add(aEdge.value, aEdge.crossTarget)
			.add(aEdge.expanded, aEdge.crossTarget)
			.add(aEdge.expanded, crossMid)
			.add(info.B.expanded[axis.min], crossMid)
			.add(info.B.expanded[axis.min], bEdge.expanded)
			.add(bEdge.crossTarget, bEdge.expanded)
			.add(bEdge.crossTarget, bEdge.value)
			.build()
	}

	// Arrow 4:
	return new ElbowArrowRouteBuilder(axis, 'cross axis hi to hi 4')
		.add(aEdge.value, aEdge.crossTarget)
		.add(aEdge.expanded, aEdge.crossTarget)
		.add(aEdge.expanded, info.common.expanded[axis.crossMin])
		.add(info.common.expanded[axis.min], info.common.expanded[axis.crossMin])
		.add(info.common.expanded[axis.min], info.common.expanded[axis.crossMax])
		.add(bEdge.crossTarget, info.common.expanded[axis.crossMax])
		.add(bEdge.crossTarget, bEdge.value)
		.build()
}

function measureRouteManhattanDistance(path: VecLike[]): number {
	let distance = 0
	for (let i = 0; i < path.length - 1; i++) {
		const start = path[i]
		const end = path[i + 1]
		distance += Math.abs(end.x - start.x) + Math.abs(end.y - start.y)
	}
	return distance
}
