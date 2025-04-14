import { ElbowArrowSide } from '@tldraw/editor'
import { ElbowArrowRoute } from '../definitions'
import { ElbowArrowRouteBuilder } from './ElbowArrowRouteBuilder'
import { ElbowArrowTransform, ElbowArrowWorkingInfo } from './ElbowArrowWorkingInfo'

/**
 * Draw one of these arrows:
 *
 * ```
 * 1:              2:         3:          4:          5:
 * ┌───┐           ┌───┐      ┌───┐       ┌───────┐   ┌───────┐ ┌───┐
 * │ A ├─┐         │ A ├─┐    │ A ├───┐   │ ┌───┐ │   │ ┌───┐ │ │ A ├─┐
 * └───┘ │ ┌───┐   └───┘ │    └───┘   │   │ │ A ├─┘   └─► B │ │ └───┘ │
 *       └─► B │    ┌────┘      ┌───┐ │   │ └───┘       └───┘ └───────┘
 *         └───┘    │ ┌───┐   ┌►│ B │ │   │   ┌───┐
 *                  └─► B │   │ └───┘ │   └───► B │
 *                    └───┘   └───────┘       └───┘
 * ```
 */
export function routeRightToLeft(info: ElbowArrowWorkingInfo): ElbowArrowRoute | null {
	const aEdge = info.A.edges.right
	const bEdge = info.B.edges.left

	// we can't draw this arrow if we don't have the proper edge we want:
	if (!aEdge || !bEdge) return null

	// just so we get to handle less edge cases, flip the boxes if A is below B:
	if (aEdge.crossTarget > bEdge.crossTarget) {
		info.apply(ElbowArrowTransform.FlipY)
	}

	if (info.gapX > 0 && info.midX) {
		// Arrow 1:
		return new ElbowArrowRouteBuilder(info, 'to left 1')
			.add(aEdge.value, aEdge.crossTarget)
			.add(info.midX, aEdge.crossTarget)
			.add(info.midX, bEdge.crossTarget)
			.midpointHandle('x')
			.add(bEdge.value, bEdge.crossTarget)
			.build()
	}

	if (!aEdge.expanded || !bEdge.expanded) return null

	if (info.midY) {
		// Arrow 2:
		return new ElbowArrowRouteBuilder(info, 'to left 2')
			.add(aEdge.value, aEdge.crossTarget)
			.add(aEdge.expanded, aEdge.crossTarget)
			.add(aEdge.expanded, info.midY)
			.add(bEdge.expanded, info.midY)
			.midpointHandle('y')
			.add(bEdge.expanded, bEdge.crossTarget)
			.add(bEdge.value, bEdge.crossTarget)
			.build()
	}

	const arrow3Distance =
		Math.abs(aEdge.value - info.common.expanded.right) +
		Math.abs(aEdge.crossTarget - info.common.expanded.bottom) +
		Math.abs(info.common.expanded.right - bEdge.expanded) +
		Math.abs(info.common.expanded.bottom - bEdge.crossTarget) +
		info.options.expandElbowLegLength +
		6 // 6 points in this arrow

	const arrow4Distance =
		info.options.expandElbowLegLength +
		Math.abs(aEdge.crossTarget - info.common.expanded.top) +
		Math.abs(aEdge.expanded - info.common.expanded.left) +
		Math.abs(info.common.expanded.top - bEdge.crossTarget) +
		Math.abs(info.common.expanded.left - bEdge.value) +
		// 6 points in this arrow, plus 1 bias against it so we prefer arrow 3
		7

	const arrow5Distance =
		info.gapX < 0 && info.midX !== null
			? info.options.expandElbowLegLength +
				Math.abs(aEdge.crossTarget - info.A.expanded.bottom) +
				info.common.expanded.width +
				Math.abs(info.A.expanded.bottom - info.B.expanded.top) +
				Math.abs(info.B.expanded.top - bEdge.crossTarget) +
				info.options.expandElbowLegLength +
				// 8 points in this arrow
				8
			: Infinity

	if (arrow3Distance < arrow4Distance && arrow3Distance < arrow5Distance) {
		// Arrow 3:
		return new ElbowArrowRouteBuilder(info, 'to left 3')
			.add(aEdge.value, aEdge.crossTarget)
			.add(info.common.expanded.right, aEdge.crossTarget)
			.add(info.common.expanded.right, info.common.expanded.bottom)
			.add(bEdge.expanded, info.common.expanded.bottom)
			.add(bEdge.expanded, bEdge.crossTarget)
			.add(bEdge.value, bEdge.crossTarget)
			.build()
	}

	if (arrow4Distance < arrow5Distance) {
		// Arrow 4:
		return new ElbowArrowRouteBuilder(info, 'to left 4')
			.add(aEdge.value, aEdge.crossTarget)
			.add(aEdge.expanded, aEdge.crossTarget)
			.add(aEdge.expanded, info.common.expanded.top)
			.add(info.common.expanded.left, info.common.expanded.top)
			.add(info.common.expanded.left, bEdge.crossTarget)
			.add(bEdge.value, bEdge.crossTarget)
			.build()
	}

	if (info.midX !== null) {
		// Arrow 5:
		return new ElbowArrowRouteBuilder(info, 'to left 5')
			.add(aEdge.value, aEdge.crossTarget)
			.add(aEdge.expanded, aEdge.crossTarget)
			.add(aEdge.expanded, info.A.expanded.bottom)
			.add(info.midX, info.A.expanded.bottom)
			.add(info.midX, info.B.expanded.top)
			.midpointHandle('y')
			.add(bEdge.expanded, info.B.expanded.top)
			.add(bEdge.expanded, bEdge.crossTarget)
			.add(bEdge.value, bEdge.crossTarget)
			.build()
	}

	return null
}

