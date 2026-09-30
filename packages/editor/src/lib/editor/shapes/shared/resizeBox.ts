import { VecModel } from '@tldraw/tlschema'
import { Box } from '../../../primitives/Box'
import { clamp } from '../../../primitives/utils'
import { Vec } from '../../../primitives/Vec'
import { TLResizeHandle } from '../../types/selection-types'
import type { TLBaseBoxShape } from '../BaseBoxShapeUtil'
import { TLResizeMode } from '../ShapeUtil'

/** @public */
export interface ResizeBoxOptions {
	minWidth?: number
	maxWidth?: number
	minHeight?: number
	maxHeight?: number
}

/** @public */
export function resizeBox<T extends TLBaseBoxShape>(
	shape: T,
	info: {
		newPoint: VecModel
		handle: TLResizeHandle
		mode: TLResizeMode
		scaleX: number
		scaleY: number
		initialBounds: Box
		initialShape: T
	},
	opts = {} as ResizeBoxOptions
): T {
	const { newPoint, handle, scaleX, scaleY } = info
	const { minWidth = 1, maxWidth = Infinity, minHeight = 1, maxHeight = Infinity } = opts

	let w = shape.props.w * scaleX
	let h = shape.props.h * scaleY

	const offset = new Vec(0, 0)

	if (w > 0) {
		const clampedW = clamp(w, minWidth, maxWidth)
		if (clampedW !== w) {
			switch (handle) {
				case 'top_left':
				case 'left':
				case 'bottom_left': {
					offset.x = w - clampedW
					break
				}
				case 'top':
				case 'bottom': {
					offset.x = (w - clampedW) / 2
					break
				}
				default: {
					offset.x = 0
				}
			}
			w = clampedW
		}
	} else {
		offset.x = w
		w = -w
		const clampedW = clamp(w, minWidth, maxWidth)
		if (clampedW !== w) {
			switch (handle) {
				case 'top_left':
				case 'left':
				case 'bottom_left': {
					offset.x = -w
					break
				}
				default: {
					offset.x = -clampedW
				}
			}

			w = clampedW
		}
	}

	if (h > 0) {
		const clampedH = clamp(h, minHeight, maxHeight)
		if (clampedH !== h) {
			switch (handle) {
				case 'top_left':
				case 'top':
				case 'top_right': {
					offset.y = h - clampedH
					break
				}
				case 'right':
				case 'left': {
					offset.y = (h - clampedH) / 2
					break
				}
				default: {
					offset.y = 0
				}
			}

			h = clampedH
		}
	} else {
		offset.y = h
		h = -h
		const clampedH = clamp(h, minHeight, maxHeight)
		if (clampedH !== h) {
			switch (handle) {
				case 'top_left':
				case 'top':
				case 'top_right': {
					offset.y = -h
					break
				}
				default: {
					offset.y = -clampedH
				}
			}
			h = clampedH
		}
	}

	const { x, y } = offset.rot(shape.rotation).add(newPoint)

	return {
		...shape,
		x,
		y,
		props: {
			w,
			h,
		},
	}
}
