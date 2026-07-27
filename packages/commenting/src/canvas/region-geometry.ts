import { BoxModel, VecLike } from 'tldraw'

/**
 * A resize handle's normalized 0–1 spot on the box, and its cursor. An axis at 0.5 (a side
 * midpoint) is *not* controlled by that handle: corners resize both axes, edges resize only their
 * own.
 * @public
 */
export interface RegionHandle {
	x: number
	y: number
	cursor: 'nwse-resize' | 'nesw-resize' | 'ns-resize' | 'ew-resize'
}

/** The four corners (both axes). @public */
export const REGION_CORNERS: readonly RegionHandle[] = [
	{ x: 0, y: 0, cursor: 'nwse-resize' },
	{ x: 1, y: 0, cursor: 'nesw-resize' },
	{ x: 0, y: 1, cursor: 'nesw-resize' },
	{ x: 1, y: 1, cursor: 'nwse-resize' },
]

/** The four side midpoints (one axis each). @public */
export const REGION_EDGES: readonly RegionHandle[] = [
	{ x: 0.5, y: 0, cursor: 'ns-resize' },
	{ x: 1, y: 0.5, cursor: 'ew-resize' },
	{ x: 0.5, y: 1, cursor: 'ns-resize' },
	{ x: 0, y: 0.5, cursor: 'ew-resize' },
]

/** Screen-space slack around a region's bounds within which its box and handles stay revealed, so
 *  the handles (which sit on the edge) are comfortably reachable. */
export const REGION_HANDLE_MARGIN_PX = 12

/**
 * Resize `box` by dragging `handle` to `cursor` (page coords). Each controlled axis spans from the
 * handle's fixed opposite edge to the cursor (normalized, so dragging past it flips); an axis the
 * handle doesn't control (a midpoint, at 0.5) keeps its original position and size.
 * @public
 */
export function resizeRegion(box: BoxModel, handle: RegionHandle, cursor: VecLike): BoxModel {
	const controlsX = handle.x !== 0.5
	const controlsY = handle.y !== 0.5
	const fixedX = box.x + (1 - handle.x) * box.w
	const fixedY = box.y + (1 - handle.y) * box.h
	return {
		x: controlsX ? Math.min(fixedX, cursor.x) : box.x,
		y: controlsY ? Math.min(fixedY, cursor.y) : box.y,
		w: controlsX ? Math.abs(cursor.x - fixedX) : box.w,
		h: controlsY ? Math.abs(cursor.y - fixedY) : box.h,
	}
}
