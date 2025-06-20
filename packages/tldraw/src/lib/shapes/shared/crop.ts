import {
	ShapeWithCrop,
	TLCropInfo,
	TLImageShape,
	TLShapeCrop,
	TLShapeId,
	Vec,
	clamp,
	structuredClone,
} from '@tldraw/editor'

/** @internal */
export const MIN_CROP_SIZE = 8

/** @public */
export interface CropBoxOptions {
	minWidth?: number
	minHeight?: number
	aspectRatioLocked?: boolean
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

// Utility function to create crop with specified dimensions centered on given point
function createCropAroundCenter(
	centerX: number,
	centerY: number,
	width: number,
	height: number,
	isCircle?: boolean
) {
	const topLeftX = Math.max(0, Math.min(1 - width, centerX - width / 2))
	const topLeftY = Math.max(0, Math.min(1 - height, centerY - height / 2))

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
	const { handle, change, crop, aspectRatioLocked: infoAspectRatioLocked } = info
	const { w, h } = info.uncroppedSize
	const {
		minWidth = MIN_CROP_SIZE,
		minHeight = MIN_CROP_SIZE,
		aspectRatioLocked: optsAspectRatioLocked,
	} = opts

	const aspectRatioLocked = infoAspectRatioLocked ?? optsAspectRatioLocked ?? false
	if (w < minWidth || h < minHeight || (change.x === 0 && change.y === 0)) {
		return
	}

	const newCrop = structuredClone(crop)
	const topLeftLimit = 0,
		bottomRightLimit = 1

	if (aspectRatioLocked) {
		const prevCropW = crop.bottomRight.x - crop.topLeft.x
		const prevCropH = crop.bottomRight.y - crop.topLeft.y
		const targetRatio = prevCropW / prevCropH

		if (handle.includes('_')) {
			// --- Aspect-Locked Corner Handles ---
			const xSign = handle.includes('left') ? -1 : 1
			const ySign = handle.includes('top') ? -1 : 1

			const fixedCorner = {
				x: xSign === 1 ? crop.topLeft.x : crop.bottomRight.x,
				y: ySign === 1 ? crop.topLeft.y : crop.bottomRight.y,
			}

			const movingCorner = {
				x: (xSign === -1 ? crop.topLeft.x : crop.bottomRight.x) + change.x / w,
				y: (ySign === -1 ? crop.topLeft.y : crop.bottomRight.y) + change.y / h,
			}

			let newW = Math.abs(movingCorner.x - fixedCorner.x)
			let newH = Math.abs(movingCorner.y - fixedCorner.y)

			// Enforce aspect ratio
			if (newW / newH > targetRatio) newW = newH * targetRatio
			else newH = newW / targetRatio

			// Apply new dimensions from the fixed corner
			newCrop.topLeft.x = xSign === 1 ? fixedCorner.x : fixedCorner.x - newW
			newCrop.topLeft.y = ySign === 1 ? fixedCorner.y : fixedCorner.y - newH
			newCrop.bottomRight.x = xSign === 1 ? fixedCorner.x + newW : fixedCorner.x
			newCrop.bottomRight.y = ySign === 1 ? fixedCorner.y + newH : fixedCorner.y

			// Clamp to boundaries
			newCrop.topLeft.x = clamp(newCrop.topLeft.x, topLeftLimit, bottomRightLimit - minWidth / w)
			newCrop.topLeft.y = clamp(newCrop.topLeft.y, topLeftLimit, bottomRightLimit - minHeight / h)
			newCrop.bottomRight.x = clamp(
				newCrop.bottomRight.x,
				topLeftLimit + minWidth / w,
				bottomRightLimit
			)
			newCrop.bottomRight.y = clamp(
				newCrop.bottomRight.y,
				topLeftLimit + minHeight / h,
				bottomRightLimit
			)
		} else {
			// --- Aspect-Locked Edge Handles ---
			const prevCenterX = crop.topLeft.x + prevCropW / 2
			const prevCenterY = crop.topLeft.y + prevCropH / 2

			const isVertical = handle.includes('top') || handle.includes('bottom')
			const sign = handle.includes('top') || handle.includes('left') ? -1 : 1
			const delta = isVertical ? change.y / h : change.x / w

			const requestedPrimary = Math.max(0, (isVertical ? prevCropH : prevCropW) + delta * sign)
			let finalW = isVertical ? requestedPrimary * targetRatio : requestedPrimary
			let finalH = isVertical ? requestedPrimary : requestedPrimary / targetRatio

			if (handle === 'bottom' && requestedPrimary < 0.01) {
				const finalCrop = createCropAroundCenter(0.5, prevCenterY, finalW, finalH)
				newCrop.topLeft = finalCrop.topLeft
				newCrop.bottomRight = finalCrop.bottomRight
			} else {
				// Clamp to fit within boundaries from the center
				const maxW = 2 * Math.min(prevCenterX, 1 - prevCenterX)
				const maxH = 2 * Math.min(prevCenterY, 1 - prevCenterY)
				if (finalW > maxW) {
					finalW = maxW
					finalH = finalW / targetRatio
				}
				if (finalH > maxH) {
					finalH = maxH
					finalW = finalH * targetRatio
				}

				// Enforce minimum size
				if (finalW < minWidth / w) {
					finalW = minWidth / w
					finalH = finalW / targetRatio
				}
				if (finalH < minHeight / h) {
					finalH = minHeight / h
					finalW = finalH * targetRatio
				}

				const finalCrop = createCropAroundCenter(prevCenterX, prevCenterY, finalW, finalH)
				newCrop.topLeft = finalCrop.topLeft
				newCrop.bottomRight = finalCrop.bottomRight
			}
		}
	} else {
		// --- Free-Resize (Unified for Corners and Edges) ---
		if (handle.includes('top')) {
			newCrop.topLeft.y = clamp(
				newCrop.topLeft.y + change.y / h,
				topLeftLimit,
				newCrop.bottomRight.y - minHeight / h
			)
		}
		if (handle.includes('bottom')) {
			newCrop.bottomRight.y = clamp(
				newCrop.bottomRight.y + change.y / h,
				newCrop.topLeft.y + minHeight / h,
				bottomRightLimit
			)
		}
		if (handle.includes('left')) {
			newCrop.topLeft.x = clamp(
				newCrop.topLeft.x + change.x / w,
				topLeftLimit,
				newCrop.bottomRight.x - minWidth / w
			)
		}
		if (handle.includes('right')) {
			newCrop.bottomRight.x = clamp(
				newCrop.bottomRight.x + change.x / w,
				newCrop.topLeft.x + minWidth / w,
				bottomRightLimit
			)
		}
	}

	const newPoint = new Vec(
		(newCrop.topLeft.x - crop.topLeft.x) * w,
		(newCrop.topLeft.y - crop.topLeft.y) * h
	)
		.rot(shape.rotation)
		.add(shape)

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

// Base function for calculating crop changes
function calculateCropChange(
	imageShape: TLImageShape,
	newCropWidth: number,
	newCropHeight: number,
	centerOnCurrentCrop: boolean = true,
	isCircle: boolean = false
): CropChange {
	const { w, h } = getUncroppedSize(imageShape.props, imageShape.props.crop ?? getDefaultCrop())
	const currentCrop = imageShape.props.crop || getDefaultCrop()

	// Calculate image and crop centers
	const imageCenterX = imageShape.x + imageShape.props.w / 2
	const imageCenterY = imageShape.y + imageShape.props.h / 2

	let cropCenterX, cropCenterY
	if (centerOnCurrentCrop) {
		const { x, y } = getCropCenter(currentCrop)
		cropCenterX = x
		cropCenterY = y
	} else {
		cropCenterX = 0.5
		cropCenterY = 0.5
	}

	// Create new crop
	const newCrop = createCropAroundCenter(
		cropCenterX,
		cropCenterY,
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
		x: imageCenterX - croppedW / 2,
		y: imageCenterY - croppedH / 2,
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
	const result = calculateCropChange(imageShape, newWidth, newHeight, true, oldCrop.isCircle)

	// Apply zoom factor to display dimensions
	const scaleFactor = Math.min(MAX_ZOOM, oldWidth / newWidth)
	result.w *= scaleFactor
	result.h *= scaleFactor

	// Recenter
	const imageCenterX = imageShape.x + imageShape.props.w / 2
	const imageCenterY = imageShape.y + imageShape.props.h / 2
	result.x = imageCenterX - result.w / 2
	result.y = imageCenterY - result.h / 2

	return result
}

/**
 * Calculate new crop dimensions and position when changing aspect ratio
 */
export function getCroppedImageDataForAspectRatio(
	aspectRatioOption: ASPECT_RATIO_OPTION,
	imageShape: TLImageShape
): CropChange {
	// If original aspect ratio is requested, use default crop
	if (aspectRatioOption === 'original') {
		const { w, h } = getUncroppedSize(imageShape.props, imageShape.props.crop ?? getDefaultCrop())
		const imageCenterX = imageShape.x + imageShape.props.w / 2
		const imageCenterY = imageShape.y + imageShape.props.h / 2

		return {
			crop: getDefaultCrop(),
			w,
			h,
			x: imageCenterX - w / 2,
			y: imageCenterY - h / 2,
		}
	}

	// Get target ratio and uncropped image properties
	const targetRatio = ASPECT_RATIO_TO_VALUE[aspectRatioOption] // Assume valid option
	const isCircle = aspectRatioOption === 'circle'
	// Use default crop to get uncropped size relative to the *original* image bounds
	const { w: uncroppedW, h: uncroppedH } = getUncroppedSize(
		imageShape.props,
		imageShape.props.crop || getDefaultCrop() // Use the ACTUAL current crop to correctly infer uncropped size
	)
	// Calculate the original image aspect ratio
	const imageAspectRatio = uncroppedW / uncroppedH

	// Get the current crop and its relative dimensions
	const currentCrop = imageShape.props.crop || getDefaultCrop()
	const { width: cropW, height: cropH } = getCropDimensions(currentCrop)
	const currentCropCenter = getCropCenter(currentCrop)

	// Calculate the relative width and height of the crop rectangle (0-1 scale)
	// that maximizes the area while fitting the original image and matching the target aspect ratio.
	let newRelativeWidth: number
	let newRelativeHeight: number

	if (imageAspectRatio === 0 || !Number.isFinite(imageAspectRatio) || targetRatio === 0) {
		// Avoid division by zero or NaN issues if image dimensions are invalid or target ratio is 0
		newRelativeWidth = 1
		newRelativeHeight = 1
	} else if (targetRatio / imageAspectRatio > 1) {
		// Target aspect ratio is "wider" relative to the image aspect ratio.
		// Width will be clipped to 1.0, calculate height accordingly.
		newRelativeWidth = 1
		newRelativeHeight = imageAspectRatio / targetRatio
	} else {
		// Target aspect ratio is "narrower" or equal relative to the image aspect ratio.
		// Height will be clipped to 1.0, calculate width accordingly.
		newRelativeHeight = 1
		newRelativeWidth = targetRatio / imageAspectRatio
	}

	// Ensure dimensions are within [0, 1] bounds (should be handled by logic above, but clamps anyway)
	newRelativeWidth = Math.max(0, Math.min(1, newRelativeWidth))
	newRelativeHeight = Math.max(0, Math.min(1, newRelativeHeight))

	// Create the new crop object, centered around the CURRENT crop's center
	const newCrop = createCropAroundCenter(
		currentCropCenter.x,
		currentCropCenter.y,
		newRelativeWidth,
		newRelativeHeight,
		isCircle
	)

	// Get the actual relative dimensions from the new crop (after potential clamping)
	const finalRelativeWidth = newCrop.bottomRight.x - newCrop.topLeft.x
	const finalRelativeHeight = newCrop.bottomRight.y - newCrop.topLeft.y

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
	const currentCenterXPage = imageShape.x + imageShape.props.w / 2
	const currentCenterYPage = imageShape.y + imageShape.props.h / 2
	const newX = currentCenterXPage - newW / 2
	const newY = currentCenterYPage - newH / 2

	return {
		crop: newCrop,
		w: newW,
		h: newH,
		x: newX,
		y: newY,
	}
}
