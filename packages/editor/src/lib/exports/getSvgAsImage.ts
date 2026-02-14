import { FileHelpers, Image, PngHelpers, sleep } from '@tldraw/utils'
import { tlenv } from '../globals/environment'
import { clampToBrowserMaxCanvasSize } from '../utils/browserCanvasMaxSize'
import { debugFlags } from '../utils/debug-flags'

/** @public */
export async function getSvgAsImage(
	svgString: string,
	options: {
		type: 'png' | 'jpeg' | 'webp'
		width: number
		height: number
		quality?: number
		pixelRatio?: number
	}
) {
	const result = await getSvgAsImageWithOptions(svgString, options)
	return result?.blob ?? null
}

/** @internal */
export async function getSvgAsImageWithOptions(
	svgString: string,
	options: {
		type: 'png' | 'jpeg' | 'webp'
		width: number
		height: number
		quality?: number
		pixelRatio?: number
		extraPadding?: number
		scale?: number
	}
): Promise<{ blob: Blob; width: number; height: number } | null> {
	const { type, width, height, quality = 1, pixelRatio = 2, extraPadding = 0, scale = 1 } = options

	let [clampedWidth, clampedHeight] = clampToBrowserMaxCanvasSize(
		width * pixelRatio,
		height * pixelRatio
	)
	clampedWidth = Math.floor(clampedWidth)
	clampedHeight = Math.floor(clampedHeight)
	const effectiveScale = clampedWidth / width

	// usually we would use `URL.createObjectURL` here, but chrome has a bug where `blob:` URLs of
	// SVGs that use <foreignObject> mark the canvas as tainted, where data: ones do not.
	// https://issues.chromium.org/issues/41054640
	const svgUrl = await FileHelpers.blobToDataUrl(new Blob([svgString], { type: 'image/svg+xml' }))

	const canvas = await new Promise<HTMLCanvasElement | null>((resolve) => {
		const image = Image()
		image.crossOrigin = 'anonymous'

		image.onload = async () => {
			// safari will fire `onLoad` before the fonts in the SVG are
			// actually loaded. just waiting around a while is brittle, but
			// there doesn't seem to be any better solution for now :( see
			// https://bugs.webkit.org/show_bug.cgi?id=219770
			if (tlenv.isSafari) {
				await sleep(250)
			}

			const canvas = document.createElement('canvas') as HTMLCanvasElement
			const ctx = canvas.getContext('2d')!

			canvas.width = clampedWidth
			canvas.height = clampedHeight

			ctx.imageSmoothingEnabled = true
			ctx.imageSmoothingQuality = 'high'
			ctx.drawImage(image, 0, 0, clampedWidth, clampedHeight)

			URL.revokeObjectURL(svgUrl)

			resolve(canvas)
		}

		image.onerror = () => {
			resolve(null)
		}

		image.src = svgUrl
	})

	if (!canvas) return null

	// If we rendered with extra padding to capture visual overflow, trim it now
	const outputCanvas =
		extraPadding > 0
			? trimExtraPadding(canvas, extraPadding * scale * pixelRatio)
			: { canvas, width: clampedWidth, height: clampedHeight }

	const blob = await new Promise<Blob | null>((resolve) =>
		outputCanvas.canvas.toBlob(
			(blob) => {
				if (!blob || debugFlags.throwToBlob.get()) {
					resolve(null)
				}
				resolve(blob)
			},
			'image/' + type,
			quality
		)
	)

	if (!blob) return null

	let resultBlob: Blob
	if (type === 'png') {
		resultBlob = PngHelpers.setPhysChunk(new DataView(await blob.arrayBuffer()), effectiveScale, {
			type: 'image/' + type,
		})
	} else {
		resultBlob = blob
	}

	return {
		blob: resultBlob,
		width: outputCanvas.width / effectiveScale,
		height: outputCanvas.height / effectiveScale,
	}
}

