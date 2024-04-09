import { Editor, TLFrameShape, TLShapeId, TLSvgOptions } from '@tldraw/editor'
import { exportToBlob } from './export'

/** @public */
export type TLExportType = 'svg' | 'png' | 'jpeg' | 'webp' | 'json'

/**
 * Export the given shapes as files.
 *
 * @param editor - The editor instance.
 * @param ids - The ids of the shapes to export.
 * @param format - The format to export as.
 * @param name - Name of the exported file. If undefined a predefined name, based on the selection, will be used.
 * @param opts - Options for the export.
 *
 * @public
 */
export async function exportAs(
	editor: Editor,
	ids: TLShapeId[],
	format: TLExportType = 'png',
	name: string | undefined,
	opts = {} as Partial<TLSvgOptions>
) {
	// If we don't get name then use a predefined one
	if (!name) {
		name = `shapes at ${getTimestamp()}`
		if (ids.length === 1) {
			const first = editor.getShape(ids[0])!
			if (editor.isShapeOfType<TLFrameShape>(first, 'frame')) {
				name = first.props.name ?? 'frame'
			} else {
				name = `${first.id.replace(/:/, '_')} at ${getTimestamp()}`
			}
		}
	}
	name += `.${format}`

	const blob = await exportToBlob({ editor, ids, format, opts })
	const file = new File([blob], name, { type: blob.type })
	downloadFile(file)
}

function getTimestamp() {
	const now = new Date()

	const year = String(now.getFullYear()).slice(2)
	const month = String(now.getMonth() + 1).padStart(2, '0')
	const day = String(now.getDate()).padStart(2, '0')
	const hours = String(now.getHours()).padStart(2, '0')
	const minutes = String(now.getMinutes()).padStart(2, '0')
	const seconds = String(now.getSeconds()).padStart(2, '0')

	return `${year}-${month}-${day} ${hours}.${minutes}.${seconds}`
}

function downloadFile(file: File) {
	const link = document.createElement('a')
	const url = URL.createObjectURL(file)
	link.href = url
	link.download = file.name
	link.click()
	URL.revokeObjectURL(url)
}
