import { Box } from '../../primitives/Box'
import { Vec } from '../../primitives/Vec'

// Pure layout math. Editor resolves shapes into clusters through its own (overridable, reactive)
// methods and applies every result itself, so nothing in this file may read editor state. A cluster
// is opaque here: these functions only ever look at its `pageBounds`.

const AXIS = {
	horizontal: { val: 'x', min: 'minX', max: 'maxX', dim: 'width' },
	vertical: { val: 'y', min: 'minY', max: 'maxY', dim: 'height' },
} as const

/** The one thing layout math needs from a cluster of shapes. */
export interface LayoutBounds {
	pageBounds: Box
}

/** A cluster and the page-space delta to translate it by. */
export interface LayoutMove<T> {
	item: T
	delta: Vec
}

/** A cluster, the page-space delta to translate it by, and the scale to then apply. */
export interface LayoutTransform<T> {
	item: T
	pageOffset: Vec
	scaleOrigin: Vec
	scale: Vec
}

export type LayoutAxis = 'horizontal' | 'vertical'

export type AlignOperation =
	| 'left'
	| 'center-horizontal'
	| 'right'
	| 'top'
	| 'center-vertical'
	| 'bottom'

/** Line clusters up along one edge (or centre line) of their common bounds. */
export function getAlignLayout<T extends LayoutBounds>(
	items: readonly T[],
	operation: AlignOperation
): LayoutMove<T>[] {
	const commonBounds = getCommonBounds(items)
	const moves: LayoutMove<T>[] = []

	items.forEach((item) => {
		const pageBounds = item.pageBounds
		const delta = new Vec()

		switch (operation) {
			case 'top': {
				delta.y = commonBounds.minY - pageBounds.minY
				break
			}
			case 'center-vertical': {
				delta.y = commonBounds.midY - pageBounds.minY - pageBounds.height / 2
				break
			}
			case 'bottom': {
				delta.y = commonBounds.maxY - pageBounds.minY - pageBounds.height
				break
			}
			case 'left': {
				delta.x = commonBounds.minX - pageBounds.minX
				break
			}
			case 'center-horizontal': {
				delta.x = commonBounds.midX - pageBounds.minX - pageBounds.width / 2
				break
			}
			case 'right': {
				delta.x = commonBounds.maxX - pageBounds.minX - pageBounds.width
				break
			}
		}

		moves.push({ item, delta })
	})

	return moves
}

/**
 * Butt clusters up against each other along an axis. When `gap` is zero the gap is inferred from
 * the gaps the clusters already have.
 */
export function getStackLayout<T extends LayoutBounds>(
	items: readonly T[],
	operation: LayoutAxis,
	gap: number
): LayoutMove<T>[] {
	const { val, min, max, dim } = AXIS[operation]

	const len = items.length
	if (len < 2) return []

	let shapeGap: number = 0

	// Stack in spatial order rather than input (z) order, otherwise shapes swap places
	const sorted = [...items].sort((a, b) => a.pageBounds[min] - b.pageBounds[min])

	if (gap === 0) {
		// note: this is not used in the current tldraw.com; there we use a specified stack

		const gaps: Record<number, number> = {}

		// Collect all of the gaps between shapes. We want to find
		// patterns (equal gaps between shapes) and use the most common
		// one as the gap for all of the shapes.
		for (let i = 0; i < len - 1; i++) {
			const currCluster = sorted[i]
			const nextCluster = sorted[i + 1]
			const gap = nextCluster.pageBounds[min] - currCluster.pageBounds[max]
			if (!gaps[gap]) {
				gaps[gap] = 0
			}
			gaps[gap]++
		}

		// Which gap is the most common?
		let maxCount = 1
		for (const [gap, count] of Object.entries(gaps)) {
			if (count > maxCount) {
				maxCount = count
				shapeGap = parseFloat(gap)
			}
		}

		// If there is no most-common gap, use the average gap.
		if (maxCount === 1) {
			let totalCount = 0
			for (const [gap, count] of Object.entries(gaps)) {
				shapeGap += parseFloat(gap) * count
				totalCount += count
			}
			shapeGap /= totalCount
		}
	} else {
		// If a gap was provided, then use that instead.
		shapeGap = gap
	}

	const moves: LayoutMove<T>[] = []

	let v = sorted[0].pageBounds[max]

	for (let i = 1; i < sorted.length; i++) {
		const item = sorted[i]
		const pageBounds = item.pageBounds
		const delta = new Vec()
		delta[val] = v + shapeGap - pageBounds[val]

		moves.push({ item, delta })

		v += pageBounds[dim] + shapeGap
	}

	return moves
}

