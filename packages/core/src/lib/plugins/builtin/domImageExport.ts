import { FileHelpers, exhaustiveSwitchError } from '@tldraw/utils'
import type { Editor } from '../../editor/Editor'
import type { TLImageExportOptions } from '../../editor/types/misc-types'
import { getSvgAsImageWithOptions, trimSvgToContent } from '../../exports/getSvgAsImage'
import { definePlugin } from '../plugin'
import { TLImageExporter, imageExportCapability } from './imageExport'
import { svgExportCapability } from './svgExport'

// Each step calls the editor's public method for the step before it, so a subclass that
// overrides `getSvgElement` or `getSvgString` changes the image too.
function createDomImageExporter(editor: Editor): TLImageExporter {
	return {
		async getSvgString(shapes, opts) {
			const result = await editor.getSvgElement(shapes, opts)
			if (!result) return undefined

			const serializer = new XMLSerializer()
			return {
				svg: serializer.serializeToString(result.svg),
				width: result.width,
				height: result.height,
				trimPadding: result.trimPadding,
			}
		},

		async toImage(shapes, opts) {
			const withDefaults = {
				format: 'png',
				scale: 1,
				pixelRatio: opts.format === 'svg' ? undefined : 2,
				...opts,
			} satisfies TLImageExportOptions
			const result = await editor.getSvgString(shapes, withDefaults)
			if (!result) throw new Error('Could not create SVG')

			switch (withDefaults.format) {
				case 'svg': {
					let svg = result.svg
					let w = result.width
					let h = result.height
					if (result.trimPadding > 0) {
						const trimmed = await trimSvgToContent(svg, {
							width: w,
							height: h,
							trimPadding: result.trimPadding,
							scale: withDefaults.scale,
						})
						if (trimmed) {
							svg = trimmed.svg
							w = trimmed.width
							h = trimmed.height
						}
					}
					return {
						blob: new Blob([svg], { type: 'image/svg+xml' }),
						width: w,
						height: h,
					}
				}
				case 'jpeg':
				case 'png':
				case 'webp': {
					const imageResult = await getSvgAsImageWithOptions(result.svg, {
						type: withDefaults.format,
						quality: withDefaults.quality,
						pixelRatio: withDefaults.pixelRatio,
						width: result.width,
						height: result.height,
						trimPadding: result.trimPadding,
						scale: withDefaults.scale,
					})
					if (!imageResult) {
						throw new Error('Could not construct image.')
					}
					return imageResult
				}
				default: {
					exhaustiveSwitchError(withDefaults.format)
				}
			}
		},

		async toImageDataUrl(shapes, opts) {
			const { blob, width, height } = await editor.toImage(shapes, opts)
			return {
				url: await FileHelpers.blobToDataUrl(blob),
				width,
				height,
			}
		},
	}
}

/**
 * Serializes exported SVG with the browser's `XMLSerializer` and rasterizes it with a canvas.
 * This is the browser default for `editor.getSvgString`, `toImage` and `toImageDataUrl`.
 *
 * @public
 */
export const domImageExportPlugin = definePlugin({
	id: 'domImageExport',
	provides: [imageExportCapability],
	requires: [svgExportCapability],
	setup(ctx) {
		ctx.provide(imageExportCapability, createDomImageExporter(ctx.editor))
	},
})
