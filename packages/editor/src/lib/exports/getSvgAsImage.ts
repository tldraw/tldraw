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
	const { type, width, height, quality = 1, pixelRatio = 2 } = options

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

	const blob = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(
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

	if (type === 'png') {
		const view = new DataView(await blob.arrayBuffer())
		return PngHelpers.setPhysChunk(view, effectiveScale, {
			type: 'image/' + type,
		})
	} else {
		return blob
	}
}
