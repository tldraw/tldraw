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