/**
 * The outcome of distributing. When the extreme clusters at both ends are the same cluster there is
 * nothing to distribute between, so the caller distributes the remaining clusters instead.
 */
export type DistributeLayout<T> =
	| { type: 'moves'; moves: LayoutMove<T>[] }
	| { type: 'excludes'; excluded: T }

/**
 * Space clusters evenly between the two extreme clusters along an axis. Expects at least three
 * clusters; with fewer there is nothing between the extremes to move.
 *
 * @param getTiebreakKey - Orders clusters that start at the same coordinate, so the result doesn't
 * depend on input order.
 */
export function getDistributeLayout<T extends LayoutBounds>(
	items: readonly T[],
	operation: LayoutAxis,
	getTiebreakKey: (item: T) => string
): DistributeLayout<T> {
	const { val, min, max, dim } = AXIS[operation]

	const sorted = [...items]
	const first = sorted.sort((a, b) => a.pageBounds[min] - b.pageBounds[min])[0]
	const last = sorted.sort((a, b) => b.pageBounds[max] - a.pageBounds[max])[0]

	// If the first shape group is also the last shape group, distribute without it
	if (first === last) {
		return { type: 'excludes', excluded: first }
	}

	const itemsToMove = sorted
		.filter((item) => item !== first && item !== last)
		.sort((a, b) => {
			if (a.pageBounds[min] === b.pageBounds[min]) {
				return getTiebreakKey(a) < getTiebreakKey(b) ? -1 : 1
			}
			return a.pageBounds[min] - b.pageBounds[min]
		})

	// The gap is the amount of space "left over" between the first and last shape. This can be a negative number if the shapes are overlapping.
	const maxFirst = first.pageBounds[max]
	const range = last.pageBounds[min] - maxFirst
	const summedShapeDimensions = itemsToMove.reduce((acc, s) => acc + s.pageBounds[dim], 0)
	const gap = (range - summedShapeDimensions) / (itemsToMove.length + 1)

	const moves: LayoutMove<T>[] = []

	for (let v = maxFirst + gap, i = 0; i < itemsToMove.length; i++) {
		const item = itemsToMove[i]
		const pageBounds = item.pageBounds
		const delta = new Vec()
		delta[val] = v - pageBounds[val]

		// If for some reason the new position would be more than the maximum, we need to adjust the delta
		// This will likely throw off some of the other placements but hey, it's better than changing the common bounds
		if (v + pageBounds[dim] > last.pageBounds[max] - 1) {
			delta[val] = last.pageBounds[max] - pageBounds[max] - 1
		}

		moves.push({ item, delta })

		v += pageBounds[dim] + gap
	}

	return { type: 'moves', moves }
}

/** Grow every cluster along one axis until it spans the common bounds. */
export function getStretchLayout<T extends LayoutBounds>(
	items: readonly T[],
	operation: LayoutAxis
): LayoutTransform<T>[] {
	const commonBounds = getCommonBounds(items)
	const { val, min, dim } = AXIS[operation]

	return items.map((item) => {
		const pageBounds = item.pageBounds

		const pageOffset = new Vec()
		pageOffset[val] = commonBounds[min] - pageBounds[min]

		const scaleOrigin = pageBounds.center.clone()
		scaleOrigin[val] = commonBounds[min]

		const scale = new Vec(1, 1)
		scale[val] = commonBounds[dim] / pageBounds[dim]

		return { item, pageOffset, scaleOrigin, scale }
	})
}

/**
 * Scale and move every cluster so that their common bounds becomes `targetBounds`. Returns null
 * when the clusters have no area to scale from.
 */