/**
 * Trims extra padding from a canvas by scanning from each edge inward to find
 * non-transparent (or non-background) pixels. Stops at either content pixels or
 * the declared bounds (the area without extra padding).
 */
function trimExtraPadding(
	canvas: HTMLCanvasElement,
	extraPaddingPx: number
): { canvas: HTMLCanvasElement; width: number; height: number } {
	const w = canvas.width
	const h = canvas.height
	const ctx = canvas.getContext('2d')!

	const extraPx = Math.ceil(extraPaddingPx)

	// Nothing to trim if the extra padding is negligible
	if (extraPx <= 0) return { canvas, width: w, height: h }

	const imageData = ctx.getImageData(0, 0, w, h)
	const data = imageData.data

	// Determine how to detect "empty" pixels.
	// Sample the corner pixel to detect the background color.
	const cornerR = data[0]
	const cornerG = data[1]
	const cornerB = data[2]
	const cornerA = data[3]
	const hasTransparentBackground = cornerA === 0

	function isContentPixel(offset: number): boolean {
		if (hasTransparentBackground) {
			// For transparent background, any non-transparent pixel is content
			return data[offset + 3] > 0
		} else {
			// For opaque background, look for pixels that differ from the background
			const a = data[offset + 3]
			if (a !== cornerA) return true
			const r = data[offset]
			const g = data[offset + 1]
			const b = data[offset + 2]
			return r !== cornerR || g !== cornerG || b !== cornerB
		}
	}

	// The declared bounds area (content area without extra padding)
	const declaredLeft = extraPx
	const declaredTop = extraPx
	const declaredRight = w - extraPx
	const declaredBottom = h - extraPx

	// Scan from top edge inward: find first row with content or declared bounds
	let cropTop = declaredTop
	for (let y = 0; y < declaredTop; y++) {
		let hasContent = false
		for (let x = 0; x < w; x++) {
			if (isContentPixel((y * w + x) * 4)) {
				hasContent = true
				break
			}
		}
		if (hasContent) {
			cropTop = y
			break
		}
	}

	// Scan from bottom edge inward
	let cropBottom = declaredBottom
	for (let y = h - 1; y >= declaredBottom; y--) {
		let hasContent = false
		for (let x = 0; x < w; x++) {
			if (isContentPixel((y * w + x) * 4)) {
				hasContent = true
				break
			}
		}
		if (hasContent) {
			cropBottom = y + 1
			break
		}
	}

	// Scan from left edge inward
	let cropLeft = declaredLeft
	for (let x = 0; x < declaredLeft; x++) {
		let hasContent = false
		for (let y = cropTop; y < cropBottom; y++) {
			if (isContentPixel((y * w + x) * 4)) {
				hasContent = true
				break
			}
		}
		if (hasContent) {
			cropLeft = x
			break
		}
	}

	// Scan from right edge inward
	let cropRight = declaredRight
	for (let x = w - 1; x >= declaredRight; x--) {
		let hasContent = false
		for (let y = cropTop; y < cropBottom; y++) {
			if (isContentPixel((y * w + x) * 4)) {
				hasContent = true
				break
			}
		}
		if (hasContent) {
			cropRight = x + 1
			break
		}
	}

	const cropW = cropRight - cropLeft
	const cropH = cropBottom - cropTop

	// If no trimming needed (content fills or exceeds the entire render area)
	if (cropLeft === 0 && cropTop === 0 && cropW === w && cropH === h) {
		return { canvas, width: w, height: h }
	}

	// Create a new cropped canvas
	const croppedCanvas = document.createElement('canvas')
	croppedCanvas.width = cropW
	croppedCanvas.height = cropH
	const croppedCtx = croppedCanvas.getContext('2d')!
	croppedCtx.drawImage(canvas, cropLeft, cropTop, cropW, cropH, 0, 0, cropW, cropH)

	return { canvas: croppedCanvas, width: cropW, height: cropH }
}
