import { VecModel } from '@tldraw/tlschema'
import { Box } from '../../../primitives/Box'
import { Vec } from '../../../primitives/Vec'
import { TLResizeHandle } from '../../types/selection-types'
import { TLBaseBoxShape } from '../BaseBoxShapeUtil'
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
		if (w < minWidth) {
			switch (handle) {
				case 'top_left':
				case 'left':
				case 'bottom_left': {
					offset.x = w - minWidth
					break
				}
				case 'top':
				case 'bottom': {
					offset.x = (w - minWidth) / 2
					break
				}
				default: {
					offset.x = 0
				}
			}
			w = minWidth
		}
	} else {
		offset.x = w
		w = -w
		if (w < minWidth) {
			switch (handle) {
				case 'top_left':
				case 'left':
				case 'bottom_left': {
					offset.x = -w
					break
				}
				default: {
					offset.x = -minWidth
				}
			}

			w = minWidth
		}
	}

	if (h > 0) {
		if (h < minHeight) {
			switch (handle) {
				case 'top_left':
				case 'top':
				case 'top_right': {
					offset.y = h - minHeight
					break
				}
				case 'right':
				case 'left': {
					offset.y = (h - minHeight) / 2
					break
				}
				default: {
					offset.y = 0
				}
			}

			h = minHeight
		}
	} else {
		offset.y = h
		h = -h
		if (h < minHeight) {
			switch (handle) {
				case 'top_left':
				case 'top':
				case 'top_right': {
					offset.y = -h
					break
				}
				default: {
					offset.y = -minHeight
				}
			}
			h = minHeight
		}
	}

	const { x, y } = offset.rot(shape.rotation).add(newPoint)

	return {
		...shape,
		x,
		y,
		props: {
			w: Math.min(maxWidth, w),
			h: Math.min(maxHeight, h),
		},
	}
}
