import { Box, Vec } from '@tldraw/editor'
import {
	ElbowArrowBoxEdges,
	ElbowArrowEdge,
	ElbowArrowInfoWithoutRoute,
	ElbowArrowOptions,
} from '../definitions'

/**
 * A transform that can be applied when working on elbow arrows. This only models flipping x/y or
 * transposing x/y (for 90 degree rotations).
 */
export interface ElbowArrowTransform {
	readonly x: 1 | -1
	readonly y: 1 | -1
	readonly transpose: boolean
}

function flipEdgeCrossInPlace(edge: ElbowArrowEdge | null) {
	if (!edge) return
	const tmp = edge.cross.min
	edge.cross.min = -edge.cross.max
	edge.cross.max = -tmp
	edge.crossTarget = -edge.crossTarget
}

function flipEdgeValueInPlace(edge: ElbowArrowEdge | null) {
	if (!edge) return
	edge.value = -edge.value
	edge.expanded = edge.expanded === null ? null : -edge.expanded
}

export const ElbowArrowTransform = {
	Identity: { x: 1, y: 1, transpose: false } as const,
	Rotate90: { x: -1, y: 1, transpose: true } as const,
	Rotate180: { x: -1, y: -1, transpose: false } as const,
	Rotate270: { x: 1, y: -1, transpose: true } as const,
	FlipX: { x: -1, y: 1, transpose: false } as const,
	FlipY: { x: 1, y: -1, transpose: false } as const,
}

function invertElbowArrowTransform(transform: ElbowArrowTransform): ElbowArrowTransform {
	if (transform.transpose) {
		return {
			x: transform.y,
			y: transform.x,
			transpose: true,
		}
	}

	return transform
}

export function transformElbowArrowTransform(a: ElbowArrowTransform, b: ElbowArrowTransform) {
	// apply b to a:
	const next = { ...a }

	if (b.transpose) {
		const temp = next.x
		next.x = next.y
		next.y = temp
		next.transpose = !next.transpose
	}

	if (b.x === -1) {
		next.x = -next.x as 1 | -1
	}
	if (b.y === -1) {
		next.y = -next.y as 1 | -1
	}

	return next
}

function transformVecInPlace(transform: ElbowArrowTransform, point: Vec) {
	point.x = transform.x * point.x
	point.y = transform.y * point.y

	if (transform.transpose) {
		const temp = point.x
		point.x = point.y
		point.y = temp
	}
}

function transformBoxInPlace(transform: ElbowArrowTransform, box: Box) {
	if (transform.x === -1) {
		box.x = -(box.x + box.width)
	}
	if (transform.y === -1) {
		box.y = -(box.y + box.height)
	}
	if (transform.transpose) {
		let temp = box.x
		box.x = box.y
		box.y = temp
		temp = box.width
		box.width = box.height
		box.height = temp
	}
}

function transformEdgesInPlace(transform: ElbowArrowTransform, edges: ElbowArrowBoxEdges) {
	let temp = null
	if (transform.x === -1) {
		temp = edges.left
		edges.left = edges.right
		edges.right = temp
		flipEdgeCrossInPlace(edges.top)
		flipEdgeCrossInPlace(edges.bottom)
		flipEdgeValueInPlace(edges.left)
		flipEdgeValueInPlace(edges.right)
	}
	if (transform.y === -1) {
		temp = edges.top
		edges.top = edges.bottom
		edges.bottom = temp
		flipEdgeCrossInPlace(edges.left)
		flipEdgeCrossInPlace(edges.right)
		flipEdgeValueInPlace(edges.top)
		flipEdgeValueInPlace(edges.bottom)
	}
	if (transform.transpose) {
		temp = edges.left
		edges.left = edges.top
		edges.top = temp
		temp = edges.right
		edges.right = edges.bottom
		edges.bottom = temp
	}
}

export function debugElbowArrowTransform(transform: ElbowArrowTransform) {
	switch (
		`${transform.transpose ? 't' : ''}${transform.x === -1 ? 'x' : ''}${transform.y === -1 ? 'y' : ''}`
	) {
		case '':
			return 'Identity'
		case 't':
			return 'Transpose'
		case 'x':
			return 'FlipX'
		case 'y':
			return 'FlipY'
		case 'tx':
			return 'Rotate90'
		case 'ty':
			return 'Rotate270'
		case 'xy':
			return 'Rotate180'
		case 'txy':
			return 'spooky (transpose + flip both)'
		default:
			throw new Error('Unknown transform')
	}
}

export interface ElbowArrowWorkingBox {
	original: Box
	expanded: Box
	edges: ElbowArrowBoxEdges
	isPoint: boolean
}

export class ElbowArrowWorkingInfo {
	options: ElbowArrowOptions
	A: ElbowArrowWorkingBox
	B: ElbowArrowWorkingBox
	common: {
		original: Box
		expanded: Box
	}
	gapX: number
	gapY: number
	midX: number | null
	midY: number | null

	constructor(info: ElbowArrowInfoWithoutRoute) {
		this.options = info.options
		this.A = info.A
		this.B = info.B
		this.common = info.common
		this.midX = info.midX
		this.midY = info.midY
		this.gapX = info.gapX
		this.gapY = info.gapY
	}

	transform: ElbowArrowTransform = ElbowArrowTransform.Identity
	inverse: ElbowArrowTransform = ElbowArrowTransform.Identity

	apply(transform: ElbowArrowTransform) {
		this.transform = transformElbowArrowTransform(transform, this.transform)
		this.inverse = invertElbowArrowTransform(this.transform)

		transformBoxInPlace(transform, this.A.original)
		transformBoxInPlace(transform, this.B.original)
		transformBoxInPlace(transform, this.common.original)

		transformBoxInPlace(transform, this.A.expanded)
		transformBoxInPlace(transform, this.B.expanded)
		transformBoxInPlace(transform, this.common.expanded)

		transformEdgesInPlace(transform, this.A.edges)
		transformEdgesInPlace(transform, this.B.edges)

		if (transform.x === -1) {
			this.gapX = -this.gapX
			this.midX = this.midX === null ? null : -this.midX
		}
		if (transform.y === -1) {
			this.gapY = -this.gapY
			this.midY = this.midY === null ? null : -this.midY
		}

		if (transform.transpose) {
			let temp = this.midX
			this.midX = this.midY
			this.midY = temp
			temp = this.gapX
			this.gapX = this.gapY
			this.gapY = temp
		}
	}

	reset() {
		this.apply(this.inverse)
	}

	vec(x: number, y: number) {
		const point = new Vec(x, y)
		transformVecInPlace(this.inverse, point)
		return point
	}
}