/**
 * Draw one of these arrows:
 * ```
 * 1:              2:              3:
 * ┌───┐                 ┌───┐     ┌───┐
 * │ A ├─────┐     ┌───┐ │ ┌─▼─┐   │ A ├─┐
 * └───┘     │     │ A ├─┘ │ B │   └───┘ │
 *         ┌─▼─┐   └───┘   └───┘     ┌───┘
 *         │ B │                   ┌─▼─┐
 *         └───┘                   │ B │
 *                                 └───┘
 * 4:        5:          6:
 *   ┌───┐     ┌───┐       ┌───┐ ┌───┐
 * ┌─▼─┐ │     │ ┌─▼─┐   ┌─▼─┐ │ │ A ├─┐
 * │ B │ │     │ │ B │   │ B │ │ └───┘ │
 * └───┘ │     │ └───┘   └───┘ └───────┘
 * ┌───┐ │     └───┐
 * │ A ├─┘   ┌───┐ │
 * └───┘     │ A ├─┘
 *           └───┘
 * ```
 */
export function routeRightToTop(info: ElbowArrowWorkingInfo): ElbowArrowRoute | null {
	const aEdge = info.A.edges.right
	const bEdge = info.B.edges.top

	if (!aEdge || !bEdge) return null

	if (
		aEdge.crossTarget < (bEdge.expanded ?? bEdge.value) &&
		bEdge.crossTarget > (aEdge.expanded ?? aEdge.value)
	) {
		// Arrow 1:
		return new ElbowArrowRouteBuilder(info, 'to top 1')
			.add(aEdge.value, aEdge.crossTarget)
			.add(bEdge.crossTarget, aEdge.crossTarget)
			.add(bEdge.crossTarget, bEdge.value)
			.build()
	}

	if (info.gapX > 0 && info.midX && bEdge.expanded) {
		// Arrow 2:
		return new ElbowArrowRouteBuilder(info, 'to top 2')
			.add(aEdge.value, aEdge.crossTarget)
			.add(info.midX, aEdge.crossTarget)
			.add(info.midX, bEdge.expanded)
			.midpointHandle('x')
			.add(bEdge.crossTarget, bEdge.expanded)
			.add(bEdge.crossTarget, bEdge.value)
			.build()
	}

	if (info.gapY > 0 && aEdge.expanded && bEdge.crossTarget < aEdge.expanded && info.midY) {
		// Arrow 3:
		return new ElbowArrowRouteBuilder(info, 'to top 3')
			.add(aEdge.value, aEdge.crossTarget)
			.add(aEdge.expanded, aEdge.crossTarget)
			.add(aEdge.expanded, info.midY)
			.add(bEdge.crossTarget, info.midY)
			.midpointHandle('y')
			.add(bEdge.crossTarget, bEdge.value)
			.build()
	}

	const arrow4Length =
		Math.abs(aEdge.value - info.common.expanded.right) +
		Math.abs(aEdge.crossTarget - info.common.expanded.top) +
		Math.abs(bEdge.crossTarget - info.common.expanded.right) +
		Math.abs(bEdge.value - info.common.expanded.top)

	const arrow5Length =
		aEdge.expanded !== null && info.midY !== null && bEdge.expanded !== null
			? Math.abs(aEdge.value - aEdge.expanded) +
				Math.abs(info.B.expanded.left - aEdge.expanded) +
				Math.abs(info.B.expanded.left - bEdge.crossTarget) +
				Math.abs(aEdge.crossTarget - info.B.expanded.top) +
				Math.abs(bEdge.value - bEdge.expanded)
			: Infinity

	const arrow6Length =
		aEdge.expanded !== null && info.midX !== null && bEdge.expanded !== null
			? Math.abs(aEdge.value - info.common.expanded.right) +
				Math.abs(aEdge.crossTarget - info.A.expanded.bottom) +
				Math.abs(aEdge.expanded - bEdge.crossTarget) +
				Math.abs(info.A.expanded.bottom - bEdge.expanded) +
				Math.abs(bEdge.expanded - bEdge.value)
			: Infinity

	if (arrow4Length < arrow5Length && arrow4Length < arrow6Length) {
		// Arrow 4:
		return new ElbowArrowRouteBuilder(info, 'to top 4')
			.add(aEdge.value, aEdge.crossTarget)
			.add(info.common.expanded.right, aEdge.crossTarget)
			.add(info.common.expanded.right, info.common.expanded.top)
			.add(bEdge.crossTarget, info.common.expanded.top)
			.add(bEdge.crossTarget, bEdge.value)
			.build()
	}

	if (
		bEdge.expanded !== null &&
		aEdge.expanded !== null &&
		info.midY !== null &&
		arrow5Length < arrow6Length
	) {
		// Arrow 5:
		return new ElbowArrowRouteBuilder(info, 'to top 5')
			.add(aEdge.value, aEdge.crossTarget)
			.add(aEdge.expanded, aEdge.crossTarget)
			.add(aEdge.expanded, info.midY)
			.add(info.B.expanded.left, info.midY)
			.midpointHandle('y')
			.add(info.B.expanded.left, bEdge.expanded)
			.add(bEdge.crossTarget, bEdge.expanded)
			.add(bEdge.crossTarget, bEdge.value)
			.build()
	}

	if (bEdge.expanded !== null && aEdge.expanded !== null && info.midX !== null) {
		// Arrow 6:
		return new ElbowArrowRouteBuilder(info, 'to top 6')
			.add(aEdge.value, aEdge.crossTarget)
			.add(aEdge.expanded, aEdge.crossTarget)
			.add(aEdge.expanded, info.A.expanded.bottom)
			.add(info.midX, info.A.expanded.bottom)
			.add(info.midX, bEdge.expanded)
			.midpointHandle('x')
			.add(bEdge.crossTarget, bEdge.expanded)
			.add(bEdge.crossTarget, bEdge.value)
			.build()
	}

	return null
}

