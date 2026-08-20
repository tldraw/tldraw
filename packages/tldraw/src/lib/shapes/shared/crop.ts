import {
	Box,
	ShapeWithCrop,
	TLCropInfo,
	TLImageShape,
	TLShapeCrop,
	TLShapeId,
	Vec,
	clamp,
	isEqual,
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
	const { width, height } = getCropDimensions(crop)
	return { w: shapeSize.w / width, h: shapeSize.h / height }
}

// Utility function to get crop dimensions
function getCropDimensions(crop: TLShapeCrop) {
	return {
		width: crop.bottomRight.x - crop.topLeft.x,
		height: crop.bottomRight.y - crop.topLeft.y,
	}
}

// Utility function to get crop center
function getCropCenter(crop: TLShapeCrop) {
	const { width, height } = getCropDimensions(crop)
	return {
		x: crop.topLeft.x + width / 2,
		y: crop.topLeft.y + height / 2,
	}
}

function getShapeCenter(shape: TLImageShape) {
	return { x: shape.x + shape.props.w / 2, y: shape.y + shape.props.h / 2 }
}

// Utility function to create crop with specified dimensions centered on given point
function createCropAroundCenter(
	centerX: number,
	centerY: number,
	width: number,
	height: number,
	isCircle?: boolean
) {
	const topLeftX = clamp(centerX - width / 2, 0, 1 - width)
	const topLeftY = clamp(centerY - height / 2, 0, 1 - height)

	return {
		topLeft: { x: topLeftX, y: topLeftY },
		bottomRight: { x: topLeftX + width, y: topLeftY + height },
		isCircle,
	}
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
	const { handle, change, crop, aspectRatioLocked, isResizingFromCenter } = info
	const { w, h } = info.uncroppedSize
	const { minWidth = MIN_CROP_SIZE, minHeight = MIN_CROP_SIZE } = opts

	if (w < minWidth || h < minHeight || (change.x === 0 && change.y === 0)) {
		return
	}

	// Lets get a box here in pixel space. For simplicity, we'll do all the math in
	// pixel space, then convert to normalized space at the end.
	const prevCropBox = new Box(
		crop.topLeft.x * w,
		crop.topLeft.y * h,
		(crop.bottomRight.x - crop.topLeft.x) * w,
		(crop.bottomRight.y - crop.topLeft.y) * h
	)

	const targetRatio = prevCropBox.aspectRatio
	const tempBox = prevCropBox.clone()

	// Which axes does the dragged handle move?
	const movesLeft = handle === 'top_left' || handle === 'bottom_left' || handle === 'left'
	const movesRight = handle === 'top_right' || handle === 'bottom_right' || handle === 'right'
	const movesTop = handle === 'top_left' || handle === 'top_right' || handle === 'top'
	const movesBottom = handle === 'bottom_left' || handle === 'bottom_right' || handle === 'bottom'

	if (isResizingFromCenter) {
		// Resizing from the center (alt/option): the crop center stays fixed and the
		// opposite edge mirrors the dragged edge, so the crop grows/shrinks symmetrically.
		const cx = prevCropBox.midX
		const cy = prevCropBox.midY

		// Desired half-extents from the dragged edge. Undragged axes keep their size.
		let halfW = prevCropBox.w / 2
		let halfH = prevCropBox.h / 2
		if (movesLeft) halfW = cx - (prevCropBox.x + change.x)
		else if (movesRight) halfW = prevCropBox.maxX + change.x - cx
		if (movesTop) halfH = cy - (prevCropBox.y + change.y)
		else if (movesBottom) halfH = prevCropBox.maxY + change.y - cy

		if (aspectRatioLocked) {
			// Keep the aspect ratio while staying centered. Pick the driving dimension,
			// derive the other from the ratio, then clamp both at once so the ratio holds.
			const isCorner = (movesLeft || movesRight) && (movesTop || movesBottom)
			let drivingHalfW: number
			if (isCorner) {
				drivingHalfW = halfW / halfH > targetRatio ? halfW : halfH * targetRatio
			} else if (movesLeft || movesRight) {
				drivingHalfW = halfW
			} else {
				drivingHalfW = halfH * targetRatio
			}

			const minHalfW = Math.max(minWidth / 2, (minHeight / 2) * targetRatio)
			const maxHalfW = Math.min(cx, w - cx, cy * targetRatio, (h - cy) * targetRatio)
			if (maxHalfW < minHalfW) return

			halfW = clamp(drivingHalfW, minHalfW, maxHalfW)
			halfH = halfW / targetRatio
		} else {
			// Clamp each dragged axis independently against the image bounds and min size.
			if (movesLeft || movesRight) {
				const maxHalfW = Math.min(cx, w - cx)
				if (maxHalfW < minWidth / 2) return
				halfW = clamp(halfW, minWidth / 2, maxHalfW)
			}
			if (movesTop || movesBottom) {
				const maxHalfH = Math.min(cy, h - cy)
				if (maxHalfH < minHeight / 2) return
				halfH = clamp(halfH, minHeight / 2, maxHalfH)
			}
		}

		tempBox.x = cx - halfW
		tempBox.y = cy - halfH
		tempBox.w = halfW * 2
		tempBox.h = halfH * 2
	} else {
		// Basic resizing logic based on the handles

		if (movesLeft) {
			tempBox.x = clamp(tempBox.x + change.x, 0, prevCropBox.maxX - minWidth)
			tempBox.w = prevCropBox.maxX - tempBox.x
		} else if (movesRight) {
			const tempRight = clamp(tempBox.maxX + change.x, prevCropBox.x + minWidth, w)
			tempBox.w = tempRight - tempBox.x
		}

		if (movesTop) {
			tempBox.y = clamp(tempBox.y + change.y, 0, prevCropBox.maxY - minHeight)
			tempBox.h = prevCropBox.maxY - tempBox.y
		} else if (movesBottom) {
			const tempBottom = clamp(tempBox.maxY + change.y, prevCropBox.y + minHeight, h)
			tempBox.h = tempBottom - tempBox.y
		}
	}

	// Aspect ratio locked resizing logic

	if (aspectRatioLocked && !isResizingFromCenter) {
		const isXLimiting = tempBox.aspectRatio > targetRatio

		if (isXLimiting) {
			tempBox.h = tempBox.w / targetRatio
		} else {
			tempBox.w = tempBox.h * targetRatio
		}

		switch (handle) {
			case 'top_left': {
				// preserve the bottom right corner
				tempBox.x = prevCropBox.maxX - tempBox.w
				tempBox.y = prevCropBox.maxY - tempBox.h

				if (tempBox.x <= 0) {
					tempBox.x = 0
					tempBox.w = prevCropBox.maxX - tempBox.x
					tempBox.h = tempBox.w / targetRatio
					tempBox.y = prevCropBox.maxY - tempBox.h
				}

				if (tempBox.y <= 0) {
					tempBox.y = 0
					tempBox.h = prevCropBox.maxY - tempBox.y
					tempBox.w = tempBox.h * targetRatio
					tempBox.x = prevCropBox.maxX - tempBox.w
				}
				break
			}
			case 'top_right': {
				// preserve the bottom left corner
				tempBox.x = prevCropBox.x
				tempBox.y = prevCropBox.maxY - tempBox.h

				if (tempBox.maxX >= w) {
					tempBox.w = w - prevCropBox.x
					tempBox.h = tempBox.w / targetRatio
					tempBox.y = prevCropBox.maxY - tempBox.h
				}

				if (tempBox.y <= 0) {
					tempBox.y = 0
					tempBox.h = prevCropBox.maxY - tempBox.y
					tempBox.w = tempBox.h * targetRatio
				}
				break
			}
			case 'bottom_left': {
				// preserve the top right corner
				tempBox.x = prevCropBox.maxX - tempBox.w
				tempBox.y = prevCropBox.y

				if (tempBox.x <= 0) {
					tempBox.x = 0
					tempBox.w = prevCropBox.maxX - tempBox.x
					tempBox.h = tempBox.w / targetRatio
				}

				if (tempBox.maxY >= h) {
					tempBox.h = h - prevCropBox.y
					tempBox.w = tempBox.h * targetRatio
					tempBox.x = prevCropBox.maxX - tempBox.w
				}
				break
			}
			case 'bottom_right': {
				// preserve the top left corner
				tempBox.x = prevCropBox.x
				tempBox.y = prevCropBox.y

				if (tempBox.maxX >= w) {
					tempBox.w = w - prevCropBox.x
					tempBox.h = tempBox.w / targetRatio
				}

				if (tempBox.maxY >= h) {
					tempBox.h = h - prevCropBox.y
					tempBox.w = tempBox.h * targetRatio
				}
				break
			}
			case 'top': {
				// preserve the bottom edge center
				tempBox.h = prevCropBox.maxY - tempBox.y
				tempBox.w = tempBox.h * targetRatio
				tempBox.x -= (tempBox.w - prevCropBox.w) / 2

				if (tempBox.x <= 0) {
					const leftSide = prevCropBox.midX
					tempBox.w = leftSide * 2
					tempBox.h = tempBox.w / targetRatio
					tempBox.x = 0
				}

				if (tempBox.maxX >= w) {
					const rightSide = w - prevCropBox.midX
					tempBox.w = rightSide * 2
					tempBox.h = tempBox.w / targetRatio
					tempBox.x = w - tempBox.w
				}

				tempBox.y = prevCropBox.maxY - tempBox.h
				break
			}
			case 'right': {
				// preserve the left edge center
				tempBox.w = tempBox.maxX - prevCropBox.x
				tempBox.h = tempBox.w / targetRatio
				tempBox.y -= (tempBox.h - prevCropBox.h) / 2

				if (tempBox.y <= 0) {
					const topSide = prevCropBox.midY
					tempBox.h = topSide * 2
					tempBox.w = tempBox.h * targetRatio
					tempBox.y = 0
				}

				if (tempBox.maxY >= h) {
					const bottomSide = h - prevCropBox.midY
					tempBox.h = bottomSide * 2
					tempBox.w = tempBox.h * targetRatio
					tempBox.y = h - tempBox.h
				}
				break
			}
			case 'bottom': {
				// preserve the top edge center
				tempBox.h = tempBox.maxY - prevCropBox.y
				tempBox.w = tempBox.h * targetRatio
				tempBox.x -= (tempBox.w - prevCropBox.w) / 2

				if (tempBox.x <= 0) {
					const leftSide = prevCropBox.midX
					tempBox.w = leftSide * 2
					tempBox.h = tempBox.w / targetRatio
					tempBox.x = 0
				}

				if (tempBox.maxX >= w) {
					const rightSide = w - prevCropBox.midX
					tempBox.w = rightSide * 2
					tempBox.h = tempBox.w / targetRatio
					tempBox.x = w - tempBox.w
				}
				break
			}
			case 'left': {
				// preserve the right edge center
				tempBox.w = prevCropBox.maxX - tempBox.x
				tempBox.h = tempBox.w / targetRatio
				tempBox.y -= (tempBox.h - prevCropBox.h) / 2

				if (tempBox.y <= 0) {
					const topSide = prevCropBox.midY
					tempBox.h = topSide * 2
					tempBox.w = tempBox.h * targetRatio
					tempBox.y = 0
				}

				if (tempBox.maxY >= h) {
					const bottomSide = h - prevCropBox.midY
					tempBox.h = bottomSide * 2
					tempBox.w = tempBox.h * targetRatio
					tempBox.y = h - tempBox.h
				}

				tempBox.x = prevCropBox.maxX - tempBox.w
				break
			}
		}
	}

	// Convert the box back to normalized space
	const newCrop: TLShapeCrop = {
		topLeft: { x: tempBox.x / w, y: tempBox.y / h },
		bottomRight: { x: tempBox.maxX / w, y: tempBox.maxY / h },
	}
	if (crop.isCircle != null) {
		newCrop.isCircle = crop.isCircle
	}

	// If the crop hasn't changed, we can return early
	if (
		newCrop.topLeft.x === crop.topLeft.x &&
		newCrop.topLeft.y === crop.topLeft.y &&
		newCrop.bottomRight.x === crop.bottomRight.x &&
		newCrop.bottomRight.y === crop.bottomRight.y
	) {
		return
	}

	// Adjust the shape's position to keep the crop's absolute coordinates correct
	const newPoint = new Vec(tempBox.x - crop.topLeft.x * w, tempBox.y - crop.topLeft.y * h)
		.rot(shape.rotation)
		.add(shape)

	return {
		id: shape.id,
		type: shape.type,
		x: newPoint.x,
		y: newPoint.y,
		props: {
			...shape.props,
			w: tempBox.w,
			h: tempBox.h,
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

// Base function for calculating crop changes
function calculateCropChange(
	imageShape: TLImageShape,
	newCropWidth: number,
	newCropHeight: number,
	isCircle: boolean = false
): CropChange {
	const currentCrop = imageShape.props.crop ?? getDefaultCrop()
	const { w, h } = getUncroppedSize(imageShape.props, currentCrop)
	// Calculate image and crop centers
	const imageCenter = getShapeCenter(imageShape)
	const cropCenter = getCropCenter(currentCrop)

	// Create new crop
	const newCrop = createCropAroundCenter(
		cropCenter.x,
		cropCenter.y,
		newCropWidth,
		newCropHeight,
		isCircle
	)

	// Calculate new dimensions
	const croppedW = newCropWidth * w
	const croppedH = newCropHeight * h

	return {
		crop: newCrop,
		w: croppedW,
		h: croppedH,
		x: imageCenter.x - croppedW / 2,
		y: imageCenter.y - croppedH / 2,
	}
}

/** @internal */
export const MAX_ZOOM = 3

/**
 * Calculate new crop dimensions and position when zooming
 */
export function getCroppedImageDataWhenZooming(
	zoom: number,
	imageShape: TLImageShape,
	maxZoom?: number
): CropChange {
	const oldCrop = imageShape.props.crop || getDefaultCrop()
	const { width: oldWidth, height: oldHeight } = getCropDimensions(oldCrop)
	const aspectRatio = oldWidth / oldHeight

	// Calculate new crop size with zoom scale
	const derivedMaxZoom = maxZoom ? 1 / (1 - maxZoom) : MAX_ZOOM
	const zoomScale = 1 + zoom * (derivedMaxZoom - 1)
	let newWidth, newHeight

	if (aspectRatio > 1) {
		newWidth = Math.min(1, 1 / zoomScale)
		newHeight = newWidth / aspectRatio
	} else {
		newHeight = Math.min(1, 1 / zoomScale)
		newWidth = newHeight * aspectRatio
	}

	// Calculate result with base function
	const result = calculateCropChange(imageShape, newWidth, newHeight, oldCrop.isCircle)

	// Apply zoom factor to display dimensions
	const scaleFactor = Math.min(MAX_ZOOM, oldWidth / newWidth)
	result.w *= scaleFactor
	result.h *= scaleFactor
	// Recenter
	const imageCenter = getShapeCenter(imageShape)
	result.x = imageCenter.x - result.w / 2
	result.y = imageCenter.y - result.h / 2

	return result
}

/**
 * Calculate new crop dimensions and position when replacing an image
 */
export function getCroppedImageDataForReplacedImage(
	imageShape: TLImageShape,
	newImageWidth: number,
	newImageHeight: number
): CropChange {
	const defaultCrop = getDefaultCrop()
	const currentCrop = imageShape.props.crop || defaultCrop
	const origDisplayW = imageShape.props.w
	const origDisplayH = imageShape.props.h
	const newImageAspectRatio = newImageWidth / newImageHeight

	let crop = defaultCrop
	const newDisplayW = origDisplayW
	let newDisplayH = origDisplayH

	if (isEqual(imageShape.props.crop, defaultCrop)) {
		newDisplayH = (origDisplayW * newImageHeight) / newImageWidth
	} else {
		const { w: uncroppedW, h: uncroppedH } = getUncroppedSize(imageShape.props, currentCrop)
		const { width: cropW, height: cropH } = getCropDimensions(currentCrop)
		const targetRatio = cropW / cropH
		const oldImageAspectRatio = uncroppedW / uncroppedH
		const currentCropCenter = getCropCenter(currentCrop)

		// Adjust the new crop dimensions to match the current crop zoom
		let newRelativeWidth = cropW
		const ratioConversion = newImageAspectRatio / oldImageAspectRatio / targetRatio
		let newRelativeHeight = newRelativeWidth * ratioConversion

		// Check that our new crop dimensions are within the MAX_ZOOM bounds
		const maxRatioConversion = MAX_ZOOM / (MAX_ZOOM - 1)
		if (ratioConversion > maxRatioConversion) {
			const minDimension = 1 / MAX_ZOOM
			const scale =
				1 / newRelativeHeight < 1 / newRelativeWidth
					? newRelativeHeight / minDimension
					: newRelativeWidth / minDimension
			newRelativeHeight = newRelativeHeight / scale
			newRelativeWidth = newRelativeWidth / scale
		}

		// Create the new crop object, centered around the CURRENT crop's center
		crop = createCropAroundCenter(
			currentCropCenter.x,
			currentCropCenter.y,
			clamp(newRelativeWidth, 0, 1),
			clamp(newRelativeHeight, 0, 1),
			currentCrop.isCircle
		)
	}

	// Position so visual center stays put
	const pageCenter = getShapeCenter(imageShape)

	return {
		crop,
		w: newDisplayW,
		h: newDisplayH,
		x: pageCenter.x - newDisplayW / 2,
		y: pageCenter.y - newDisplayH / 2,
	}
}

/**
 * Calculate new crop dimensions and position when changing aspect ratio
 */
export function getCroppedImageDataForAspectRatio(
	aspectRatioOption: ASPECT_RATIO_OPTION,
	imageShape: TLImageShape
): CropChange {
	const currentCrop = imageShape.props.crop ?? getDefaultCrop()
	const { w: uncroppedW, h: uncroppedH } = getUncroppedSize(imageShape.props, currentCrop)
	const imageCenter = getShapeCenter(imageShape)

	// If original aspect ratio is requested, use default crop
	if (aspectRatioOption === 'original') {
		return {
			crop: getDefaultCrop(),
			w: uncroppedW,
			h: uncroppedH,
			x: imageCenter.x - uncroppedW / 2,
			y: imageCenter.y - uncroppedH / 2,
		}
	}

	// Get target ratio and uncropped image properties
	const targetRatio = ASPECT_RATIO_TO_VALUE[aspectRatioOption] // Assume valid option
	const isCircle = aspectRatioOption === 'circle'
	// Calculate the original image aspect ratio
	const imageAspectRatio = uncroppedW / uncroppedH

	// Get the current crop and its relative dimensions
	const { width: cropW, height: cropH } = getCropDimensions(currentCrop)
	const currentCropCenter = getCropCenter(currentCrop)

	// Calculate the current crop zoom level
	const currentCropZoom = Math.min(1 / cropW, 1 / cropH)

	// Calculate the relative width and height of the crop rectangle (0-1 scale)
	// Try to preserve the longest dimension of the current crop when changing aspect ratios
	let newRelativeWidth: number
	let newRelativeHeight: number

	if (imageAspectRatio === 0 || !Number.isFinite(imageAspectRatio) || targetRatio === 0) {
		// Avoid division by zero or NaN issues if image dimensions are invalid or target ratio is 0
		newRelativeWidth = 1
		newRelativeHeight = 1
	} else {
		// Get current crop dimensions in absolute units
		const currentAbsoluteWidth = cropW * uncroppedW
		const currentAbsoluteHeight = cropH * uncroppedH
		// Find the longest current dimension to preserve
		const longestCurrentDimension = Math.max(currentAbsoluteWidth, currentAbsoluteHeight)

		// Calculate new dimensions preserving the longest dimension
		let newAbsoluteWidth: number
		let newAbsoluteHeight: number
		if (currentAbsoluteWidth >= currentAbsoluteHeight) {
			// Preserve width, calculate height based on target ratio
			newAbsoluteWidth = longestCurrentDimension
			newAbsoluteHeight = newAbsoluteWidth / targetRatio
		} else {
			// Preserve height, calculate width based on target ratio
			newAbsoluteHeight = longestCurrentDimension
			newAbsoluteWidth = newAbsoluteHeight * targetRatio
		}

		// Convert back to relative coordinates
		newRelativeWidth = newAbsoluteWidth / uncroppedW
		newRelativeHeight = newAbsoluteHeight / uncroppedH

		// Clamp to image bounds and adjust if necessary
		if (newRelativeWidth > 1) {
			// Width exceeds bounds, clamp and recalculate height
			newRelativeWidth = 1
			newRelativeHeight = imageAspectRatio / targetRatio
		}
		if (newRelativeHeight > 1) {
			// Height exceeds bounds, clamp and recalculate width
			newRelativeHeight = 1
			newRelativeWidth = targetRatio / imageAspectRatio
		}

		// Final clamp to ensure we stay within bounds
		newRelativeWidth = clamp(newRelativeWidth, 0, 1)
		newRelativeHeight = clamp(newRelativeHeight, 0, 1)
	}

	// Adjust the new crop dimensions to match the current crop zoom
	const newCropZoom = Math.min(1 / newRelativeWidth, 1 / newRelativeHeight)
	newRelativeWidth = clamp(newRelativeWidth * (newCropZoom / currentCropZoom), 0, 1)
	newRelativeHeight = clamp(newRelativeHeight * (newCropZoom / currentCropZoom), 0, 1)

	// Create the new crop object, centered around the CURRENT crop's center
	const newCrop = createCropAroundCenter(
		currentCropCenter.x,
		currentCropCenter.y,
		newRelativeWidth,
		newRelativeHeight,
		isCircle
	)

	// Get the actual relative dimensions from the new crop (after potential clamping)
	const { width: finalRelativeWidth, height: finalRelativeHeight } = getCropDimensions(newCrop)

	// Calculate the base dimensions (as if applying the new crop to the uncropped image at scale 1)
	const baseW = finalRelativeWidth * uncroppedW
	const baseH = finalRelativeHeight * uncroppedH

	// Determine the current effective scale of the shape
	// This preserves the visual size when the crop changes
	let currentScale = 1.0
	if (cropW > 0) {
		currentScale = imageShape.props.w / (cropW * uncroppedW)
	} else if (cropH > 0) {
		// Fallback to height if width relative dimension is zero
		currentScale = imageShape.props.h / (cropH * uncroppedH)
	}

	// Apply the current scale to the base dimensions to get the final dimensions
	const newW = baseW * currentScale
	const newH = baseH * currentScale

	// Calculate the new top-left position (x, y) for the shape
	// to keep the visual center of the cropped area fixed on the page.
	return {
		crop: newCrop,
		w: newW,
		h: newH,
		x: imageCenter.x - newW / 2,
		y: imageCenter.y - newH / 2,
	}
}
