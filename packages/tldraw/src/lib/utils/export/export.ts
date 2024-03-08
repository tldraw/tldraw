import {
	Editor,
	PngHelpers,
	TLShapeId,
	TLSvgOptions,
	debugFlags,
	exhaustiveSwitchError,
	getSvgAsString,
} from '@tldraw/editor'
import { clampToBrowserMaxCanvasSize } from '../../shapes/shared/getBrowserCanvasMaxSize'

/** @public */
export async function getSvgAsImage(
	svg: SVGElement,
	isSafari: boolean,
	options: {
		type: 'png' | 'jpeg' | 'webp'
		quality: number
		scale: number
	}
) {
	const width = +svg.getAttribute('width')!
	const height = +svg.getAttribute('height')!
	const svgString = await getSvgAsString(svg)

	return getSvgStringAsImage(svgString, isSafari, {
		...options,
		width,
		height,
	})
}

/** @public */
export async function getSvgStringAsImage(
	svgString: string,
	isSafari: boolean,
	options: {
		type: 'png' | 'jpeg' | 'webp'
		quality: number
		scale: number
		width: number
		height: number
	}
) {
	const { type, quality, scale, width, height } = options

	let [clampedWidth, clampedHeight] = await clampToBrowserMaxCanvasSize(
		width * scale,
		height * scale
	)
	clampedWidth = Math.floor(clampedWidth)
	clampedHeight = Math.floor(clampedHeight)
	const effectiveScale = clampedWidth / width

	const svgUrl = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml' }))

	const canvas = await new Promise<HTMLCanvasElement | null>((resolve) => {
		const image = new Image()
		image.crossOrigin = 'anonymous'

		image.onload = async () => {
			// safari will fire `onLoad` before the fonts in the SVG are
			// actually loaded. just waiting around a while is brittle, but
			// there doesn't seem to be any better solution for now :( see
			// https://bugs.webkit.org/show_bug.cgi?id=219770
			if (isSafari) {
				await new Promise((resolve) => setTimeout(resolve, 250))
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

	const view = new DataView(await blob.arrayBuffer())
	return PngHelpers.setPhysChunk(view, effectiveScale, {
		type: 'image/' + type,
	})
}

async function getSvg(editor: Editor, ids: TLShapeId[], opts: Partial<TLSvgOptions>) {
	const svg = await editor.getSvg(ids?.length ? ids : [...editor.getCurrentPageShapeIds()], {
		scale: 1,
		background: editor.getInstanceState().exportBackground,
		...opts,
	})
	if (!svg) {
		throw new Error('Could not construct SVG.')
	}
	return svg
}

export async function exportToString(
	editor: Editor,
	ids: TLShapeId[],
	format: 'svg' | 'json',
	opts = {} as Partial<TLSvgOptions>
) {
	switch (format) {
		case 'svg': {
			return getSvgAsString(await getSvg(editor, ids, opts))
		}
		case 'json': {
			const data = editor.getContentFromCurrentPage(ids)
			return JSON.stringify(data)
		}
		default: {
			exhaustiveSwitchError(format)
		}
	}
}

/**
 * Export the given shapes as a blob.
 * @param editor - The editor instance.
 * @param ids - The ids of the shapes to export.
 * @param format - The format to export as.
 * @param opts - Rendering options.
 * @returns A promise that resolves to a blob.
 * @public
 */
export async function exportToBlob({
	editor,
	ids,
	format,
	opts = {} as Partial<TLSvgOptions>,
}: {
	editor: Editor
	ids: TLShapeId[]
	format: 'svg' | 'png' | 'jpeg' | 'webp' | 'json'
	opts?: Partial<TLSvgOptions>
}): Promise<Blob> {
	switch (format) {
		case 'svg':
			return new Blob([await exportToString(editor, ids, 'svg', opts)], { type: 'text/plain' })
		case 'json':
			return new Blob([await exportToString(editor, ids, 'json', opts)], { type: 'text/plain' })
		case 'jpeg':
		case 'png':
		case 'webp': {
			const getSvgTimes = []
			const svgToImageTimes = []
			const totalTimes = []
			for (let i = 0; i < 400; i++) {
				const a = performance.now()
				const svg = await getSvg(editor, ids, opts)
				const b = performance.now()
				await getSvgAsImage(svg, editor.environment.isSafari, {
					type: format,
					quality: 1,
					scale: 2,
				})
				const c = performance.now()
				getSvgTimes.push(b - a)
				svgToImageTimes.push(c - b)
				totalTimes.push(c - a)
			}

			const avgGetSvgTime = (getSvgTimes.reduce((a, b) => a + b, 0) / getSvgTimes.length).toFixed(2)
			const avgSvgToImageTime = (
				svgToImageTimes.reduce((a, b) => a + b, 0) / svgToImageTimes.length
			).toFixed(2)
			const avgTotalTime = (totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length).toFixed(2)
			console.log({ avgGetSvgTime, avgSvgToImageTime, avgTotalTime })

			const image = await getSvgAsImage(
				await getSvg(editor, ids, opts),
				editor.environment.isSafari,
				{
					type: format,
					quality: 1,
					scale: 2,
				}
			)
			if (!image) {
				throw new Error('Could not construct image.')
			}
			return image
		}
		default: {
			exhaustiveSwitchError(format)
		}
	}
}

const mimeTypeByFormat = {
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	json: 'text/plain',
	svg: 'text/plain',
}

export function exportToBlobPromise(
	editor: Editor,
	ids: TLShapeId[],
	format: 'svg' | 'png' | 'jpeg' | 'webp' | 'json',
	opts = {} as Partial<TLSvgOptions>
): { blobPromise: Promise<Blob>; mimeType: string } {
	return {
		blobPromise: exportToBlob({ editor, ids, format, opts }),
		mimeType: mimeTypeByFormat[format],
	}
}