/**
 * See `routeRightToTop`.
 */
export function routeRightToBottom(info: ElbowArrowWorkingInfo): ElbowArrowRoute | null {
	info.apply(ElbowArrowTransform.FlipY)
	return routeRightToTop(info)
}

/**
 * Arrows may be mirrored - Y flipped
 * ```
 * 1:        2:                3:
 * ┌───┐     ┌───┐ ┌───────┐           ┌───┐
 * │ A ├─┐   │ A ├─┘ ┌───┐ │   ┌───┐   │ A ├─┐
 * └───┘ │   └───┘   │ B ◄─┘   │ B ◄─┐ └───┘ │
 * ┌───┐ │           └───┘     └───┘ └───────┘
 * │ B ◄─┘
 * └───┘
 * ```
 */
export function routeRightToRight(info: ElbowArrowWorkingInfo): ElbowArrowRoute | null {
	const aEdge = info.A.edges.right
	const bEdge = info.B.edges.right

	if (!aEdge || !bEdge) return null

	if (
		(aEdge.crossTarget > info.B.expanded.bottom || aEdge.crossTarget < info.B.expanded.top) &&
		(bEdge.value > info.A.original.left ||
			bEdge.crossTarget > info.A.expanded.bottom ||
			bEdge.crossTarget < info.A.expanded.top)
	) {
		// Arrow 1
		return new ElbowArrowRouteBuilder(info, 'to right 1')
			.add(aEdge.value, aEdge.crossTarget)
			.add(info.common.expanded.right, aEdge.crossTarget)
			.add(info.common.expanded.right, bEdge.crossTarget)
			.add(bEdge.value, bEdge.crossTarget)
			.build()
	}

	if (!info.midX) return null

	if (bEdge.expanded && info.gapX > 0) {
		const viaBottomLength =
			Math.abs(bEdge.crossTarget - info.B.expanded.bottom) +
			Math.abs(aEdge.crossTarget - info.B.expanded.bottom)
		const viaTopLength =
			Math.abs(bEdge.crossTarget - info.B.expanded.top) +
			Math.abs(aEdge.crossTarget - info.B.expanded.top)

		const topOrBottom = viaBottomLength < viaTopLength ? 'bottom' : 'top'
		// Arrow 2:
		return new ElbowArrowRouteBuilder(info, `to right 2 via ${topOrBottom}`)
			.add(aEdge.value, aEdge.crossTarget)
			.add(info.midX, aEdge.crossTarget)
			.add(info.midX, info.B.expanded[topOrBottom])
			.midpointHandle('x')
			.add(bEdge.expanded, info.B.expanded[topOrBottom])
			.add(bEdge.expanded, bEdge.crossTarget)
			.add(bEdge.value, bEdge.crossTarget)
			.build()
	}

	if (aEdge.expanded && info.gapX < 0) {
		const viaBottomLength =
			Math.abs(bEdge.crossTarget - info.A.expanded.bottom) +
			Math.abs(aEdge.crossTarget - info.A.expanded.bottom)
		const viaTopLength =
			Math.abs(bEdge.crossTarget - info.A.expanded.top) +
			Math.abs(aEdge.crossTarget - info.A.expanded.top)

		const topOrBottom = viaBottomLength < viaTopLength ? 'bottom' : 'top'
		// Arrow 3:
		return new ElbowArrowRouteBuilder(info, `to right 3 via ${topOrBottom}`)
			.add(aEdge.value, aEdge.crossTarget)
			.add(aEdge.expanded, aEdge.crossTarget)
			.add(aEdge.expanded, info.A.expanded[topOrBottom])
			.add(info.midX, info.A.expanded[topOrBottom])
			.add(info.midX, bEdge.crossTarget)
			.midpointHandle('x')
			.add(bEdge.value, bEdge.crossTarget)
			.build()
	}

	return null
}