export function getResizeToBoundsLayout<T extends LayoutBounds>(
	items: readonly T[],
	targetBounds: Box
): LayoutTransform<T>[] | null {
	const commonBounds = getCommonBounds(items)
	if (commonBounds.width === 0 || commonBounds.height === 0) return null

	const scaleX = targetBounds.width / commonBounds.width
	const scaleY = targetBounds.height / commonBounds.height
	const scale = new Vec(scaleX, scaleY)

	return items.map((item) => {
		const pageBounds = item.pageBounds

		const pageOffset = new Vec(
			targetBounds.minX - commonBounds.minX + (pageBounds.minX - commonBounds.minX) * (scaleX - 1),
			targetBounds.minY - commonBounds.minY + (pageBounds.minY - commonBounds.minY) * (scaleY - 1)
		)

		const scaleOrigin = new Vec(
			targetBounds.minX + (pageBounds.minX - commonBounds.minX) * scaleX,
			targetBounds.minY + (pageBounds.minY - commonBounds.minY) * scaleY
		)

		return { item, pageOffset, scaleOrigin, scale }
	})
}

/**
 * Pack clusters into a grid centered on their current position. Based on potpack
 * (https://github.com/mapbox/potpack).
 */
export function getPackLayout<T extends LayoutBounds>(
	items: readonly T[],
	gap: number
): LayoutMove<T>[] {
	const itemsToPack = items.map((item) => ({
		item,
		pageBounds: item.pageBounds,
		nextPageBounds: item.pageBounds.clone(),
	}))

	let area = 0
	for (const { pageBounds } of itemsToPack) {
		area += pageBounds.width * pageBounds.height
	}

	const commonBounds = getCommonBounds(items)

	const maxWidth = commonBounds.width

	// sort the shape clusters by width and then height, descending: potpack fills each row's
	// right-hand space with the shapes that follow, so they must be no taller than the row
	itemsToPack
		.sort((a, b) => b.pageBounds.width - a.pageBounds.width)
		.sort((a, b) => b.pageBounds.height - a.pageBounds.height)

	// Start with is (sort of) the square of the area
	const startWidth = Math.max(Math.ceil(Math.sqrt(area / 0.95)), maxWidth)

	// first shape fills the width and is infinitely tall
	const spaces: Box[] = [new Box(commonBounds.x, commonBounds.y, startWidth, Infinity)]

	let width = 0
	let height = 0
	let space: Box
	let lastSpace: Box

	for (const { nextPageBounds } of itemsToPack) {
		// starting at the back (smaller shapes)
		for (let i = spaces.length - 1; i >= 0; i--) {
			space = spaces[i]

			// find a space that is big enough to contain the shape
			if (nextPageBounds.width > space.width || nextPageBounds.height > space.height) continue

			// add the shape to its top-left corner
			nextPageBounds.x = space.x
			nextPageBounds.y = space.y

			height = Math.max(height, nextPageBounds.maxY)
			width = Math.max(width, nextPageBounds.maxX)

			if (nextPageBounds.width === space.width && nextPageBounds.height === space.height) {
				// remove the space on a perfect fit
				lastSpace = spaces.pop()!
				if (i < spaces.length) spaces[i] = lastSpace
			} else if (nextPageBounds.height === space.height) {
				// fit the shape into the space (width)
				space.x += nextPageBounds.width + gap
				space.width -= nextPageBounds.width + gap
			} else if (nextPageBounds.width === space.width) {
				// fit the shape into the space (height)
				space.y += nextPageBounds.height + gap
				space.height -= nextPageBounds.height + gap
			} else {
				// split the space into two spaces
				spaces.push(
					new Box(
						space.x + (nextPageBounds.width + gap),
						space.y,
						space.width - (nextPageBounds.width + gap),
						nextPageBounds.height
					)
				)
				space.y += nextPageBounds.height + gap
				space.height -= nextPageBounds.height + gap
			}
			break
		}
	}

	const commonAfter = Box.Common(itemsToPack.map((s) => s.nextPageBounds))
	const centerDelta = Vec.Sub(commonBounds.center, commonAfter.center)

	return itemsToPack.map(({ item, pageBounds, nextPageBounds }) => ({
		item,
		delta: Vec.Sub(nextPageBounds.point, pageBounds.point).add(centerDelta),
	}))
}

function getCommonBounds(items: readonly LayoutBounds[]) {
	return Box.Common(items.map((item) => item.pageBounds))
}
