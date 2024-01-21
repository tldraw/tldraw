import canvasSize from 'canvas-size'

export type CanvasMaxSize = {
	maxWidth: number
	maxHeight: number
	maxArea: number
}

let maxSizePromise: Promise<CanvasMaxSize> | null = null

export function getBrowserCanvasMaxSize() {
	if (!maxSizePromise) {
		maxSizePromise = calculateBrowserCanvasMaxSize()
	}

	return maxSizePromise
}

async function calculateBrowserCanvasMaxSize(): Promise<CanvasMaxSize> {
	const maxWidth = await canvasSize.maxWidth({ usePromise: true })
	const maxHeight = await canvasSize.maxHeight({ usePromise: true })
	const maxArea = await canvasSize.maxArea({ usePromise: true })
	return {
		maxWidth: maxWidth.width,
		maxHeight: maxHeight.height,
		maxArea: maxArea.width * maxArea.height,
	}
}

// https://github.com/jhildenbiddle/canvas-size?tab=readme-ov-file#test-results
export const MAX_SAFE_CANVAS_DIMENSION = 8192

export async function clampToBrowserMaxCanvasSize(width: number, height: number) {
	if (width <= MAX_SAFE_CANVAS_DIMENSION && height <= MAX_SAFE_CANVAS_DIMENSION) {
		return [width, height]
	}

	const { maxWidth, maxHeight, maxArea } = await getBrowserCanvasMaxSize()
	const aspectRatio = width / height

	if (width > maxWidth) {
		width = maxWidth
		height = width / aspectRatio
	}

	if (height > maxHeight) {
		height = maxHeight
		width = height * aspectRatio
	}

	if (width * height > maxArea) {
		const ratio = Math.sqrt(maxArea / (width * height))
		width *= ratio
		height *= ratio
	}

	return [width, height]
}
