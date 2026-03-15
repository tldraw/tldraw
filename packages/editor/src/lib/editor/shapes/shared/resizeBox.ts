import { VecModel } from '@tldraw/tlschema'
import { Box } from '../../../primitives/Box'
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

	const isLeftHandle = handle === 'top_left' || handle === 'left' || handle === 'bottom_left'
	const isTopHandle = handle === 'top_left' || handle === 'top' || handle === 'top_right'
	const isXCenter = handle === 'top' || handle === 'bottom'
	const isYCenter = handle === 'left' || handle === 'right'

	const xResult = clampAxis(w, minWidth, isLeftHandle, isXCenter)
	const yResult = clampAxis(h, minHeight, isTopHandle, isYCenter)
	w = xResult.value
	h = yResult.value
	const offset = new Vec(xResult.offset, yResult.offset)

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

function clampAxis(value: number, minValue: number, isStart: boolean, isCenter: boolean) {
	let offset = 0
	if (value > 0) {
		if (value < minValue) {
			if (isStart) offset = value - minValue
			else if (isCenter) offset = (value - minValue) / 2
			value = minValue
		}
	} else {
		offset = value
		value = -value
		if (value < minValue) {
			offset = isStart ? -value : -minValue
			value = minValue
		}
	}
	return { value, offset }
}
