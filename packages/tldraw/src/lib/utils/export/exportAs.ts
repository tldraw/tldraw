import { Editor, TLFrameShape, TLShapeId, TLSvgOptions } from '@tldraw/editor'
import { getSvgAsDataUrl, getSvgAsImage } from './export'

/** @public */
export type TLExportType = 'svg' | 'png' | 'jpeg' | 'webp' | 'json'

/**
 * Export the given shapes as files.
 *
 * @param editor - The editor instance.
 * @param ids - The ids of the shapes to export.
 * @param format - The format to export as.
 * @param opts - Options for the export.
 *
 * @public
 */
export function exportAs(
	editor: Editor,
	ids: TLShapeId[],
	format: TLExportType = 'png',
	opts = {} as Partial<TLSvgOptions>
) {
	return editor
		.getSvg(ids?.length ? ids : [...editor.getCurrentPageShapeIds()], opts)
		.then((svg) => {
			if (!svg) {
				throw new Error('Could not construct SVG.')
			}

			let name = 'shapes' + getTimestamp()

			if (ids.length === 1) {
				const first = editor.getShape(ids[0])!
				if (editor.isShapeOfType<TLFrameShape>(first, 'frame')) {
					name = first.props.name ?? 'frame'
				} else {
					name = first.id.replace(/:/, '_')
				}
			}

			switch (format) {
				case 'svg': {
					getSvgAsDataUrl(svg).then((dataURL) => downloadDataURLAsFile(dataURL, `${name}.svg`))
					return
				}
				case 'webp':
				case 'png': {
					getSvgAsImage(svg, editor.environment.isSafari, {
						type: format,
						quality: 1,
						scale: 2,
					}).then((image) => {
						if (!image) throw Error()
						const dataURL = URL.createObjectURL(image)
						downloadDataURLAsFile(dataURL, `${name}.${format}`)
						URL.revokeObjectURL(dataURL)
					})
					return
				}

				case 'json': {
					const data = editor.getContentFromCurrentPage(ids)
					const blob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' })
					const dataURL = URL.createObjectURL(blob)
					downloadDataURLAsFile(dataURL, `${name || 'shapes'}.json`)
					URL.revokeObjectURL(dataURL)
					return
				}

				default:
					throw new Error(`Export type ${format} not supported.`)
			}
		})
}

function getTimestamp() {
	const now = new Date()

	const year = String(now.getFullYear()).slice(2)
	const month = String(now.getMonth() + 1).padStart(2, '0')
	const day = String(now.getDate()).padStart(2, '0')
	const hours = String(now.getHours()).padStart(2, '0')
	const minutes = String(now.getMinutes()).padStart(2, '0')
	const seconds = String(now.getSeconds()).padStart(2, '0')

	return ` at ${year}-${month}-${day} ${hours}.${minutes}.${seconds}`
}

function downloadDataURLAsFile(dataUrl: string, filename: string) {
	const link = document.createElement('a')
	link.href = dataUrl
	link.download = filename
	link.click()
}
