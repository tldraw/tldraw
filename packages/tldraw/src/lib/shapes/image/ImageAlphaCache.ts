import { Image, VecLike } from '@tldraw/editor'

/** Mime types of image formats that support transparency / alpha channel. */
export const TRANSPARENT_IMAGE_MIMETYPES: readonly string[] = [
	'image/png',
	'image/webp',
	'image/gif',
	'image/avif',
]

/** Alpha channel data for an image, downsampled for efficient hit testing. */
export interface AlphaData {
	width: number
	height: number
	/** Row-major alpha values (0–255) */
	alphas: Uint8Array
}

/** Shared config for image geometries that support alpha hit testing. */
export interface ImageAlphaGeometryConfig {
	alphaDataGetter(): AlphaData | null
	crop: { topLeft: { x: number; y: number }; bottomRight: { x: number; y: number } } | null
	flipX: boolean
	flipY: boolean
}

/**
 * Map a point in shape space to normalized [0,1] image coordinates, accounting for crop and flip.
 * @internal
 */
function mapToImageCoords(
	config: ImageAlphaGeometryConfig,
	point: VecLike,
	bounds: { minX: number; minY: number; w: number; h: number }
): { nx: number; ny: number } {
	// Normalize point to [0,1] within the shape bounds, clamped for edge-margin hits
	let nx = Math.max(0, Math.min(1, (point.x - bounds.minX) / bounds.w))
	let ny = Math.max(0, Math.min(1, (point.y - bounds.minY) / bounds.h))

	// Map from cropped shape space to full image space
	if (config.crop) {
		const { topLeft, bottomRight } = config.crop
		nx = topLeft.x + nx * (bottomRight.x - topLeft.x)
		ny = topLeft.y + ny * (bottomRight.y - topLeft.y)
	}

	// Account for flips
	if (config.flipX) nx = 1 - nx
	if (config.flipY) ny = 1 - ny

	return { nx, ny }
}

/** Returns true if the point maps to a transparent pixel. Returns false if alpha data isn't loaded yet. */
export function isImagePointTransparent(
	config: ImageAlphaGeometryConfig,
	point: VecLike,
	bounds: { minX: number; minY: number; w: number; h: number }
): boolean {
	const data = config.alphaDataGetter()
	if (!data) return false
	const { nx, ny } = mapToImageCoords(config, point, bounds)
	return isPointTransparent(data, nx, ny)
}

const MAX_SIZE = 256

const alphaCache = new Map<string, AlphaData>()
const pending = new Set<string>()
let offscreenCanvas: OffscreenCanvas | null = null

function getOffscreenCanvas(w: number, h: number): OffscreenCanvas {
	if (!offscreenCanvas) {
		offscreenCanvas = new OffscreenCanvas(w, h)
	} else {
		offscreenCanvas.width = w
		offscreenCanvas.height = h
	}
	return offscreenCanvas
}

function extractAlphas(ctx: OffscreenCanvasRenderingContext2D, w: number, h: number): Uint8Array {
	const imageData = ctx.getImageData(0, 0, w, h)
	const pixels = new Uint32Array(imageData.data.buffer)
	const alphas = new Uint8Array(w * h)
	for (let i = 0; i < alphas.length; i++) {
		alphas[i] = pixels[i] >>> 24
	}
	return alphas
}

/**
 * Start loading alpha data for a given image URL. No-op if already loaded or loading.
 *
 * @param url - The URL to fetch the image from (may be a resolved/optimized CDN URL).
 * @param cacheKey - The key to store/lookup the alpha data under. Defaults to `url`.
 *   Pass `asset.props.src` here so that `getAlphaData(asset.props.src)` in getGeometry
 *   finds data that was preloaded from a resolved URL.
 */
export function preloadAlphaData(url: string, cacheKey?: string): void {
	const key = cacheKey ?? url
	if (alphaCache.has(key) || pending.has(key)) return
	pending.add(key)

	const img = Image()
	img.crossOrigin = 'anonymous'
	img.onload = async () => {
		pending.delete(key)
		const { width: origW, height: origH } = img
		if (origW === 0 || origH === 0) return

		const scale = Math.min(1, MAX_SIZE / Math.max(origW, origH))
		const w = Math.max(1, Math.round(origW * scale))
		const h = Math.max(1, Math.round(origH * scale))

		let bitmap: ImageBitmap | null = null
		try {
			// Resize off the main thread via createImageBitmap
			bitmap = await createImageBitmap(img, {
				resizeWidth: w,
				resizeHeight: h,
				resizeQuality: 'low',
			})
		} catch {
			// Fallback handled below
		}

		// Canvas operations are synchronous from here — no interleaving from
		// concurrent preloads that could resize the shared OffscreenCanvas.
		const canvas = getOffscreenCanvas(w, h)
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		if (bitmap) {
			ctx.drawImage(bitmap, 0, 0)
			bitmap.close()
		} else {
			ctx.drawImage(img, 0, 0, w, h)
		}

		alphaCache.set(key, { width: w, height: h, alphas: extractAlphas(ctx, w, h) })
	}
	img.onerror = () => {
		pending.delete(key)
	}
	img.src = url
}

/** Get cached alpha data for a URL, or null if not yet loaded. */
export function getAlphaData(src: string): AlphaData | null {
	return alphaCache.get(src) ?? null
}

/**
 * Check whether a point in normalized [0,1] coordinates falls on a transparent pixel.
 * Returns true if the pixel's alpha is below the threshold.
 */
export function isPointTransparent(
	data: AlphaData,
	nx: number,
	ny: number,
	threshold = 10
): boolean {
	const ix = Math.min(Math.floor(nx * data.width), data.width - 1)
	const iy = Math.min(Math.floor(ny * data.height), data.height - 1)
	return data.alphas[iy * data.width + ix] < threshold
}
