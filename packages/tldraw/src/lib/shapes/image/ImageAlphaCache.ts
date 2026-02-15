import { Image } from '@tldraw/editor'

/** Alpha channel data for an image, downsampled for efficient hit testing. */
export interface AlphaData {
	width: number
	height: number
	/** Row-major alpha values (0–255) */
	alphas: Uint8Array
}

const MAX_SIZE = 256

const alphaCache = new Map<string, AlphaData>()
const pending = new Set<string>()

/** Start loading alpha data for a given image URL. No-op if already loaded or loading. */
export function preloadAlphaData(src: string): void {
	if (alphaCache.has(src) || pending.has(src)) return
	pending.add(src)

	const img = Image()
	img.crossOrigin = 'anonymous'
	img.onload = () => {
		pending.delete(src)
		const { width: origW, height: origH } = img
		if (origW === 0 || origH === 0) return

		const scale = Math.min(1, MAX_SIZE / Math.max(origW, origH))
		const w = Math.max(1, Math.round(origW * scale))
		const h = Math.max(1, Math.round(origH * scale))

		const canvas = document.createElement('canvas')
		canvas.width = w
		canvas.height = h
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		ctx.drawImage(img, 0, 0, w, h)
		const imageData = ctx.getImageData(0, 0, w, h)
		const alphas = new Uint8Array(w * h)
		for (let i = 0; i < alphas.length; i++) {
			alphas[i] = imageData.data[i * 4 + 3]
		}
		alphaCache.set(src, { width: w, height: h, alphas })
	}
	img.onerror = () => {
		pending.delete(src)
	}
	img.src = src
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
