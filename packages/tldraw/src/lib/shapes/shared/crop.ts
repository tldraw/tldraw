import {
	ShapeWithCrop,
	TLCropInfo,
	TLImageShape,
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
export function getDefaultCrop(): TLShapeCrop {
	return {
		topLeft: { x: 0, y: 0 },
		bottomRight: { x: 1, y: 1 },
	}
}

/** @public */
export type ASPECT_RATIO_OPTION =
	| 'original'
	| 'square'
	| 'circle'
	| 'landscape'
	| 'portrait'
	| 'wide'

/** @public */
export const ASPECT_RATIO_OPTIONS: ASPECT_RATIO_OPTION[] = [
	'original',
	'square',
	'circle',
	'landscape',
	'portrait',
	'wide',
]

/** @public */
export const ASPECT_RATIO_TO_VALUE: Record<ASPECT_RATIO_OPTION, number> = {
	original: 0,
	square: 1,
	circle: 1,
	landscape: 4 / 3,
	portrait: 3 / 4,
	wide: 16 / 9,
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
	const topLeftLimit = 0
	const bottomRightLimit = 1

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
				if (newCrop.topLeft.y <= topLeftLimit) {
					newCrop.topLeft.y = topLeftLimit
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
			newCrop.bottomRight.y = Math.min(bottomRightLimit, newCrop.bottomRight.y + change.y / h)
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
				if (newCrop.topLeft.x <= topLeftLimit) {
					newCrop.topLeft.x = topLeftLimit
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
			newCrop.bottomRight.x = Math.min(bottomRightLimit, newCrop.bottomRight.x + change.x / w)
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

interface CropChange {
	crop: {
		topLeft: { x: number; y: number }
		bottomRight: { x: number; y: number }
		isCircle?: boolean
	}
	w: number
	h: number
	x: number
	y: number
}

/**
 * Calculate new crop dimensions and position when zooming
 */
export function getCroppedImageDataWhenZooming(zoom: number, imageShape: TLImageShape): CropChange {
	const oldCrop = imageShape.props.crop || getDefaultCrop()
	const { w, h } = getUncroppedSize(imageShape.props, imageShape.props.crop ?? getDefaultCrop())

	// Calculate crop dimensions and center
	const oldWidth = oldCrop.bottomRight.x - oldCrop.topLeft.x
	const oldHeight = oldCrop.bottomRight.y - oldCrop.topLeft.y
	const cropCenterX = oldCrop.topLeft.x + oldWidth / 2
	const cropCenterY = oldCrop.topLeft.y + oldHeight / 2
	const aspectRatio = oldWidth / oldHeight

	// Calculate new crop size with zoom scale
	const zoomScale = 1 + zoom * 3
	let newWidth = Math.min(1, 1 / zoomScale)
	let newHeight = aspectRatio > 1 ? newWidth / aspectRatio : newWidth * aspectRatio

	if (aspectRatio <= 1) {
		newHeight = Math.min(1, 1 / zoomScale)
		newWidth = newHeight * aspectRatio
	}

	// Position crop centered on original crop center, bounded by [0,1]
	const topLeftX = Math.max(0, Math.min(1 - newWidth, cropCenterX - newWidth / 2))
	const topLeftY = Math.max(0, Math.min(1 - newHeight, cropCenterY - newHeight / 2))

	// Create new crop object
	const newCrop = {
		topLeft: { x: topLeftX, y: topLeftY },
		bottomRight: { x: topLeftX + newWidth, y: topLeftY + newHeight },
		isCircle: oldCrop.isCircle,
	}

	// Apply zoom factor to display dimensions
	// As crop window gets smaller, display size gets larger by the same factor
	const scaleFactor = Math.min(3, oldWidth / newWidth) // Maximum 3x scaling

	// Calculate the base cropped size
	const baseCroppedW = newWidth * w
	const baseCroppedH = newHeight * h

	// Apply zoom scaling to display size
	const croppedW = baseCroppedW * scaleFactor
	const croppedH = baseCroppedH * scaleFactor

	// Calculate the center of the image in absolute coordinates
	const imageCenterX = imageShape.x + imageShape.props.w / 2
	const imageCenterY = imageShape.y + imageShape.props.h / 2

	return {
		crop: newCrop,
		w: croppedW,
		h: croppedH,
		x: imageCenterX - croppedW / 2,
		y: imageCenterY - croppedH / 2,
	}
}

/**
 * Calculate new crop dimensions and position when changing aspect ratio
 */
export function getCroppedImageDataForAspectRatio(
	aspectRatioOption: ASPECT_RATIO_OPTION,
	imageShape: TLImageShape
): CropChange | null {
	const { w, h } = getUncroppedSize(imageShape.props, imageShape.props.crop ?? getDefaultCrop())

	// Store the current center of the image
	const currentCenterX = imageShape.x + imageShape.props.w / 2
	const currentCenterY = imageShape.y + imageShape.props.h / 2

	// Get current crop dimensions or default to full image
	const currentCrop = imageShape.props.crop || getDefaultCrop()
	const currentCropWidth = currentCrop.bottomRight.x - currentCrop.topLeft.x
	const currentCropHeight = currentCrop.bottomRight.y - currentCrop.topLeft.y
	const currentCropCenterX = currentCrop.topLeft.x + currentCropWidth / 2
	const currentCropCenterY = currentCrop.topLeft.y + currentCropHeight / 2

	// If original aspect ratio is requested, use default crop
	if (aspectRatioOption === 'original') {
		return {
			crop: getDefaultCrop(),
			w,
			h,
			x: currentCenterX - w / 2,
			y: currentCenterY - h / 2,
		}
	}

	const targetRatio = ASPECT_RATIO_TO_VALUE[aspectRatioOption] || 1

	// Always maintain current width and calculate height
	let newCropWidth = currentCropWidth
	let newCropHeight

	// Square and circle need special handling for 1:1 ratio
	if (targetRatio === 1) {
		// For circle and square, force 1:1 aspect ratio (square)
		const sideLength = Math.max(currentCropWidth, currentCropHeight)
		newCropWidth = sideLength
		newCropHeight = sideLength
	} else {
		// For other aspect ratios, maintain width and calculate height
		newCropHeight = newCropWidth / targetRatio

		// If the new height would exceed image bounds, recalculate
		if (newCropHeight > 1) {
			newCropHeight = 1
			newCropWidth = newCropHeight * targetRatio
		}
	}

	// Ensure neither dimension exceeds 1
	if (newCropWidth > 1) newCropWidth = 1
	if (newCropHeight > 1) newCropHeight = 1

	// Calculate new crop boundaries centered within current crop
	const newTopLeftX = Math.max(0, Math.min(1 - newCropWidth, currentCropCenterX - newCropWidth / 2))
	const newTopLeftY = Math.max(
		0,
		Math.min(1 - newCropHeight, currentCropCenterY - newCropHeight / 2)
	)

	const newCrop = {
		topLeft: { x: newTopLeftX, y: newTopLeftY },
		bottomRight: {
			x: newTopLeftX + newCropWidth,
			y: newTopLeftY + newCropHeight,
		},
		isCircle: aspectRatioOption === 'circle',
	}

	// Calculate the new dimensions and position
	let newWidth = newCropWidth * w
	let newHeight = newCropHeight * h

	// For circle/square, ensure final dimensions are perfectly square
	if (targetRatio === 1) {
		const finalSide = Math.max(newWidth, newHeight)
		newWidth = finalSide
		newHeight = finalSide
	}

	return {
		crop: newCrop,
		w: newWidth,
		h: newHeight,
		x: currentCenterX - newWidth / 2,
		y: currentCenterY - newHeight / 2,
	}
}