const routes = {
	top: {
		top: (info) => {
			info.apply(ElbowArrowTransform.Rotate270)
			return routeRightToRight(info)
		},
		left: (info) => {
			info.apply(ElbowArrowTransform.Rotate270)
			return routeRightToTop(info)
		},
		bottom: (info) => {
			info.apply(ElbowArrowTransform.Rotate270)
			return routeRightToLeft(info)
		},
		right: (info) => {
			info.apply(ElbowArrowTransform.Rotate270)
			return routeRightToBottom(info)
		},
	},
	right: {
		top: routeRightToTop,
		right: routeRightToRight,
		bottom: routeRightToBottom,
		left: routeRightToLeft,
	},
	bottom: {
		top: (info) => {
			info.apply(ElbowArrowTransform.Rotate90)
			return routeRightToLeft(info)
		},
		left: (info) => {
			info.apply(ElbowArrowTransform.Rotate90)
			return routeRightToBottom(info)
		},
		bottom: (info) => {
			info.apply(ElbowArrowTransform.Rotate90)
			return routeRightToRight(info)
		},
		right: (info) => {
			info.apply(ElbowArrowTransform.Rotate90)
			return routeRightToTop(info)
		},
	},
	left: {
		top: (info) => {
			info.apply(ElbowArrowTransform.Rotate180)
			return routeRightToBottom(info)
		},
		right: (info) => {
			info.apply(ElbowArrowTransform.Rotate180)
			return routeRightToLeft(info)
		},
		bottom: (info) => {
			info.apply(ElbowArrowTransform.Rotate180)
			return routeRightToTop(info)
		},
		left: (info) => {
			info.apply(ElbowArrowTransform.Rotate180)
			return routeRightToRight(info)
		},
	},
} satisfies Record<
	ElbowArrowSide,
	Record<ElbowArrowSide, (info: ElbowArrowWorkingInfo) => ElbowArrowRoute | null>
>

export function tryRouteArrow(
	info: ElbowArrowWorkingInfo,
	aEdge: ElbowArrowSide,
	bEdge: ElbowArrowSide
): ElbowArrowRoute | null {
	const route = routes[aEdge][bEdge](info)
	info.reset()
	return route
}
