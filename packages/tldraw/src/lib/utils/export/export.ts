import {
	Editor,
	FileHelpers,
	Image,
	PngHelpers,
	TLImageExportOptions,
	TLShapeId,
	debugFlags,
	exhaustiveSwitchError,
	sleep,
	tlenv,
} from '@tldraw/editor'
import { clampToBrowserMaxCanvasSize } from '../../shapes/shared/getBrowserCanvasMaxSize'
import { TLExportType } from './exportAs'

/** @public */
export async function getSvgAsImage(
	editor: Editor,
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

	let [clampedWidth, clampedHeight] = await clampToBrowserMaxCanvasSize(
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

async function getSvgString(editor: Editor, ids: TLShapeId[], opts: TLImageExportOptions) {
	const svg = await editor.getSvgString(ids?.length ? ids : [...editor.getCurrentPageShapeIds()], {
		scale: opts.scale ?? 1,
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
	opts: TLImageExportOptions = {}
) {
	switch (format) {
		case 'svg': {
			return (await getSvgString(editor, ids, opts))?.svg
		}
		case 'json': {
			const data = await editor.resolveAssetsInContent(editor.getContentFromCurrentPage(ids))
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
	opts = {},
}: {
	editor: Editor
	ids: TLShapeId[]
	format: TLExportType
	opts?: TLImageExportOptions
}): Promise<Blob> {
	switch (format) {
		case 'svg':
			return new Blob([await exportToString(editor, ids, 'svg', opts)], { type: 'text/plain' })
		case 'json':
			return new Blob([await exportToString(editor, ids, 'json', opts)], { type: 'text/plain' })
		case 'jpeg':
		case 'png':
		case 'webp': {
			const svgResult = await getSvgString(editor, ids, opts)
			if (!svgResult) throw new Error('Could not construct image.')
			const image = await getSvgAsImage(editor, svgResult.svg, {
				type: format,
				quality: opts.quality,
				pixelRatio: opts.pixelRatio,
				width: svgResult.width,
				height: svgResult.height,
			})
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
	format: TLExportType,
	opts: TLImageExportOptions = {}
): { blobPromise: Promise<Blob>; mimeType: string } {
	return {
		blobPromise: exportToBlob({ editor, ids, format, opts }),
		mimeType: mimeTypeByFormat[format],
	}
}
