import {
	ShapeWithCrop,
	TLCropInfo,
	TLShapeCrop,
	TLShapeId,
	Vec,
	structuredClone,
} from '@tldraw/editor'

/** @internal */
export const MIN_CROP_SIZE = 8

/** @public */
export interface CropBoxOptions {
	minWidth?: number
	minHeight?: number
}

/** @public */
export function getDefaultCrop() {
	return {
		topLeft: { x: 0, y: 0 },
		bottomRight: { x: 1, y: 1 },
	}
}

/**
 * Original (uncropped) width and height of shape.
 *
 * @public
 */
export function getUncroppedSize(
	shapeSize: { w: number; h: number },
	crop: TLShapeCrop | null
): { w: number; h: number } {
	if (!crop) return { w: shapeSize.w, h: shapeSize.h }
	const w = shapeSize.w / (crop.bottomRight.x - crop.topLeft.x)
	const h = shapeSize.h / (crop.bottomRight.y - crop.topLeft.y)
	return { w, h }
}

/** @public */
export function getCropBox<T extends ShapeWithCrop>(
	shape: T,
	info: TLCropInfo<T>,
	opts = {} as CropBoxOptions
):
	| {
			id: TLShapeId
			type: T['type']
			x: number
			y: number
			props: ShapeWithCrop['props']
	  }
	| undefined {
	const { handle, change, crop } = info
	const { w, h } = info.uncroppedSize
	const { minWidth = MIN_CROP_SIZE, minHeight = MIN_CROP_SIZE } = opts

	const newCrop = structuredClone(crop)
	const newPoint = new Vec(shape.x, shape.y)
	const pointDelta = new Vec(0, 0)

	let hasCropChanged = false

	// Set y dimension
	switch (handle) {
		case 'top':
		case 'top_left':
		case 'top_right': {
			if (h < minHeight) break
			hasCropChanged = true
			// top
			newCrop.topLeft.y = newCrop.topLeft.y + change.y / h
			const heightAfterCrop = h * (newCrop.bottomRight.y - newCrop.topLeft.y)

			if (heightAfterCrop < minHeight) {
				newCrop.topLeft.y = newCrop.bottomRight.y - minHeight / h
				pointDelta.y = (newCrop.topLeft.y - crop.topLeft.y) * h
			} else {
				if (newCrop.topLeft.y <= 0) {
					newCrop.topLeft.y = 0
					pointDelta.y = (newCrop.topLeft.y - crop.topLeft.y) * h
				} else {
					pointDelta.y = change.y
				}
			}
			break
		}
		case 'bottom':
		case 'bottom_left':
		case 'bottom_right': {
			if (h < minHeight) break
			hasCropChanged = true
			// bottom
			newCrop.bottomRight.y = Math.min(1, newCrop.bottomRight.y + change.y / h)
			const heightAfterCrop = h * (newCrop.bottomRight.y - newCrop.topLeft.y)

			if (heightAfterCrop < minHeight) {
				newCrop.bottomRight.y = newCrop.topLeft.y + minHeight / h
			}
			break
		}
	}

	// Set x dimension
	switch (handle) {
		case 'left':
		case 'top_left':
		case 'bottom_left': {
			if (w < minWidth) break
			hasCropChanged = true
			// left
			newCrop.topLeft.x = newCrop.topLeft.x + change.x / w
			const widthAfterCrop = w * (newCrop.bottomRight.x - newCrop.topLeft.x)

			if (widthAfterCrop < minWidth) {
				newCrop.topLeft.x = newCrop.bottomRight.x - minWidth / w
				pointDelta.x = (newCrop.topLeft.x - crop.topLeft.x) * w
			} else {
				if (newCrop.topLeft.x <= 0) {
					newCrop.topLeft.x = 0
					pointDelta.x = (newCrop.topLeft.x - crop.topLeft.x) * w
				} else {
					pointDelta.x = change.x
				}
			}
			break
		}
		case 'right':
		case 'top_right':
		case 'bottom_right': {
			if (w < minWidth) break
			hasCropChanged = true
			// right
			newCrop.bottomRight.x = Math.min(1, newCrop.bottomRight.x + change.x / w)
			const widthAfterCrop = w * (newCrop.bottomRight.x - newCrop.topLeft.x)

			if (widthAfterCrop < minWidth) {
				newCrop.bottomRight.x = newCrop.topLeft.x + minWidth / w
			}
			break
		}
	}
	if (!hasCropChanged) return undefined

	newPoint.add(pointDelta.rot(shape.rotation))

	return {
		id: shape.id,
		type: shape.type,
		x: newPoint.x,
		y: newPoint.y,
		props: {
			w: (newCrop.bottomRight.x - newCrop.topLeft.x) * w,
			h: (newCrop.bottomRight.y - newCrop.topLeft.y) * h,
			crop: newCrop,
		},
	}
}
